/* eslint-disable */
/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** Web3Forms public access key; when unset the contact page is email-only. */
  readonly PUBLIC_WEB3FORMS_KEY?: string;
  /** GoatCounter site code; when unset or blank no analytics script is added. */
  readonly PUBLIC_GOATCOUNTER_CODE?: string;
  /**
   * Test builds only: `true` exposes the drift world's read-only state as
   * `window.__driftDebug` for the e2e suite. Unset in production, where the
   * code is removed at build time.
   */
  readonly PUBLIC_DRIFT_DEBUG?: string;
}

declare module '*.astro' {
  const component: any;
  export default component;
}

declare module 'subset-font' {
  const subsetFont: any;
  export default subsetFont;
}
