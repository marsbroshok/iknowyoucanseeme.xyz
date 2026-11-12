import { Raycaster, Vector2, type Texture } from 'three';
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
import { modeIndex, type LensMode } from '../core/LensMode.js';
import type { MountOptions, WorldHandle } from '../island/DriftBoot.js';
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
  lens: { slug: string | null; mode: LensMode | null; strength: number; unaltered: boolean; blend: LensBlend | null; modes: readonly LensMode[] };
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
 * pointer; decisions by LensDirector, LensUniforms and LensCrossfade), all
 * driven frame by frame by a {@link DriftSession}.
 *
 * Verified in the browser (ADR 0006).
 *
 * @param root - The `[data-drift]` layer.
 * @param options - Manifest, tier, deep link and window.
 * @returns Handle to unmount the world.
 * @throws Error when the page lacks a part of the layer or WebGL2 fails.
 */
export async function mountWorld(root: HTMLElement, options: MountOptions): Promise<WorldHandle> {
  const { manifest, tier, startSlug, win } = options;
  const canvas = part<HTMLCanvasElement>(root, '[data-drift-canvas]');
  const stage = new WorldStage(canvas, tier, win.devicePixelRatio);
  const session = new DriftSession(manifest, tier, startSlug);
  const work = (slug: string) => session.work(slug) as NonNullable<ReturnType<DriftSession['work']>>;

  const meshes = new Map<string, ApparitionMesh>();
  for (const p of session.layout.placements) {
    const w = work(p.slug);
    const mesh = new ApparitionMesh(p.slug, p, w.images.low.width / w.images.low.height, w.color, tier);
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

  const overlay = new FocusOverlay(part<HTMLDialogElement>(root, '[data-drift-focus]'));
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
    // The world holds still while a work is open in the focus dialog.
    const f = session.frame(overlay.isOpen ? { thrust: 0, turn: 0 } : input, dt);
    frames++;
    stage.setPose(f.state);
    stage.setSkyColor(f.sky);
    for (const w of f.works) {
      const mesh = meshes.get(w.slug) as ApparitionMesh;
      mesh.setOpacity(w.opacity);
      if (mesh.mesh.visible) mesh.face(f.state.x, f.state.z);
    }
    const li = lensInput.state();
    const aim = overlay.isOpen ? null : LensUniforms.aimFrom(lensPointer(li.ndc), li.keyboard, f.facing);
    const lf = lens.frame({ aim, touch: li.touch, unaltered: li.unaltered }, dt, (slug) => meshes.get(slug)?.texture != null);
    if (lf.released) meshes.get(lf.released)?.setLens(null);
    if (lf.announce === 'clear') announcer.clear();
    else if (lf.announce) announcer.announce(lf.announce);
    if (lf.slug && lf.settings) {
      const { modeA, modeB, partner, ...rest } = lf.settings;
      (meshes.get(lf.slug) as ApparitionMesh).setLens({ ...rest, modeA: modeIndex(modeA), modeB: modeIndex(modeB), partner: partner ? (meshes.get(partner)?.texture ?? null) : null });
    }
    metrics.frame(f.nearest, f.nearestDistance, dt);
    if (f.plan) streamer.update(f.plan);
    if (f.settled) win.history.replaceState(win.history.state, '', DeepLink.withWork(win.location.href, f.settled));
    if (f.compass) {
      compass.update(f.compass);
      if (f.nearest) list.setEntry(f.nearest);
    }
    if (debug) {
      (win as unknown as { __driftDebug: DriftDebugState }).__driftDebug = {
        frames,
        tier,
        pose: { x: f.state.x, z: f.state.z, yaw: f.state.yaw },
        facing: f.facing,
        nearest: f.nearest,
        loaded: streamer.loaded,
        lens: { slug: lf.slug, mode: lf.mode, strength: lf.strength, unaltered: li.unaltered, blend: lf.blend, modes: director.modes },
      };
    }
  });

  return {
    unmount() {
      metrics.finish();
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
