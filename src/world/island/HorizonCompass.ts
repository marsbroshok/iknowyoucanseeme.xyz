import type { CompassReading } from '../core/CompassBearing.js';
import type { Region } from '../core/FieldLayout.js';
import { ZoneAtmosphere } from '../core/ZoneAtmosphere.js';

/** Display names of territories and zones in the page language. */
export interface CompassLabels {
  territories: Readonly<Record<string, string>>;
  zones: Readonly<Record<string, string>>;
}

/** Horizontal room used by markers on the horizon line (fraction of width, each side of centre). */
const SPREAD = 0.46;
/** Markers closer than this (fraction of width) go on separate rows. */
const MIN_GAP = 0.2;

/**
 * Segmented zone progression bar and directional horizon line of the world
 * (FR4, "never truly lost"):
 * 1. Polite live region (`.drift-compass-here`) announcing region changes once
 *    per crossing for screen-reader visitors.
 * 2. Directional horizon line (`.drift-horizon`) placing non-current regions
 *    by camera bearing (`‹ …` / `… ›` when outside the field of view).
 * 3. Interactive progression strip (`.drift-zones`) rendering every region as a
 *    `<button type="button" data-zone-pill>` tinted by its {@link ZoneAtmosphere}
 *    accent, highlighting the active zone pill and allowing visitors to jump
 *    cleanly to any zone or territory.
 */
export class HorizonCompass {
  private readonly root: HTMLElement;
  private readonly here: HTMLElement;
  private readonly markers = new Map<Region, { element: HTMLElement; label: string }>();
  private readonly pills = new Map<Region, { button: HTMLButtonElement; onClick: () => void }>();
  private currentLabel = '';

  /**
   * @param root - Empty container rendered by the page (`[data-drift-compass]`).
   * @param regions - Regions of the field in progression order.
   * @param labels - Localized territory and zone names.
   * @param halfFov - Half the horizontal field of view (radians).
   * @param onSelect - Optional callback invoked when a visitor clicks a region pill.
   * @throws Error when a region has no label.
   */
  constructor(
    root: HTMLElement,
    regions: readonly Region[],
    private readonly labels: CompassLabels,
    private readonly halfFov: number,
    private readonly onSelect?: (region: Region) => void,
  ) {
    this.root = root;
    const doc = root.ownerDocument;
    this.here = doc.createElement('p');
    this.here.className = 'drift-compass-here';
    this.here.setAttribute('aria-live', 'polite');

    const line = doc.createElement('div');
    line.className = 'drift-horizon';
    line.setAttribute('aria-hidden', 'true');

    const strip = doc.createElement('div');
    strip.className = 'drift-zones';
    const groupLabel = root.dataset.zonesLabel;
    if (groupLabel) {
      strip.setAttribute('role', 'group');
      strip.setAttribute('aria-label', groupLabel);
    }

    for (const region of regions) {
      const label = this.nameOf(region);
      const element = doc.createElement('span');
      element.className = 'drift-marker';
      element.hidden = true;
      element.textContent = label;
      line.append(element);
      this.markers.set(region, { element, label });

      const button = doc.createElement('button');
      button.type = 'button';
      button.className = 'drift-zone-pill';
      button.dataset.zonePill = '';
      button.dataset.territory = region.territory;
      button.dataset.zone = region.zone ?? '';
      button.dataset.active = 'false';
      button.style.setProperty('--zone-accent', ZoneAtmosphere.forRegion(region).accent);
      button.textContent = label;
      const onClick = () => this.onSelect?.(region);
      button.addEventListener('click', onClick);
      strip.append(button);
      this.pills.set(region, { button, onClick });
    }
    root.replaceChildren(this.here, line, strip);
  }

  /**
   * Shows a compass reading across the live announcer, horizon line, and zone pills.
   *
   * @param reading - Output of `CompassBearing.read`.
   */
  update(reading: CompassReading): void {
    const label = reading.current ? this.labelOf(reading.current) : '';
    if (label !== this.currentLabel) {
      this.currentLabel = label;
      this.here.textContent = label;
    }
    for (const [region, marker] of this.markers) marker.element.hidden = region === reading.current;
    for (const [region, { button }] of this.pills) {
      const active = region === reading.current;
      button.dataset.active = String(active);
      if (active) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    }
    const rows: number[][] = [];
    for (const { region, bearing } of [...reading.others].sort((a, b) => a.distance - b.distance)) {
      const { element, label: name } = this.markers.get(region) as { element: HTMLElement; label: string };
      const side = bearing > this.halfFov ? 'right' : bearing < -this.halfFov ? 'left' : 'ahead';
      const x = 0.5 + SPREAD * Math.min(Math.max(bearing / this.halfFov, -1), 1);
      let row = rows.findIndex((taken) => taken.every((other) => Math.abs(other - x) >= MIN_GAP));
      if (row < 0) row = rows.push([]) - 1;
      rows[row].push(x);
      element.dataset.side = side;
      element.style.setProperty('--x', x.toFixed(3));
      element.style.setProperty('--row', String(row));
      element.textContent = side === 'right' ? `${name} ›` : side === 'left' ? `‹ ${name}` : name;
    }
  }

  /** Removes pill click listeners and clears the compass container. */
  detach(): void {
    for (const { button, onClick } of this.pills.values()) button.removeEventListener('click', onClick);
    this.pills.clear();
    this.markers.clear();
    this.root.replaceChildren();
  }

  /**
   * "Territory · Zone", or the territory alone for zone-less regions.
   *
   * @param region - Region.
   * @returns Label.
   */
  private labelOf(region: Region): string {
    return (this.markers.get(region) as { label: string }).label;
  }

  /**
   * Builds a region's name from the labels.
   *
   * @param region - Region.
   * @returns Name in the page language.
   * @throws Error when a territory or zone label is missing.
   */
  private nameOf(region: Region): string {
    const territory = this.labels.territories[region.territory];
    if (!territory) throw new Error(`[HorizonCompass] No label for territory "${region.territory}"`);
    if (region.zone === null) return territory;
    const zone = this.labels.zones[region.zone];
    if (!zone) throw new Error(`[HorizonCompass] No label for zone "${region.zone}"`);
    return `${territory} · ${zone}`;
  }
}
