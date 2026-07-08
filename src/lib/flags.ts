// Feature flags (Phase 2). No DB, no flag service — build-time env + a runtime override,
// same spirit as the rest of the app.
//
//   VITE_FF_DIRECTORY = 'on'   → installer directory shown (dev + preview; OFF in prod).
//   VITE_FF_OVERRIDES = 'on'   → allow the `?ff_directory=1` runtime override (so a prod
//                                build can be probed before launch, then ship with overrides
//                                disabled once the directory goes live for everyone).
//
// The directory renders below the engine's answer; the engine never sees this flag — it's
// computed after the recommendation. Directory code/data is lazy-loaded (App.tsx), and the
// dynamic import is behind a compile-time-foldable gate, so a flag-off prod bundle ships
// none of it.

const SESSION_KEY = 'ff_directory';

/**
 * True when the directory feature should render for this request. Compile-time signals
 * fold to constants in the bundle; the session override is only consulted when
 * VITE_FF_OVERRIDES is on (so it's a no-op once prod ships with overrides disabled).
 */
export function directoryEnabled(): boolean {
  if (import.meta.env.DEV) return true; // always on in dev
  if (import.meta.env.VITE_FF_DIRECTORY === 'on') return true; // launched (or preview)
  return sessionOverrideOn();
}

/** Reads (and persists) the `?ff_directory=1` override, gated on VITE_FF_OVERRIDES=on. */
function sessionOverrideOn(): boolean {
  if (import.meta.env.VITE_FF_OVERRIDES !== 'on' || typeof window === 'undefined') return false;
  try {
    const q = new URLSearchParams(window.location.search).get('ff_directory');
    if (q === '1') sessionStorage.setItem(SESSION_KEY, '1');
    else if (q === '0') sessionStorage.removeItem(SESSION_KEY);
    return sessionStorage.getItem(SESSION_KEY) === '1';
  } catch {
    return false; // private mode / storage disabled
  }
}

/**
 * Compile-time gate for the lazy `import()` of directory code. Must be true whenever
 * `directoryEnabled()` can ever return true at runtime — otherwise the component is null
 * and can't mount. When every signal is a build-false constant (default prod), this folds
 * to `false`, and Rollup drops the dynamic import chunk and all directory data with it.
 */
export const DIRECTORY_BUNDLE_ENABLED =
  import.meta.env.DEV ||
  import.meta.env.VITE_FF_DIRECTORY === 'on' ||
  import.meta.env.VITE_FF_OVERRIDES === 'on';
