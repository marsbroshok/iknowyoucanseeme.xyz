import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { DeviceProfile, type DeviceCapabilities } from '../../../src/world/core/DeviceProfile.js';

/** A capable 2020+ laptop: everything the world needs. */
const laptop: DeviceCapabilities = {
  webgl2: true,
  reducedMotion: false,
  saveData: false,
  deviceMemory: 8,
  hardwareConcurrency: 8,
  coarsePointer: false,
};

describe('DeviceProfile.decide', () => {
  it('gives a capable laptop the world in the high tier', () => {
    expect(DeviceProfile.decide(laptop, null)).toEqual({ mode: 'world', automatic: 'world', tier: 'high', reasons: [] });
  });

  it.each([
    [{ webgl2: false }, 'no-webgl2'],
    [{ saveData: true }, 'save-data'],
    [{ deviceMemory: 2 }, 'low-memory'],
    [{ hardwareConcurrency: 2 }, 'few-cores'],
  ] as const)('keeps the awake layer when %o (%s)', (change, reason) => {
    const decision = DeviceProfile.decide({ ...laptop, ...change }, null);
    expect(decision.mode).toBe('awake');
    expect(decision.automatic).toBe('awake');
    expect(decision.reasons).toEqual([reason]);
  });

  it('lists every reason, in a stable order', () => {
    const decision = DeviceProfile.decide(
      { webgl2: false, reducedMotion: true, saveData: true, deviceMemory: 1, hardwareConcurrency: 1, coarsePointer: true },
      null,
    );
    expect(decision.reasons).toEqual(['no-webgl2', 'save-data', 'low-memory', 'few-cores']);
  });

  it('gives a capable device with reduced motion the world (ADR 0009: Wake up is the opt-out)', () => {
    expect(DeviceProfile.decide({ ...laptop, reducedMotion: true }, null)).toEqual({ mode: 'world', automatic: 'world', tier: 'high', reasons: [] });
  });

  it('accepts exactly 4 GB and 4 cores (the thresholds are inclusive)', () => {
    const decision = DeviceProfile.decide({ ...laptop, deviceMemory: 4, hardwareConcurrency: 4 }, null);
    expect(decision.mode).toBe('world');
    expect(decision.tier).toBe('low');
  });

  it('does not hold unknown memory or core counts against the device (Safari and Firefox hide them)', () => {
    const decision = DeviceProfile.decide({ ...laptop, deviceMemory: undefined, hardwareConcurrency: undefined }, null);
    expect(decision.mode).toBe('world');
    expect(decision.tier).toBe('high');
  });

  it('puts phones (coarse pointer) in the low tier', () => {
    expect(DeviceProfile.decide({ ...laptop, coarsePointer: true }, null).tier).toBe('low');
  });

  it('honours the "Wake up" override on a capable device', () => {
    expect(DeviceProfile.decide(laptop, 'awake')).toEqual({ mode: 'awake', automatic: 'world', tier: 'high', reasons: ['override'] });
  });

  it('honours the "Drift" override on a device that would get the awake layer automatically', () => {
    const decision = DeviceProfile.decide({ ...laptop, saveData: true }, 'world');
    expect(decision).toEqual({ mode: 'world', automatic: 'awake', tier: 'low', reasons: [] });
  });

  it('never forces the world without WebGL2, even with the "Drift" override', () => {
    const decision = DeviceProfile.decide({ ...laptop, webgl2: false }, 'world');
    expect(decision.mode).toBe('awake');
    expect(decision.reasons).toEqual(['no-webgl2']);
  });

  const capabilities = fc.record({
    webgl2: fc.boolean(),
    reducedMotion: fc.boolean(),
    saveData: fc.boolean(),
    deviceMemory: fc.option(fc.constantFrom(0.25, 0.5, 1, 2, 4, 8, 16), { nil: undefined }),
    hardwareConcurrency: fc.option(fc.integer({ min: 1, max: 64 }), { nil: undefined }),
    coarsePointer: fc.boolean(),
  });
  const override = fc.constantFrom('world' as const, 'awake' as const, null);

  it('property: the world needs WebGL2, whatever the override', () => {
    fc.assert(
      fc.property(capabilities, override, (caps, o) => {
        if (!caps.webgl2) expect(DeviceProfile.decide(caps, o).mode).toBe('awake');
      }),
    );
  });

  it('property: without override the mode is the automatic one, and "world" exactly when there is no reason against it', () => {
    fc.assert(
      fc.property(capabilities, (caps) => {
        const d = DeviceProfile.decide(caps, null);
        expect(d.mode).toBe(d.automatic);
        expect(d.mode === 'world').toBe(d.reasons.length === 0);
      }),
    );
  });

  it('property: reduced motion never changes the decision, whatever the device and override', () => {
    fc.assert(
      fc.property(capabilities, override, (caps, o) => {
        expect(DeviceProfile.decide({ ...caps, reducedMotion: true }, o)).toEqual(DeviceProfile.decide({ ...caps, reducedMotion: false }, o));
      }),
    );
  });

  it('property: Save-Data, < 4 GB or < 4 cores never get the world automatically', () => {
    fc.assert(
      fc.property(capabilities, (caps) => {
        const weak =
          caps.saveData ||
          (caps.deviceMemory !== undefined && caps.deviceMemory < 4) ||
          (caps.hardwareConcurrency !== undefined && caps.hardwareConcurrency < 4);
        if (weak) expect(DeviceProfile.decide(caps, null).automatic).toBe('awake');
      }),
    );
  });

  it('property: the "Wake up" override always gives the awake layer', () => {
    fc.assert(
      fc.property(capabilities, (caps) => {
        expect(DeviceProfile.decide(caps, 'awake').mode).toBe('awake');
      }),
    );
  });

  describe('canAutoEnterDeepLink', () => {
    it('allows deep-link auto-entry on WebGL2 devices without Save-Data, even with < 4 GB memory or < 4 cores', () => {
      expect(DeviceProfile.canAutoEnterDeepLink(laptop)).toBe(true);
      expect(DeviceProfile.canAutoEnterDeepLink({ ...laptop, deviceMemory: 2, hardwareConcurrency: 2, coarsePointer: true })).toBe(true);
      expect(DeviceProfile.canAutoEnterDeepLink({ ...laptop, saveData: true })).toBe(false);
      expect(DeviceProfile.canAutoEnterDeepLink({ ...laptop, webgl2: false })).toBe(false);
    });

    it('property: requires WebGL2 and Save-Data off, and implies decide(caps, "world").mode === "world"', () => {
      fc.assert(
        fc.property(capabilities, (caps) => {
          const allowed = DeviceProfile.canAutoEnterDeepLink(caps);
          expect(allowed).toBe(caps.webgl2 && !caps.saveData);
          if (allowed) expect(DeviceProfile.decide(caps, 'world').mode).toBe('world');
        }),
      );
    });
  });
});
