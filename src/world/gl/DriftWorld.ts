import { Raycaster, Vector2, Vector3, type Texture } from 'three';
import { DriftSession } from '../core/DriftSession.js';
import { DeepLink } from '../core/DeepLink.js';
import { InputAccumulator } from '../core/InputAccumulator.js';
import { TIER_BUDGETS } from '../core/TextureBudget.js';
import { CAMERA } from '../core/StageSettings.js';
import { TextureStreamer } from '../stream/TextureStreamer.js';
import { HorizonCompass } from '../island/HorizonCompass.js';
import { WorkList } from '../island/WorkList.js';
import { FocusOverlay } from '../island/FocusOverlay.js';
import { DriftAnalytics } from '../island/DriftAnalytics.js';
import { Analytics, type AnalyticsHost } from '../../analytics/Analytics.js';
import { readAnalyticsConfig } from '../../analytics/AnalyticsConfig.js';
import { TiltControl } from '../island/TiltControl.js';
import { WheelInput } from '../island/input/WheelInput.js';
import { PointerDragInput } from '../island/input/PointerDragInput.js';
import { KeyboardInput } from '../island/input/KeyboardInput.js';
import { LensInput } from '../island/input/LensInput.js';
import { LensAnnouncer } from '../island/LensAnnouncer.js';
import { LensDirector } from '../core/LensDirector.js';
import type { LensBlend } from '../core/LensCrossfade.js';
import { LensUniforms, type LensAim } from '../core/LensUniforms.js';
import { LensSession } from '../core/LensSession.js';
import { GazeDirector, type GazeTurn } from '../core/GazeDirector.js';
import { FragmentCatalog } from '../core/FragmentCatalog.js';
import { FragmentProgress } from '../core/FragmentProgress.js';
import { FragmentSurfacer } from '../core/FragmentSurfacer.js';
import { ThresholdPalette } from '../core/ThresholdPalette.js';
import { WorldWhisper } from '../island/WorldWhisper.js';
import { ThresholdLeak } from './ThresholdLeak.js';
import { modeIndex, type LensMode } from '../core/LensMode.js';
import type { MountOptions, WorldHandle } from '../island/DriftBoot.js';
import { SoundScene } from '../../sound/core/SoundScene.js';
import type { SoundFeed } from '../../sound/core/SoundDirector.js';
import { LeakRecorder } from '../../leak/LeakRecorder.js';
import { ApparitionMesh } from './ApparitionMesh.js';
import { WorkTextureLoader } from './WorkTextureLoader.js';
import { WorldStage } from './WorldStage.js';

/** Read-only state exposed to the e2e suite when built with `PUBLIC_DRIFT_DEBUG=true`. */
export interface DriftDebugState {
  frames: number;
  tier: string;
  pose: { x: number; z: number; yaw: number };
  facing: string | null;
  nearest: string | null;
  loaded: Record<string, string>;
  works: { slug: string; distance: number; opacity: number; ndc: { x: number; y: number; z: number } }[];
  lens: { slug: string | null; mode: LensMode | null; strength: number; unaltered: boolean; blend: LensBlend | null; modes: readonly LensMode[] };
  threshold: { holding: boolean; visible: boolean; leak: boolean };
  gaze: { turns: GazeTurn[]; lineOpacity: number };
  fragment: { id: string; opacity: number } | null;
  sound: SoundFeed['debug'] | null;
}

/**
 * Finds a required element of the world layer.
 *
 * @param root - World layer.
 * @param selector - CSS selector.
 * @returns The element.
 * @throws Error when the page lacks it.
 */
function part<T extends Element>(root: HTMLElement, selector: string): T {
  const el = root.querySelector<T>(selector);
  if (!el) throw new Error(`[drift] Missing ${selector} in the world layer`);
  return el;
}

/**
 * Mounts the Three.js world in the home page's world layer: stage, one
 * apparition per work, texture streaming, inputs, compass, the keyboard
 * work list and the lens (camera-technique shaders over the work under the
 * pointer; decisions by LensDirector, LensUniforms and LensCrossfade) and
 * the sound's view of the camera (`SoundScene`, handed to the boot's sound
 * director), all driven frame by frame by a {@link DriftSession}.
 *
 * Verified in the browser (ADR 0006).
 *
 * @param root - The `[data-drift]` layer.
 * @param options - Manifest, tier, deep link and window.
 * @returns Handle to unmount the world.
 * @throws Error when the page lacks a part of the layer or WebGL2 fails.
 */
export async function mountWorld(root: HTMLElement, options: MountOptions): Promise<WorldHandle> {
  const { manifest, tier, startSlug, win, threshold, sound, kiosk } = options;
  const canvas = part<HTMLCanvasElement>(root, '[data-drift-canvas]');
  const stage = new WorldStage(canvas, tier, win.devicePixelRatio);
  const session = new DriftSession(manifest, tier, startSlug);
  const work = (slug: string) => session.work(slug) as NonNullable<ReturnType<DriftSession['work']>>;

  const meshes = new Map<string, ApparitionMesh>();
  for (const p of session.layout.placements) {
    const w = work(p.slug);
    const mesh = new ApparitionMesh(p.slug, p, w.images.low.width / w.images.low.height, w.color, tier, w.specimen !== null);
    meshes.set(p.slug, mesh);
    stage.scene.add(mesh.mesh);
  }

  const loader = new WorkTextureLoader();
  const streamer = new TextureStreamer<Texture>({
    load: loader.load,
    release: loader.release,
    urlFor: (slug, lod) => (lod === 'low' ? work(slug).images.low : work(slug).images[TIER_BUDGETS[tier].fullVariant]).url,
    onChange: (slug, texture) => meshes.get(slug)?.setTexture(texture),
    onError: (slug, url, error) => console.error(`[drift] The image of "${slug}" (${url}) could not be loaded; it stays a colour veil.`, error),
    maxConcurrent: 2,
  });

  const acc = new InputAccumulator();
  const wheel = new WheelInput(root, acc);
  const drag = new PointerDragInput(canvas, acc);
  const keys = new KeyboardInput(root);
  const tilt = new TiltControl(part<HTMLButtonElement>(root, '[data-drift-tilt]'), win, win.matchMedia('(pointer: coarse)').matches);

  const halfFov = () => Math.atan(Math.tan((CAMERA.fov * Math.PI) / 360) * stage.camera.aspect);
  const compass = new HorizonCompass(
    part<HTMLElement>(root, '[data-drift-compass]'),
    session.layout.regions,
    {
      territories: Object.fromEntries(manifest.territories.map((t) => [t.slug, t.title])),
      zones: Object.fromEntries(manifest.zones.map((z) => [z.slug, z.title])),
    },
    halfFov(),
  );

  const overlay = new FocusOverlay(part<HTMLDialogElement>(root, '[data-drift-focus]'), undefined, { kiosk });
  const open = (slug: string) => overlay.open(work(slug));
  const list = new WorkList(part<HTMLUListElement>(root, '[data-drift-works]'), session.stops.map((s) => ({ slug: s.slug, title: work(s.slug).title })), {
    onFocus: (slug) => session.focus(slug),
    onOpen: open,
    next: (current, direction) => session.cycle(current, direction),
    isLast: (slug, direction) => session.isLast(slug, direction),
  });

  // The lens (FR1-FR4): decisions in src/world/core, input in src/world/island.
  const director = new LensDirector(
    manifest.works.map((w) => ({ slug: w.slug, territory: w.territory, zone: w.zone, techniques: w.techniques, palette: w.palette })),
    tier,
  );
  const lens = new LensSession(director);
  const announcer = new LensAnnouncer(part<HTMLElement>(root, '[data-drift-lens]'));
  const lensInput = new LensInput(canvas, root, () => {
    const mode = lens.cycle();
    if (mode) announcer.announce(mode);
  });

  const metrics = new DriftAnalytics(new Analytics(readAnalyticsConfig(import.meta.env.PUBLIC_GOATCOUNTER_CODE), win as unknown as AnalyticsHost), win);

  // The threshold's boreal curtain, the gaze and the fragments (decisions in src/world/core).
  const leakCanvas = part<HTMLCanvasElement>(root, '[data-threshold-leak]');
  let leak: ThresholdLeak | null = threshold.visible ? new ThresholdLeak(leakCanvas, ThresholdPalette.pick(manifest.works, Math.random), win, tier) : null;
  const gaze = new GazeDirector(webStorage(win, 'sessionStorage'), Math.random);
  const fragments = new FragmentSurfacer(
    new FragmentCatalog(session.stops, manifest.works, manifest.territories),
    new FragmentProgress(webStorage(win, 'localStorage')),
  );
  const whisper = new WorldWhisper(root);
  // The leak (src/leak): drift time and the last work seen, kept locally for the awake pages.
  const leakRecorder = new LeakRecorder(webStorage(win, 'localStorage'), () => Date.now(), win);
  // The sound hears the camera's zone and what is near (decisions in src/sound/core).
  const soundScene = SoundScene.of(session.layout, manifest.works);
  const above = new Vector3();
  const below = new Vector3();
  const projected = new Vector3();
  /** Screen position (NDC) just below a work, or `null` when it is behind the camera. */
  const screenBelow = (slug: string): { x: number; y: number } | null => {
    const mesh = (meshes.get(slug) as ApparitionMesh).mesh;
    below.set(mesh.position.x, mesh.position.y - mesh.scale.y * 0.5 - 0.1, mesh.position.z).project(stage.camera);
    return below.z < 1 ? { x: below.x, y: below.y } : null;
  };
  /** Screen position (NDC) just above a work, or `null` when it is behind the camera. */
  const screenAbove = (slug: string): { x: number; y: number } | null => {
    const mesh = (meshes.get(slug) as ApparitionMesh).mesh;
    above.set(mesh.position.x, mesh.position.y + mesh.scale.y * 0.5 + 0.25, mesh.position.z).project(stage.camera);
    return above.z < 1 ? { x: above.x, y: above.y } : null;
  };

  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const visibleMeshes = () => [...meshes.values()].filter((m) => m.mesh.visible).map((m) => m.mesh);
  const onCanvasClick = (event: MouseEvent) => {
    if (drag.wasDrag() || lensInput.claimedPress()) return;
    const rect = canvas.getBoundingClientRect();
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, stage.camera);
    const hit = raycaster.intersectObjects(visibleMeshes())[0];
    if (hit) open(hit.object.userData.slug as string);
  };

  /** The work under the pointer and where on it, or `null`. */
  const lensPointer = (ndc: { x: number; y: number } | null): LensAim | null => {
    if (!ndc) return null;
    pointer.set(ndc.x, ndc.y);
    raycaster.setFromCamera(pointer, stage.camera);
    const hit = raycaster.intersectObjects(visibleMeshes())[0];
    return hit?.uv ? { slug: hit.object.userData.slug as string, uv: { x: hit.uv.x, y: hit.uv.y } } : null;
  };
  canvas.addEventListener('click', onCanvasClick);

  let frames = 0;
  const debug = import.meta.env.PUBLIC_DRIFT_DEBUG === 'true';
  stage.start((dt) => {
    keys.poll(acc, dt);
    tilt.poll(acc, dt);
    const input = acc.drain();
    // The world holds still while the threshold is up or a work is open in the focus dialog.
    const held = threshold.holding || overlay.isOpen;
    const f = session.frame(held ? { thrust: 0, turn: 0 } : input, dt);
    frames++;
    stage.setPose(f.state);
    stage.setSkyColor(f.sky);
    if (leak && !threshold.visible) {
      leak.dispose();
      leak = null;
    }
    const li = lensInput.state();
    const hovered = held ? null : lensPointer(li.ndc);
    const g = gaze.frame({ hovered, drifting: !held }, dt);
    const turns = new Map(g.turns.map((t) => [t.slug, t]));
    for (const w of f.works) {
      const mesh = meshes.get(w.slug) as ApparitionMesh;
      mesh.setOpacity(w.opacity);
      if (mesh.mesh.visible) mesh.face(f.state.x, f.state.z, turns.get(w.slug) ?? null);
    }
    whisper.gaze(g.lineOpacity, g.lineStarted);
    const fr = fragments.frame({ facing: f.facing, settled: held ? null : f.settled }, dt);
    whisper.fragment(fr.current && { text: fr.current.text, opacity: fr.current.opacity, at: screenAbove(fr.current.slug) }, fr.started !== null);
    const specimen = !held && f.facing ? work(f.facing).specimen : null;
    whisper.specimen(specimen && f.facing ? { label: specimen, at: screenBelow(f.facing) } : null);
    const aim = held ? null : LensUniforms.aimFrom(hovered, li.keyboard, f.facing);
    const lf = lens.frame({ aim, touch: li.touch, unaltered: li.unaltered }, dt, (slug) => meshes.get(slug)?.texture != null);
    if (lf.released) meshes.get(lf.released)?.setLens(null);
    if (lf.announce === 'clear') announcer.clear();
    else if (lf.announce) announcer.announce(lf.announce);
    if (lf.slug && lf.settings) {
      const { modeA, modeB, partner, ...rest } = lf.settings;
      (meshes.get(lf.slug) as ApparitionMesh).setLens({ ...rest, modeA: modeIndex(modeA), modeB: modeIndex(modeB), partner: partner ? (meshes.get(partner)?.texture ?? null) : null });
    }
    sound?.frame(soundScene.read(f.state), dt);
    const activeSlug = f.facing ?? f.nearest;
    const activeDistance = activeSlug ? (f.works.find((w) => w.slug === activeSlug)?.distance ?? f.nearestDistance) : f.nearestDistance;
    metrics.frame(activeSlug, activeDistance, dt);
    leakRecorder.frame(dt, threshold.holding, activeSlug ? { color: work(activeSlug).color, distance: activeDistance } : null);
    if (f.plan) streamer.update(f.plan);
    if (f.settled && !kiosk) win.history.replaceState(win.history.state, '', DeepLink.withWork(win.location.href, f.settled));
    if (f.compass) {
      compass.update(f.compass);
      if (activeSlug) list.setEntry(activeSlug);
    }
    if (debug) {
      stage.camera.updateMatrixWorld();
      (win as unknown as { __driftDebug: DriftDebugState }).__driftDebug = {
        frames,
        tier,
        pose: { x: f.state.x, z: f.state.z, yaw: f.state.yaw },
        facing: f.facing,
        nearest: f.nearest,
        loaded: streamer.loaded,
        works: f.works.map((w) => {
          const mesh = (meshes.get(w.slug) as ApparitionMesh).mesh;
          projected.copy(mesh.position).project(stage.camera);
          return { slug: w.slug, distance: w.distance, opacity: w.opacity, ndc: { x: projected.x, y: projected.y, z: projected.z } };
        }),
        lens: { slug: lf.slug, mode: lf.mode, strength: lf.strength, unaltered: li.unaltered, blend: lf.blend, modes: director.modes },
        threshold: { holding: threshold.holding, visible: threshold.visible, leak: leak !== null },
        gaze: { turns: g.turns, lineOpacity: g.lineOpacity },
        fragment: fr.current && { id: fr.current.id, opacity: fr.current.opacity },
        sound: sound?.debug ?? null,
      };
    }
  });

  /** Last work the exhibition mode drifted to. */
  let kioskStop: string | null = null;
  return {
    advance() {
      if (overlay.isOpen) return;
      kioskStop = session.nextStop(kioskStop);
      if (kioskStop) session.focus(kioskStop);
    },
    restart() {
      overlay.close();
      kioskStop = null;
      session.restart();
    },
    unmount() {
      leak?.dispose();
      whisper.fragment(null, false);
      whisper.gaze(0, false);
      whisper.specimen(null);
      metrics.finish();
      leakRecorder.flush();
      leakRecorder.detach();
      stage.dispose();
      streamer.dispose();
      for (const mesh of meshes.values()) mesh.dispose();
      canvas.removeEventListener('click', onCanvasClick);
      wheel.detach();
      drag.detach();
      keys.detach();
      lensInput.detach();
      tilt.detach();
      list.detach();
      overlay.detach();
    },
  };
}

/**
 * `localStorage` or `sessionStorage`, or `null` when the browser blocks it
 * (fragment progress and the gaze line then last for the page only).
 *
 * @param win - The window.
 * @param kind - Which storage.
 * @returns Storage or `null`.
 */
function webStorage(win: Window, kind: 'localStorage' | 'sessionStorage'): Storage | null {
  try {
    return win[kind];
  } catch (error) {
    console.warn(`[drift] ${kind} is blocked; fragments read and the gaze line are kept for this page only.`, error);
    return null;
  }
}
