/* eslint-disable */
/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** Web3Forms public access key; when unset the contact page is email-only. */
  readonly PUBLIC_WEB3FORMS_KEY?: string;
  /** GoatCounter site code; when unset or blank no analytics script is added. */
  readonly PUBLIC_GOATCOUNTER_CODE?: string;
}

declare module '*.astro' {
  const component: any;
  export default component;
}

declare module 'subset-font' {
  const subsetFont: any;
  export default subsetFont;
}
