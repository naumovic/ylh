/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_POSTHOG_KEY?: string;
  readonly VITE_POSTHOG_HOST?: string;
  readonly VITE_FF_DIRECTORY?: string; // 'on' shows the installer directory (off in prod)
  readonly VITE_FF_OVERRIDES?: string; // 'on' enables the ?ff_directory=1 runtime override
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
