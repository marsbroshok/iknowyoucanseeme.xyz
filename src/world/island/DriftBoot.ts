import { DeviceProfile, type DeviceCapabilities, type DeviceDecision, type QualityTier } from '../core/DeviceProfile.js';
import { ModePreference, type PreferenceStorage } from '../core/ModePreference.js';
import { parseManifest, type WorldManifest } from '../core/WorldManifest.js';
import { DeepLink } from '../core/DeepLink.js';
import { probeCapabilities, type ProbeHost } from './CapabilityProbe.js';
import { afterFirstPaint, type PaintHost } from './FirstPaint.js';
import { DriftLayer } from './DriftLayer.js';
import { ThresholdState, type EnteredDetail } from '../core/ThresholdState.js';
import { VisitMemory } from '../core/VisitMemory.js';
import { ThresholdOverlay, type ThresholdView } from './ThresholdOverlay.js';

/** What the world module receives when mounted. */
export interface MountOptions {
  manifest: WorldManifest;
  tier: QualityTier;
  /** Deep-linked work (`?w=`), or `null`. */
  startSlug: string | null;
  win: Window;
  /** The threshold over the world (the world holds still while it is up). */
  threshold: ThresholdView;
}

/** A mounted world. */
export interface WorldHandle {
  /** Stops rendering, removes listeners and frees GPU memory. */
  unmount(): void;
}

/** The lazily loaded world module (`src/world/gl/DriftWorld.ts`). */
export interface WorldModule {
  mountWorld(root: HTMLElement, options: MountOptions): Promise<WorldHandle>;
}

/** The running boot, for the page and for tests. */
export interface DriftBootHandle {
  decision: DeviceDecision;
  /** The current threshold, or `null` before the world was first shown. */
  readonly threshold: ThresholdView | null;
  /** Shows the world (loading it on first use), on the threshold. */
  enter(): void;
  /** Back to the awake page. */
  leave(): void;
}

/**
 * Boots the drift on the home page (small script, loaded with the page):
 * decides between world and awake layer (FR1), wires the "Wake up" and
 * "Drift" controls, opens the world on the threshold (full on a first
 * visit, short for a returning or deep-linked one; "Drift" skips it, being
 * itself the gesture) and emits `entered` on the world layer (bubbling,
 * detail {@link EnteredDetail}) for the sound track, and loads the
 * Three.js world only after first paint and only when it is shown.
 *
 * If the world fails to start, the error is reported in the console and the
 * visitor gets the awake page (which never left the DOM).
 *
 * @param doc - The document.
 * @param win - The window.
 * @param load - Dynamic import of the world module.
 * @param probe - Capability probe (default: real browser).
 * @param afterPaint - First-paint scheduler (default: load + frame + idle).
 * @returns The boot handle, or `null` on pages without the world.
 */
export function bootDrift(
  doc: Document,
  win: Window,
  load: () => Promise<WorldModule>,
  probe: (host: ProbeHost) => DeviceCapabilities = probeCapabilities,
  afterPaint: (host: PaintHost, cb: () => void) => void = afterFirstPaint,
): DriftBootHandle | null {
  const root = doc.querySelector<HTMLElement>('[data-drift]');
  if (!root) return null;
  const layer = new DriftLayer(root);
  const storage = storageOf(win);
  const preference = new ModePreference(storage);
  const visits = new VisitMemory(storage);
  const caps = probe(win as unknown as ProbeHost);
  const decision = DeviceProfile.decide(caps, preference.read());
  const starts = [...doc.querySelectorAll<HTMLButtonElement>('[data-drift-start]')];
  let state: 'awake' | 'loading' | 'world' = 'awake';
  let handle: WorldHandle | null = null;
  let failed = false;
  let threshold: ThresholdOverlay | null = null;

  const showStarts = (visible: boolean) => starts.forEach((b) => (b.hidden = !visible));

  const leave = (): void => {
    state = 'awake';
    threshold?.dismiss();
    handle?.unmount();
    handle = null;
    layer.hide();
    showStarts(caps.webgl2 && !failed);
    starts.find((b) => !b.hidden)?.focus();
  };

  const enter = (manual = false): void => {
    if (state !== 'awake') return;
    state = 'loading';
    const entered = (detail: EnteredDetail) => {
      visits.mark();
      root.dispatchEvent(new CustomEvent<EnteredDetail>('entered', { bubbles: true, detail }));
    };
    const deepLink = (new URLSearchParams(win.location.search).get(DeepLink.PARAM) ?? '') !== '';
    const overlay = new ThresholdOverlay(root, new ThresholdState({ returning: visits.returning, deepLink, soundOn: false }, entered), win);
    threshold = overlay;
    layer.show();
    showStarts(false);
    if (manual) overlay.skip();
    else overlay.show();
    const tier = DeviceProfile.decide(caps, 'world').tier;
    load()
      .then((module) => {
        const manifest = readManifest(doc);
        const startSlug = DeepLink.parse(win.location.search, new Set(manifest.works.map((w) => w.slug)));
        return module.mountWorld(root, { manifest, tier, startSlug, win, threshold: overlay });
      })
      .then(
        (mounted) => {
          if (state !== 'loading') return mounted.unmount();
          handle = mounted;
          state = 'world';
        },
        (error: unknown) => {
          console.error('[drift] The world could not start; showing the awake page.', error);
          failed = true;
          leave();
        },
      );
  };

  root.querySelector('[data-drift-wake]')?.addEventListener('click', () => {
    preference.write('awake');
    leave();
  });
  starts.forEach((b) =>
    b.addEventListener('click', () => {
      preference.write('world');
      enter(true);
    }),
  );

  showStarts(caps.webgl2 && decision.mode === 'awake');
  if (decision.mode === 'world') afterPaint(win as unknown as PaintHost, () => enter());
  return {
    decision,
    get threshold() {
      return threshold;
    },
    enter: () => enter(),
    leave,
  };
}

/**
 * The manifest embedded in the page.
 *
 * @param doc - The document.
 * @returns The validated manifest.
 * @throws Error when it is missing or invalid.
 */
function readManifest(doc: Document): WorldManifest {
  return parseManifest(JSON.parse(doc.getElementById('drift-manifest')?.textContent ?? 'null'));
}

/**
 * `localStorage`, or `null` when the browser blocks it (the choice then
 * lasts for the page only; a warning says so).
 *
 * @param win - The window.
 * @returns Storage or `null`.
 */
function storageOf(win: Window): PreferenceStorage | null {
  try {
    return win.localStorage;
  } catch (error) {
    console.warn('[drift] localStorage is blocked; the Wake up / Drift choice will not be remembered.', error);
    return null;
  }
}
