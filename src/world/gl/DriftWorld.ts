import { Raycaster, Vector2, type Texture } from 'three';
import { DriftSession } from '../core/DriftSession.js';
import { DeepLink } from '../core/DeepLink.js';
import { InputAccumulator } from '../core/InputAccumulator.js';
import { TIER_BUDGETS } from '../core/TextureBudget.js';
import { CAMERA } from '../core/StageSettings.js';
import { TextureStreamer } from '../stream/TextureStreamer.js';
import { HorizonCompass } from '../island/HorizonCompass.js';
import { WorkList } from '../island/WorkList.js';
import { TiltControl } from '../island/TiltControl.js';
import { WheelInput } from '../island/input/WheelInput.js';
import { PointerDragInput } from '../island/input/PointerDragInput.js';
import { KeyboardInput } from '../island/input/KeyboardInput.js';
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
 * apparition per work, texture streaming, inputs, compass and the keyboard
 * work list, all driven frame by frame by a {@link DriftSession}.
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
    const mesh = new ApparitionMesh(p.slug, p, w.images.low.width / w.images.low.height, w.color);
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

  const open = (slug: string) => win.location.assign(work(slug).href);
  const list = new WorkList(part<HTMLUListElement>(root, '[data-drift-works]'), session.stops.map((s) => ({ slug: s.slug, title: work(s.slug).title })), {
    onFocus: (slug) => session.focus(slug),
    onOpen: open,
    next: (current, direction) => session.cycle(current, direction),
    isLast: (slug, direction) => session.isLast(slug, direction),
  });

  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const onCanvasClick = (event: MouseEvent) => {
    if (drag.wasDrag()) return;
    const rect = canvas.getBoundingClientRect();
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, stage.camera);
    const hit = raycaster.intersectObjects([...meshes.values()].filter((m) => m.mesh.visible).map((m) => m.mesh))[0];
    if (hit) open(hit.object.userData.slug as string);
  };
  canvas.addEventListener('click', onCanvasClick);

  let frames = 0;
  const debug = import.meta.env.PUBLIC_DRIFT_DEBUG === 'true';
  stage.start((dt) => {
    keys.poll(acc, dt);
    tilt.poll(acc, dt);
    const f = session.frame(acc.drain(), dt);
    frames++;
    stage.setPose(f.state);
    stage.setSkyColor(f.sky);
    for (const w of f.works) {
      const mesh = meshes.get(w.slug) as ApparitionMesh;
      mesh.setOpacity(w.opacity);
      if (mesh.mesh.visible) mesh.face(f.state.x, f.state.z);
    }
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
      };
    }
  });

  return {
    unmount() {
      stage.dispose();
      streamer.dispose();
      for (const mesh of meshes.values()) mesh.dispose();
      canvas.removeEventListener('click', onCanvasClick);
      wheel.detach();
      drag.detach();
      keys.detach();
      tilt.detach();
      list.detach();
    },
  };
}
