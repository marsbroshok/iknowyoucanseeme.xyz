import type { DriftInput } from './DriftController.js';

/**
 * Collects drift impulses from event-driven inputs (wheel, drag) between
 * two frames; the frame loop drains them into `DriftController.step`.
 */
export class InputAccumulator {
  private thrust = 0;
  private turn = 0;

  /**
   * Adds an impulse.
   *
   * @param input - Impulse to add.
   */
  add(input: DriftInput): void {
    this.thrust += input.thrust;
    this.turn += input.turn;
  }

  /**
   * Returns everything added since the last drain and resets.
   *
   * @returns Summed impulse.
   */
  drain(): DriftInput {
    const out = { thrust: this.thrust, turn: this.turn };
    this.thrust = 0;
    this.turn = 0;
    return out;
  }
}
