import { describe, expect, it } from 'vitest';
import {
  biotSavartAxial,
  generateCoilGeometry,
  rebcoCriticalCurrentDensity,
  solveMagneticsState,
} from './magneticsSolver';
import type { MagneticsParams } from './physicsTypes';

const MU0 = 4 * Math.PI * 1e-7;

const baseParams: MagneticsParams = {
  coilCurrentA: 300,
  turnsPerCoil: 200,
  coilRadius: 0.5,
  numCoils: 8,
  coilSpan: 3,
  mirrorThroatRadius: 0.3,
  cryoTempK: 20,
};

describe('biotSavartAxial', () => {
  it('matches the analytic on-axis field of a single loop at its own center: B = mu0*I/(2R)', () => {
    const radius = 0.4;
    const ampereTurns = 5000;
    const b = biotSavartAxial([{ z: 0, radius, currentA: ampereTurns }], 0);
    const expected = (MU0 * ampereTurns) / (2 * radius);
    expect(b).toBeCloseTo(expected, 8);
  });

  it('scales linearly with current (superposition / Biot-Savart linearity)', () => {
    const coil = { z: 0, radius: 0.4, currentA: 1000 };
    const b1 = biotSavartAxial([coil], 0.1);
    const b2 = biotSavartAxial([{ ...coil, currentA: 2000 }], 0.1);
    expect(b2).toBeCloseTo(2 * b1, 8);
  });

  it('falls off with distance from the loop', () => {
    const coil = { z: 0, radius: 0.4, currentA: 1000 };
    const bNear = biotSavartAxial([coil], 0.1);
    const bFar = biotSavartAxial([coil], 1.5);
    expect(bFar).toBeLessThan(bNear);
  });
});

describe('generateCoilGeometry', () => {
  it('produces the requested number of coils spanning the configured coilSpan', () => {
    const coils = generateCoilGeometry(baseParams);
    expect(coils).toHaveLength(baseParams.numCoils);
    expect(Math.min(...coils.map((c) => c.z))).toBeCloseTo(-baseParams.coilSpan / 2, 6);
    expect(Math.max(...coils.map((c) => c.z))).toBeCloseTo(baseParams.coilSpan / 2, 6);
  });

  it('pulls the two end (throat) coils down to the mirror throat radius', () => {
    const coils = generateCoilGeometry(baseParams);
    expect(coils[0].radius).toBeCloseTo(baseParams.mirrorThroatRadius, 10);
    expect(coils[coils.length - 1].radius).toBeCloseTo(baseParams.mirrorThroatRadius, 10);
  });
});

describe('rebcoCriticalCurrentDensity', () => {
  it('decreases as the applied field increases', () => {
    expect(rebcoCriticalCurrentDensity(8, 20)).toBeLessThan(rebcoCriticalCurrentDensity(1, 20));
  });

  it('decreases as operating temperature rises toward Tc', () => {
    expect(rebcoCriticalCurrentDensity(2, 70)).toBeLessThan(rebcoCriticalCurrentDensity(2, 20));
  });

  it('is non-negative even above Tc', () => {
    expect(rebcoCriticalCurrentDensity(2, 150)).toBeGreaterThanOrEqual(0);
  });
});

describe('solveMagneticsState', () => {
  it('yields a mirror ratio >= 1 when throat coils are smaller than center coils', () => {
    const state = solveMagneticsState(baseParams);
    expect(state.mirrorRatio).toBeGreaterThanOrEqual(1);
  });

  it('keeps the loss-cone angle within (0, 90] degrees', () => {
    const state = solveMagneticsState(baseParams);
    expect(state.lossConeAngleDeg).toBeGreaterThan(0);
    expect(state.lossConeAngleDeg).toBeLessThanOrEqual(90);
  });

  it('flags a quench warning once operating current density exceeds the critical density', () => {
    const overdriven = solveMagneticsState({ ...baseParams, coilCurrentA: 2_000_000 });
    expect(overdriven.quenchWarning).toBe(true);
  });

  it('quench margin shrinks monotonically as coil current rises', () => {
    const low = solveMagneticsState({ ...baseParams, coilCurrentA: 100 });
    const high = solveMagneticsState({ ...baseParams, coilCurrentA: 10000 });
    expect(high.quenchMargin).toBeLessThan(low.quenchMargin);
  });
});
