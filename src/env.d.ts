/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_SIGNUP_ENDPOINT?: string;
  readonly PUBLIC_TURNSTILE_SITE_KEY?: string;
  readonly PUBLIC_RELEASE_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
