/** GoatCounter's counting script (served by GoatCounter, cookieless). */
export const GOATCOUNTER_SCRIPT_SRC = 'https://gc.zgo.at/count.js';

/** A GoatCounter site code: the `<code>` of `<code>.goatcounter.com`. */
const SITE_CODE = /^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$/;

/** Analytics settings of a build. */
export type AnalyticsConfig =
  | { enabled: false }
  | {
      enabled: true;
      /** GoatCounter site code. */
      code: string;
      /** Count endpoint (`data-goatcounter` of the script tag). */
      endpoint: string;
      /** URL of the counting script. */
      scriptSrc: string;
    };

/**
 * Reads the analytics settings from `PUBLIC_GOATCOUNTER_CODE`.
 *
 * Absent or blank (an unset GitHub repository variable expands to an empty
 * string) means analytics is **disabled**: no script on any page, and
 * `Analytics.track()` does nothing. Any other value must be a GoatCounter
 * site code; a wrong value fails the build instead of shipping a counter
 * that silently counts nothing.
 *
 * @param code - Value of `PUBLIC_GOATCOUNTER_CODE`.
 * @returns The settings.
 * @throws Error when the value is set but is not a valid site code.
 */
export function readAnalyticsConfig(code: string | undefined): AnalyticsConfig {
  const trimmed = (code ?? '').trim();
  if (trimmed === '') return { enabled: false };
  if (!SITE_CODE.test(trimmed)) {
    throw new Error(
      `[analytics] PUBLIC_GOATCOUNTER_CODE must be a GoatCounter site code (the "<code>" of <code>.goatcounter.com: lowercase letters, digits, dashes), got "${trimmed}"`,
    );
  }
  return {
    enabled: true,
    code: trimmed,
    endpoint: `https://${trimmed}.goatcounter.com/count`,
    scriptSrc: GOATCOUNTER_SCRIPT_SRC,
  };
}
