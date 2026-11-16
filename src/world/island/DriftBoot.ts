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
import { SoundDirector, type SoundFeed } from '../../sound/core/SoundDirector.js';
import { SoundPreference } from '../../sound/core/SoundPreference.js';
import { SoundControls } from '../../sound/island/SoundControls.js';
import type { SoundEngineModule, SoundWindow } from '../../sound/SoundEngine.js';
import { KioskMode } from '../../kiosk/KioskMode.js';
import { isKiosk } from '../../kiosk/KioskParam.js';

/** What the world module receives when mounted. */
export interface MountOptions {
  manifest: WorldManifest;
  tier: QualityTier;
  /** Deep-linked work (`?w=`), or `null`. */
  startSlug: string | null;
  win: Window;
  /** The threshold over the world (the world holds still while it is up). */
  threshold: ThresholdView;
  /** The sound, fed the camera's surroundings each frame, or `null` without sound. */
  sound: SoundFeed | null;
  /** Exhibition mode (`?kiosk=1`, FR5): QR codes instead of links in the focus dialog. */
  kiosk: boolean;
}

/** A mounted world. */
export interface WorldHandle {
  /** Stops rendering, removes listeners and frees GPU memory. */
  unmount(): void;
  /** Exhibition mode: glide to the next work along the zone path. */
  advance(): void;
  /** Exhibition mode: close the focus dialog and go back to the start of the path. */
  restart(): void;
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
  /** The sound's decisions, or `null` for a silent world. */
  readonly sound: SoundDirector | null;
}

/**
 * Boots the drift on the home page (small script, loaded with the page):
 * decides between world and awake layer (FR1), wires the "Wake up" and
 * "Drift" controls, overrides a stored `'awake'` choice when a valid known
 * `?w=<slug>` deep link or an explicit `?drift=1` portal intent arrives on a
 * WebGL2 device without Save-Data, cleans `?drift=1` via `replaceState`,
 * surfaces `[data-awake-resume]` beside `[data-drift-start]` whenever the
 * Awake home page is shown with a known `?w=<slug>`, opens the world on the
 * threshold (full on a first visit, short for a returning, deep-linked, or
 * `?drift=1` portal visit; "Drift" skips it, being itself the gesture) and
 * emits `entered` on the world layer (bubbling, detail {@link EnteredDetail}),
 * and loads the Three.js world only after first paint and only when it is shown.
 *
 * With `loadSound`, the sound is wired too (docs/adr/0011): a
 * {@link SoundDirector} hears `entered` (only a gesture may unlock audio),
 * the mute toggle and the tab's visibility, loads the Tone.js engine
 * through `loadSound` only then, and is fed by the world each frame. While
 * sound is on (not muted) the short threshold also waits for a click.
 *
 * With `?kiosk=1` (exhibition mode, FR5) the world opens at the start of
 * the path (`?w=` and `?drift=1` are ignored), without the threshold and
 * without a gesture, whatever was stored; a {@link KioskMode} takes the links
 * out of the page, hands the first tap to the sound as its gesture, drifts on
 * by itself and resets after 90 s without input (back into the world from the
 * awake page too); neither "Wake up" nor "Drift" is remembered.
 *
 * If the world fails to start, the error is reported in the console and the
 * visitor gets the awake page (which never left the DOM).
 *
 * @param doc - The document.
 * @param win - The window.
 * @param load - Dynamic import of the world module.
 * @param probe - Capability probe (default: real browser).
 * @param afterPaint - First-paint scheduler (default: load + frame + idle).
 * @param loadSound - Dynamic import of the sound engine module, or `null` for a silent world.
 * @returns The boot handle, or `null` on pages without the world.
 * @throws Error when `loadSound` is given and the layer has no `[data-sound-toggle]`.
 */
export function bootDrift(
  doc: Document,
  win: Window,
  load: () => Promise<WorldModule>,
  probe: (host: ProbeHost) => DeviceCapabilities = probeCapabilities,
  afterPaint: (host: PaintHost, cb: () => void) => void = afterFirstPaint,
  loadSound: (() => Promise<SoundEngineModule>) | null = null,
): DriftBootHandle | null {
  const root = doc.querySelector<HTMLElement>('[data-drift]');
  if (!root) return null;
  const layer = new DriftLayer(root);
  const storage = storageOf(win);
  const preference = new ModePreference(storage);
  const visits = new VisitMemory(storage);
  const caps = probe(win as unknown as ProbeHost);
  const kiosk = isKiosk(win.location.search);
  const canAutoEnter = !kiosk && DeviceProfile.canAutoEnterDeepLink(caps);
  let initialDriftIntent =
    canAutoEnter &&
    doc.getElementById('drift-manifest') !== null &&
    DeepLink.hasDriftIntent(win.location.search);
  const resolved = canAutoEnter ? resolveDeepLink(doc, win.location.search) : { manifest: null, slug: null };
  let cachedManifest: WorldManifest | null = resolved.manifest;
  const deepLinkEnter = resolved.slug !== null;
  if (initialDriftIntent) {
    win.history.replaceState(win.history.state, '', DeepLink.withoutDriftIntent(win.location.href));
  }
  if (deepLinkEnter || initialDriftIntent) preference.write('world');
  const decision = DeviceProfile.decide(
    caps,
    kiosk || deepLinkEnter || initialDriftIntent ? 'world' : preference.read(),
  );
  const starts = [...doc.querySelectorAll<HTMLButtonElement>('[data-drift-start]')];
  const resumeLink = doc.querySelector<HTMLAnchorElement>('[data-awake-resume]');
  let state: 'awake' | 'loading' | 'world' = 'awake';
  let handle: WorldHandle | null = null;
  let failed = false;
  let threshold: ThresholdOverlay | null = null;
  const sound = loadSound
    ? new SoundDirector(new SoundPreference(storage), () =>
        loadSound().then((m) => m.createSoundEngine(win as unknown as SoundWindow)),
      )
    : null;
  if (sound) {
    const toggle = root.querySelector<HTMLButtonElement>('[data-sound-toggle]');
    if (!toggle) throw new Error('[drift] Missing [data-sound-toggle] in the world layer');
    // A mute change while a short threshold is up changes whether it waits for Enter.
    new SoundControls(toggle, sound, doc, (muted) => threshold?.soundChanged(!muted));
  }

  const showStarts = (visible: boolean) => starts.forEach((b) => (b.hidden = !visible));

  const manifestOrNull = (): WorldManifest | null => {
    if (cachedManifest) return cachedManifest;
    if (!doc.getElementById('drift-manifest')) return null;
    cachedManifest = readManifest(doc);
    return cachedManifest;
  };

  const syncAwakeResume = (visible: boolean): void => {
    if (!resumeLink) return;
    if (kiosk || !visible) {
      resumeLink.hidden = true;
      return;
    }
    const rawSlug = new URLSearchParams(win.location.search).get(DeepLink.PARAM);
    const manifest = rawSlug ? manifestOrNull() : null;
    const matched = manifest?.works.find((w) => w.slug === rawSlug);
    if (!matched) {
      resumeLink.hidden = true;
      return;
    }
    const template = resumeLink.dataset.resumeTemplate;
    resumeLink.setAttribute('href', matched.href);
    resumeLink.textContent = template ? template.replace('{title}', matched.title) : matched.title;
    resumeLink.hidden = false;
  };

  const leave = (): void => {
    state = 'awake';
    threshold?.dismiss();
    sound?.leave();
    handle?.unmount();
    handle = null;
    layer.hide();
    showStarts(caps.webgl2 && !failed);
    syncAwakeResume(true);
    starts.find((b) => !b.hidden)?.focus();
  };

  const enter = (manual = false): void => {
    if (state !== 'awake') return;
    state = 'loading';
    const entered = (detail: EnteredDetail) => {
      visits.mark();
      sound?.entered(detail);
      root.dispatchEvent(new CustomEvent<EnteredDetail>('entered', { bubbles: true, detail }));
    };
    const hadDriftIntent = initialDriftIntent;
    initialDriftIntent = false;
    const deepLink =
      !kiosk &&
      (hadDriftIntent || (new URLSearchParams(win.location.search).get(DeepLink.PARAM) ?? '') !== '');
    const overlay = new ThresholdOverlay(
      root,
      new ThresholdState(
        { returning: visits.returning, deepLink, soundOn: sound !== null && !sound.muted },
        entered,
      ),
      win,
    );
    threshold = overlay;
    layer.show();
    showStarts(false);
    syncAwakeResume(false);
    if (kiosk) overlay.skip(false);
    else if (manual) overlay.skip();
    else overlay.show();
    const tier = DeviceProfile.decide(caps, 'world').tier;
    load()
      .then((module) => {
        const manifest = cachedManifest ?? readManifest(doc);
        cachedManifest = manifest;
        const startSlug = kiosk
          ? null
          : DeepLink.parse(win.location.search, new Set(manifest.works.map((w) => w.slug)));
        return module.mountWorld(root, { manifest, tier, startSlug, win, threshold: overlay, sound, kiosk });
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
    if (!kiosk) preference.write('awake');
    leave();
  });
  starts.forEach((b) =>
    b.addEventListener('click', () => {
      if (!kiosk) preference.write('world');
      enter(true);
    }),
  );

  if (kiosk) {
    new KioskMode(doc, win, () => Date.now(), {
      gesture: () => sound?.gesture(),
      advance: () => handle?.advance(),
      reset: () => (state === 'awake' ? enter() : handle?.restart()),
    });
  }

  const awakeInitially = decision.mode === 'awake';
  showStarts(caps.webgl2 && awakeInitially);
  syncAwakeResume(awakeInitially);
  if (decision.mode === 'world') afterPaint(win as unknown as PaintHost, () => enter(false));
  return {
    decision,
    get threshold() {
      return threshold;
    },
    enter: () => enter(false),
    leave,
    sound,
  };
}

/**
 * Parses the page manifest when `?w=<slug>` is present so boot can check
 * whether the slug is known and hand the parsed manifest straight to `enter()`.
 *
 * @param doc - The document.
 * @param search - `location.search`.
 * @returns The parsed manifest (when read) and the matched work slug, or `null`s.
 */
function resolveDeepLink(doc: Document, search: string): { manifest: WorldManifest | null; slug: string | null } {
  if (!new URLSearchParams(search).get(DeepLink.PARAM) || !doc.getElementById('drift-manifest')) {
    return { manifest: null, slug: null };
  }
  const manifest = readManifest(doc);
  return { manifest, slug: DeepLink.parse(search, new Set(manifest.works.map((w) => w.slug))) };
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
