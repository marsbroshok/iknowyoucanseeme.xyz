import type { CompassReading } from '../core/CompassBearing.js';
import type { Region } from '../core/FieldLayout.js';

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
 * The faint horizon line of the world (FR4, "never truly lost"): the name
 * of the zone or territory the visitor is in, and a marker for every other
 * region placed along the line by its direction. Regions outside the view
 * are pinned to the nearer edge with an arrow; markers that would overlap
 * are stacked on rows below the line, the nearest region on top.
 *
 * The current name sits in a polite live region and only changes when the
 * visitor crosses into another region, so screen readers are not flooded.
 */
export class HorizonCompass {
  private readonly here: HTMLElement;
  private readonly markers = new Map<Region, { element: HTMLElement; label: string }>();
  private currentLabel = '';

  /**
   * @param root - Empty container rendered by the page.
   * @param regions - Regions of the field.
   * @param labels - Names in the page language.
   * @param halfFov - Half the horizontal field of view (radians).
   * @throws Error when a region has no label.
   */
  constructor(
    root: HTMLElement,
    regions: readonly Region[],
    private readonly labels: CompassLabels,
    private readonly halfFov: number,
  ) {
    const doc = root.ownerDocument;
    this.here = doc.createElement('p');
    this.here.className = 'drift-compass-here';
    this.here.setAttribute('aria-live', 'polite');
    const line = doc.createElement('div');
    line.className = 'drift-horizon';
    for (const region of regions) {
      const element = doc.createElement('span');
      element.className = 'drift-marker';
      element.hidden = true;
      element.textContent = this.nameOf(region);
      line.append(element);
      this.markers.set(region, { element, label: element.textContent });
    }
    root.replaceChildren(this.here, line);
  }

  /**
   * Shows a compass reading.
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
