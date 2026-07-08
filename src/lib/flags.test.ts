import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { directoryEnabled } from './flags.ts';

// directoryEnabled() reads import.meta.env at call time, so vi.stubEnv lets us exercise the
// prod branches (in dev it's unconditionally on). Note: DIRECTORY_BUNDLE_ENABLED is a
// module-load-time constant and can't be re-evaluated per test — its behaviour is asserted
// by the dist bundle grep in the Phase-2 build check, not here.

function setUrl(search: string) {
  window.history.pushState({}, '', '/' + search);
}

beforeEach(() => {
  sessionStorage.clear();
  setUrl('');
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe('directoryEnabled', () => {
  it('is always on in dev', () => {
    vi.stubEnv('DEV', true);
    expect(directoryEnabled()).toBe(true);
  });

  it('is on in prod when VITE_FF_DIRECTORY=on', () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_FF_DIRECTORY', 'on');
    expect(directoryEnabled()).toBe(true);
  });

  it('is off in prod by default (flag unset, overrides off)', () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_FF_DIRECTORY', '');
    vi.stubEnv('VITE_FF_OVERRIDES', '');
    setUrl('?ff_directory=1'); // ignored — overrides disabled
    expect(directoryEnabled()).toBe(false);
  });

  it('honours ?ff_directory=1 only when VITE_FF_OVERRIDES=on, and persists for the session', () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_FF_DIRECTORY', '');
    vi.stubEnv('VITE_FF_OVERRIDES', 'on');

    setUrl('?ff_directory=1');
    expect(directoryEnabled()).toBe(true);

    setUrl(''); // override sticks for the rest of the session
    expect(directoryEnabled()).toBe(true);

    setUrl('?ff_directory=0'); // explicit clear
    expect(directoryEnabled()).toBe(false);
  });
});
