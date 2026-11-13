/** What the browser tells us about the device (read by the island at boot). */
export interface DeviceCapabilities {
  /** A WebGL2 context can be created. */
  webgl2: boolean;
  /**
   * `prefers-reduced-motion: reduce` matches. Probed, but deliberately not
   * used for routing (docs/adr/0009): the always-visible "Wake up" control
   * is the opt-out.
   */
  reducedMotion: boolean;
  /** `navigator.connection.saveData` is on. */
  saveData: boolean;
  /** `navigator.deviceMemory` in GB, when the browser exposes it. */
  deviceMemory?: number;
  /** `navigator.hardwareConcurrency`, when the browser exposes it. */
  hardwareConcurrency?: number;
  /** `pointer: coarse` matches (phones, tablets). */
  coarsePointer: boolean;
}

/** Rendering quality: `low` means smaller textures and a lower pixel ratio. */
export type QualityTier = 'high' | 'low';

/** Which layer the visitor sees on the home page. */
export type WorldMode = 'world' | 'awake';

/** The visitor's choice from the "Wake up" / "Drift" toggle, or none. */
export type ModeOverride = WorldMode | null;

/** Why a device gets the awake layer. */
export type AwakeReason = 'no-webgl2' | 'save-data' | 'low-memory' | 'few-cores' | 'override';

/** The routing decision for one visit. */
export interface DeviceDecision {
  /** Layer to show, the override applied. */
  mode: WorldMode;
  /** Layer the device would get without any override. */
  automatic: WorldMode;
  /** Quality tier used when the world is shown. */
  tier: QualityTier;
  /** Why the mode is `awake` (empty when it is `world`). */
  reasons: AwakeReason[];
}

/** Minimum `deviceMemory` (GB) and core count for the world. */
const MIN_MEMORY_GB = 4;
const MIN_CORES = 4;
/** Memory (GB) and cores from which the high tier is used. */
const HIGH_MEMORY_GB = 8;
const HIGH_CORES = 8;

/**
 * Capability routing of the drift world (FR1, "respect the visitor's
 * device"): the world needs WebGL2, Save-Data off, and (when the browser
 * exposes them) at least 4 GB of memory and 4 cores. Values the browser hides
 * (Safari, Firefox) count as sufficient. `prefers-reduced-motion` does not
 * route (artist decision, docs/adr/0009): the world is the artwork and the
 * always-visible "Wake up" control is the opt-out.
 *
 * The visitor's toggle wins over the automatic choice, except that the world
 * is never forced onto a device without WebGL2. A device that only gets the
 * world through the override is drawn in the `low` tier.
 */
export class DeviceProfile {
  /**
   * Decides which layer to show and at which quality.
   *
   * @param caps - Device capabilities.
   * @param override - The visitor's stored toggle choice, or `null`.
   * @returns The decision; pure, no side effects.
   */
  static decide(caps: DeviceCapabilities, override: ModeOverride): DeviceDecision {
    const against = DeviceProfile.reasonsAgainst(caps);
    const automatic: WorldMode = against.length === 0 ? 'world' : 'awake';
    const tier = DeviceProfile.tierOf(caps, automatic);

    if (!caps.webgl2) return { mode: 'awake', automatic, tier, reasons: against };
    if (override === 'awake') return { mode: 'awake', automatic, tier, reasons: ['override'] };
    if (override === 'world') return { mode: 'world', automatic, tier, reasons: [] };
    return { mode: automatic, automatic, tier, reasons: against };
  }

  /**
   * Whether a valid `?w=<slug>` deep link may automatically enter the world
   * (overriding a stored `'awake'` choice or low-memory / few-cores defaults):
   * requires WebGL2 and Save-Data off.
   *
   * @param caps - Device capabilities.
   * @returns `true` when the device may auto-enter on a deep link.
   */
  static canAutoEnterDeepLink(caps: DeviceCapabilities): boolean {
    return caps.webgl2 && !caps.saveData;
  }

  /**
   * Every capability reason against the world, in a stable order.
   *
   * @param caps - Device capabilities.
   * @returns Reasons (empty for a capable device).
   */
  private static reasonsAgainst(caps: DeviceCapabilities): AwakeReason[] {
    const reasons: AwakeReason[] = [];
    if (!caps.webgl2) reasons.push('no-webgl2');
    if (caps.saveData) reasons.push('save-data');
    if (DeviceProfile.below(caps.deviceMemory, MIN_MEMORY_GB)) reasons.push('low-memory');
    if (DeviceProfile.below(caps.hardwareConcurrency, MIN_CORES)) reasons.push('few-cores');
    return reasons;
  }

  /**
   * Quality tier: `high` for a fine-pointer device with (when known) ≥ 8 GB
   * and ≥ 8 cores that qualifies on its own; `low` otherwise.
   *
   * @param caps - Device capabilities.
   * @param automatic - The automatic mode.
   * @returns The tier.
   */
  private static tierOf(caps: DeviceCapabilities, automatic: WorldMode): QualityTier {
    const strong =
      automatic === 'world' &&
      !caps.coarsePointer &&
      !DeviceProfile.below(caps.deviceMemory, HIGH_MEMORY_GB) &&
      !DeviceProfile.below(caps.hardwareConcurrency, HIGH_CORES);
    return strong ? 'high' : 'low';
  }

  /**
   * Whether a value the browser may hide is known and below a minimum.
   *
   * @param value - Exposed value or `undefined`.
   * @param minimum - Threshold (inclusive pass).
   * @returns `true` only for a known value under the threshold.
   */
  private static below(value: number | undefined, minimum: number): boolean {
    return value !== undefined && value < minimum;
  }
}
