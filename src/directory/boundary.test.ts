// Enforced import boundary (golden rule 1 / build-plan guardrail 1): `src/core` is the
// deterministic engine and must NEVER import from `src/directory`. The engine's answer is
// computed before any directory code runs. This is a CI check, not a convention — a bad
// import here fails `npm test`. (No ESLint is configured in this repo yet; a grep-style
// test is the equivalent enforcement.)

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Repo-root-relative — vitest runs from the project root.
const coreDir = join(process.cwd(), 'src', 'core');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

// Matches `from '.../directory/...'`, `import('.../directory/...')`, and bare specifiers.
const DIRECTORY_IMPORT = /(?:from|import)\s*\(?\s*['"][^'"]*\bdirectory\b[^'"]*['"]/;

describe('import boundary: core must not import directory', () => {
  const files = walk(coreDir).filter((f) => /\.(ts|tsx)$/.test(f));

  it('finds core source files to scan', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)('%s does not import from src/directory', (file) => {
    const src = readFileSync(file, 'utf8');
    const offending = src
      .split('\n')
      .map((line, n) => ({ line, n: n + 1 }))
      .filter(({ line }) => DIRECTORY_IMPORT.test(line));
    expect(offending, `core file imports directory: ${JSON.stringify(offending)}`).toEqual([]);
  });
});
