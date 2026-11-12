import type { DeviceCapabilities } from '../core/DeviceProfile.js';

/** The parts of `window` the probe reads. */
export interface ProbeHost {
  document: { createElement(tag: 'canvas'): { getContext(kind: 'webgl2'): { getExtension(name: string): { loseContext(): void } | null } | null } };
  matchMedia(query: string): { matches: boolean };
  navigator: { hardwareConcurrency?: number; deviceMemory?: number; connection?: { saveData?: boolean } };
}

/**
 * Reads what the browser exposes about the device (FR1 inputs): WebGL2,
 * reduced-motion and coarse-pointer media queries, Save-Data, and the
 * memory / core hints where exposed. The probe's GL context is released at
 * once so it does not count against the page's context limit.
 *
 * @param host - `window`.
 * @returns Device capabilities.
 */
export function probeCapabilities(host: ProbeHost): DeviceCapabilities {
  const gl = host.document.createElement('canvas').getContext('webgl2');
  gl?.getExtension('WEBGL_lose_context')?.loseContext();
  return {
    webgl2: gl !== null,
    reducedMotion: host.matchMedia('(prefers-reduced-motion: reduce)').matches,
    saveData: host.navigator.connection?.saveData === true,
    deviceMemory: host.navigator.deviceMemory,
    hardwareConcurrency: host.navigator.hardwareConcurrency,
    coarsePointer: host.matchMedia('(pointer: coarse)').matches,
  };
}
