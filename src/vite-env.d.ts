/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Canonical public site URL used to build printable table QR codes. */
  readonly VITE_SITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
