import { describe, expect, it } from 'vitest';
import { G0, solveNozzleState } from './nozzleSolver';
import type { NozzleParams } from './physicsTypes';

const baseParams: NozzleParams = {
  propMassFlowMgS: 50,
  nozzleEfficiency: 0.9,
};

describe('solveNozzleState', () => {
  it('satisfies F = mdot * ve for the returned state', () => {
    const state = solveNozzleState(4, baseParams);
    expect(state.thrustN).toBeCloseTo(state.massFlowKgS * state.exhaustVelocityMS, 6);
  });

  it('satisfies Isp = ve / g0', () => {
    const state = solveNozzleState(4, baseParams);
    expect(state.specificImpulseS).toBeCloseTo(state.exhaustVelocityMS / G0, 6);
  });

  it('produces zero exhaust velocity and thrust at zero jet power', () => {
    const state = solveNozzleState(0, baseParams);
    expect(state.exhaustVelocityMS).toBe(0);
    expect(state.thrustN).toBe(0);
  });

  it('exhaust velocity rises with jet power at fixed mass flow', () => {
    const low = solveNozzleState(1, baseParams);
    const high = solveNozzleState(10, baseParams);
    expect(high.exhaustVelocityMS).toBeGreaterThan(low.exhaustVelocityMS);
  });

  it('exhaust velocity falls as mass flow rises at fixed jet power (fixed energy spread over more mass)', () => {
    const lowFlow = solveNozzleState(4, { ...baseParams, propMassFlowMgS: 20 });
    const highFlow = solveNozzleState(4, { ...baseParams, propMassFlowMgS: 200 });
    expect(highFlow.exhaustVelocityMS).toBeLessThan(lowFlow.exhaustVelocityMS);
  });
});
