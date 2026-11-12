/** The parts of `window` used to wait for the first paint. */
export interface PaintHost {
  document: { readyState: DocumentReadyState };
  addEventListener(type: 'load', listener: () => void, options: { once: true }): void;
  requestAnimationFrame(callback: () => void): number;
  setTimeout(callback: () => void, ms: number): number;
  requestIdleCallback?: (callback: () => void, options: { timeout: number }) => number;
}

/** Longest wait for an idle moment (ms). */
const IDLE_TIMEOUT = 1500;

/**
 * Runs a callback after the page has loaded and painted, in an idle moment
 * (the world's JavaScript must not compete with the first view).
 *
 * @param host - `window`.
 * @param callback - Work to run.
 */
export function afterFirstPaint(host: PaintHost, callback: () => void): void {
  const idle = host.requestIdleCallback
    ? (cb: () => void) => host.requestIdleCallback?.(cb, { timeout: IDLE_TIMEOUT })
    : (cb: () => void) => host.setTimeout(cb, 1);
  const run = () => {
    host.requestAnimationFrame(() => idle(callback));
  };
  if (host.document.readyState === 'complete') run();
  else host.addEventListener('load', run, { once: true });
}
