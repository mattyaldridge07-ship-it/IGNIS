import { describe, expect, it } from 'vitest';
import {
  bohmDiffusivity,
  burnupFraction,
  electronDensityAndZeff,
  energyConfinementTimeS,
  peakingFactorLinear,
  peakingFactorQuadratic,
  plasmaBeta,
  reactivity,
  solvePlasmaState,
} from './plasmaSolver';
import type { PlasmaParams } from './physicsTypes';

const baseParams: PlasmaParams = {
  fuel: 'D-T',
  ionTempKeV: 20,
  coreDensity: 3e20,
  coreRadius: 0.35,
  coreLength: 2.4,
  profileAlpha: 1.2,
  wallReflectivity: 0.9,
  rfPowerMW: 2,
  trapEfficiency: 0.85,
  nozzleEfficiency: 0.9,
};

describe('reactivity (Bosch-Hale)', () => {
  it('is positive and finite across the valid temperature range', () => {
    for (const t of [1, 10, 30, 60, 100]) {
      expect(reactivity(t, 'D-T')).toBeGreaterThan(0);
      expect(Number.isFinite(reactivity(t, 'D-T'))).toBe(true);
    }
  });

  it('increases with temperature below the D-T reactivity peak (~64 keV)', () => {
    const low = reactivity(5, 'D-T');
    const mid = reactivity(20, 'D-T');
    const high = reactivity(45, 'D-T');
    expect(mid).toBeGreaterThan(low);
    expect(high).toBeGreaterThan(mid);
  });

  it('D-T reactivity exceeds D-3He at low-to-moderate temperature (D-T ignites far more easily)', () => {
    for (const t of [10, 20, 40, 60]) {
      expect(reactivity(t, 'D-T')).toBeGreaterThan(reactivity(t, 'D-3He'));
    }
  });
});

describe('density profile peaking factors', () => {
  it('match the closed-form values for a flat profile (alpha = 0)', () => {
    expect(peakingFactorQuadratic(0)).toBeCloseTo(0.5, 10);
    expect(peakingFactorLinear(0)).toBeCloseTo(2 / Math.PI, 10);
  });

  it('decrease as the profile becomes more peaked (larger alpha)', () => {
    expect(peakingFactorQuadratic(3)).toBeLessThan(peakingFactorQuadratic(0.5));
    expect(peakingFactorLinear(3)).toBeLessThan(peakingFactorLinear(0.5));
  });
});

describe('electronDensityAndZeff', () => {
  it('gives Zeff = 1 for a D-T mix (both species singly charged)', () => {
    const { zEff } = electronDensityAndZeff(1e20, 'D-T');
    expect(zEff).toBeCloseTo(1, 10);
  });

  it('gives Zeff = 5/3 for a 50/50 D-3He mix (Z=1 and Z=2)', () => {
    const { zEff } = electronDensityAndZeff(1e20, 'D-3He');
    expect(zEff).toBeCloseTo(5 / 3, 10);
  });
});

describe('solvePlasmaState', () => {
  it('produces finite, non-negative fusion and loss powers', () => {
    const state = solvePlasmaState(baseParams, 4);
    expect(state.fusionPowerMW).toBeGreaterThan(0);
    expect(state.bremsstrahlungLossMW).toBeGreaterThan(0);
    expect(state.synchrotronLossMW).toBeGreaterThan(0);
    expect(Number.isFinite(state.netJetPowerMW)).toBe(true);
  });

  it('splits fusion power into charged + neutron fractions that sum back to the total', () => {
    const state = solvePlasmaState(baseParams, 4);
    expect(state.fusionPowerChargedMW + state.fusionPowerNeutronMW).toBeCloseTo(state.fusionPowerMW, 6);
  });

  it('net jet power falls as the magnetic field (and thus synchrotron loss) rises', () => {
    const lowB = solvePlasmaState(baseParams, 2);
    const highB = solvePlasmaState(baseParams, 8);
    expect(highB.synchrotronLossMW).toBeGreaterThan(lowB.synchrotronLossMW);
    expect(highB.netJetPowerMW).toBeLessThan(lowB.netJetPowerMW);
  });
});

describe('plasmaBeta', () => {
  it('is zero when there is no confining field', () => {
    expect(plasmaBeta(1e20, 20, 0)).toBe(0);
  });

  it('falls as the magnetic field strengthens at fixed plasma pressure', () => {
    expect(plasmaBeta(1e20, 20, 6)).toBeLessThan(plasmaBeta(1e20, 20, 2));
  });
});

describe('gyro-Bohm confinement scaling', () => {
  it('diffusivity falls as the field strengthens (better magnetic confinement)', () => {
    expect(bohmDiffusivity(20, 6)).toBeLessThan(bohmDiffusivity(20, 2));
  });

  it('confinement time grows with field and as the cube of core radius (gyro-Bohm: tau_E = a^3 / (D_Bohm rho_i))', () => {
    expect(energyConfinementTimeS(0.35, 20, 6, 'D-T')).toBeGreaterThan(energyConfinementTimeS(0.35, 20, 2, 'D-T'));
    expect(energyConfinementTimeS(0.7, 20, 4, 'D-T')).toBeCloseTo(8 * energyConfinementTimeS(0.35, 20, 4, 'D-T'), 6);
  });
});

describe('burnupFraction', () => {
  it('stays within [0, 1) and grows with confinement quality (n * sigmaV * tau)', () => {
    const low = burnupFraction(1e20, 1e-22, 0.01);
    const high = burnupFraction(1e20, 1e-22, 10);
    expect(low).toBeGreaterThanOrEqual(0);
    expect(high).toBeLessThan(1);
    expect(high).toBeGreaterThan(low);
  });

  it('approaches 1 for very large n*sigmaV*tau', () => {
    expect(burnupFraction(1e21, 1e-21, 1000)).toBeGreaterThan(0.99);
  });
});

describe('solvePlasmaState transport/ignition additions', () => {
  it('produces a positive, finite transport loss and confinement time', () => {
    const state = solvePlasmaState(baseParams, 4);
    expect(state.transportLossMW).toBeGreaterThan(0);
    expect(state.energyConfinementTimeS).toBeGreaterThan(0);
    expect(Number.isFinite(state.energyConfinementTimeS)).toBe(true);
  });

  it('keeps burn-up fraction within [0, 1)', () => {
    const state = solvePlasmaState(baseParams, 4);
    expect(state.burnupFraction).toBeGreaterThanOrEqual(0);
    expect(state.burnupFraction).toBeLessThan(1);
  });

  it('reports a positive ignition margin factor', () => {
    const state = solvePlasmaState(baseParams, 4);
    expect(state.ignitionMarginFactor).toBeGreaterThan(0);
  });

  it('net jet power is the simple radiative-loss power balance, NOT double-counting transport loss', () => {
    // transportLossW is a confinement-consistency diagnostic (feeds ignitionMarginFactor),
    // not a second energy source - by conservation of energy, whatever heating isn't
    // radiated away already exits as usable exhaust power.
    const state = solvePlasmaState(baseParams, 4);
    const expected =
      baseParams.trapEfficiency * (state.fusionPowerChargedMW + baseParams.rfPowerMW) -
      state.bremsstrahlungLossMW -
      state.synchrotronLossMW;
    expect(state.netJetPowerMW).toBeCloseTo(expected, 6);
  });

  it('ignition margin stays a well-defined, bounded ratio even when confinement is extremely poor', () => {
    // A tiny core radius drives tau_E toward zero (gyro-Bohm ~ a^3), which would
    // blow up an additive transport-power term but must stay a sane ratio here.
    const state = solvePlasmaState({ ...baseParams, coreRadius: 0.02 }, 1);
    expect(Number.isFinite(state.ignitionMarginFactor)).toBe(true);
    expect(state.ignitionMarginFactor).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(state.netJetPowerMW)).toBe(true);
  });
});
