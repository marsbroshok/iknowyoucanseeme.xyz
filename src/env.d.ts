/* eslint-disable */
/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

declare module '*.astro' {
  const component: any;
  export default component;
}

declare module 'subset-font' {
  const subsetFont: any;
  export default subsetFont;
}
