import { describe, it, expect } from 'vitest';
import {
  PERSONA_IDS,
  WAYFINDING_CHECK_IDS,
  VisitorPersonas,
} from '../../src/ux/VisitorPersonas.js';

describe('VisitorPersonas', () => {
  it('models all 7 sociological visitor archetypes in canonical order', () => {
    expect(PERSONA_IDS).toEqual([
      'curator',
      'instagram-mobile',
      'collector',
      'peer-artist',
      'gallery-qr',
      'non-gamer',
      'keyboard-a11y',
    ]);
    expect(VisitorPersonas.ALL.map((p) => p.id)).toEqual([...PERSONA_IDS]);
    expect(WAYFINDING_CHECK_IDS).toEqual([
      'globalDriftEntry',
      'reversibleWorksFilter',
      'workBreadcrumbAndContext',
      'territoryContinuity',
      'awakeWakeContinuity',
      'driftGuidedStepping',
      'tactileLensControl',
      'focusInPlaceBrowsing',
    ]);
  });

  it('retrieves personas by id and filters by pointer kind', () => {
    const curator = VisitorPersonas.byId('curator');
    expect(curator.locales).toEqual(['fr']);
    expect(curator.formFactor).toBe('desktop');
    expect(curator.pointerKind).toBe('fine');
    expect(curator.primaryViewport).toEqual({ width: 1440, height: 900, label: 'Desktop 1440×900' });

    const mobile = VisitorPersonas.byId('instagram-mobile');
    expect(mobile.locales).toEqual(['en', 'fr']);
    expect(mobile.formFactor).toBe('mobile');
    expect(mobile.pointerKind).toBe('coarse');
    expect(mobile.primaryViewport).toEqual({ width: 390, height: 844, label: 'iPhone 390×844' });

    const collector = VisitorPersonas.byId('collector');
    expect(collector.formFactor).toBe('tablet');
    expect(collector.pointerKind).toBe('coarse');
    expect(collector.primaryViewport).toEqual({ width: 820, height: 1180, label: 'Tablet 820×1180' });

    const coarseIds = VisitorPersonas.forPointer('coarse').map((p) => p.id);
    const fineIds = VisitorPersonas.forPointer('fine').map((p) => p.id);
    expect(coarseIds).toEqual(['instagram-mobile', 'collector', 'gallery-qr']);
    expect(fineIds).toEqual(['curator', 'peer-artist', 'non-gamer', 'keyboard-a11y']);
  });

  it('maintains strictly positive ergonomic and wayfinding weights summing to 100 for every persona', () => {
    for (const persona of VisitorPersonas.ALL) {
      expect(persona.title.length).toBeGreaterThan(5);
      expect(persona.sociologicalSummary.length).toBeGreaterThan(20);
      expect(persona.primaryGoals.length).toBeGreaterThanOrEqual(3);
      expect(persona.secondaryViewports.length).toBeGreaterThanOrEqual(1);
      expect(persona.ergonomicWeights.hudCollisionFree).toBeGreaterThan(0);
      expect(persona.ergonomicWeights.viewportClearance).toBeGreaterThan(0);
      expect(persona.ergonomicWeights.touchTargetComfort).toBeGreaterThan(0);
      for (const checkId of WAYFINDING_CHECK_IDS) {
        expect(persona.wayfindingWeights[checkId]).toBeGreaterThan(0);
      }
      expect(VisitorPersonas.totalWeight(persona)).toBe(100);
    }
  });

  it('encodes distinct sociological wayfinding priorities across visitor profiles', () => {
    const curator = VisitorPersonas.byId('curator');
    const peerArtist = VisitorPersonas.byId('peer-artist');
    const nonGamer = VisitorPersonas.byId('non-gamer');
    const galleryQr = VisitorPersonas.byId('gallery-qr');
    const keyboardA11y = VisitorPersonas.byId('keyboard-a11y');

    expect(curator.wayfindingWeights.reversibleWorksFilter).toBeGreaterThan(
      curator.wayfindingWeights.tactileLensControl,
    );
    expect(peerArtist.wayfindingWeights.tactileLensControl).toBeGreaterThan(
      curator.wayfindingWeights.tactileLensControl,
    );
    expect(nonGamer.wayfindingWeights.driftGuidedStepping).toBeGreaterThan(
      curator.wayfindingWeights.driftGuidedStepping,
    );
    expect(galleryQr.wayfindingWeights.awakeWakeContinuity).toBeGreaterThan(
      peerArtist.wayfindingWeights.awakeWakeContinuity,
    );
    expect(keyboardA11y.wayfindingWeights.awakeWakeContinuity).toBeGreaterThan(
      keyboardA11y.wayfindingWeights.tactileLensControl,
    );
  });
});
