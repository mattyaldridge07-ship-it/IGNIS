import { describe, expect, it } from 'vitest';
import { G0, solveNozzleState } from './nozzleSolver';
import type { NozzleParams } from './physicsTypes';

const baseParams: NozzleParams = {
  propMassFlowMgS: 50,
  nozzleEfficiency: 0.9,
};

const B_THROAT = 6;
const B_EXIT = 0.5;

describe('solveNozzleState', () => {
  it('satisfies F = mdot * ve for the returned state', () => {
    const state = solveNozzleState(4, baseParams, B_THROAT, B_EXIT);
    expect(state.thrustN).toBeCloseTo(state.massFlowKgS * state.exhaustVelocityMS, 6);
  });

  it('satisfies Isp = ve / g0', () => {
    const state = solveNozzleState(4, baseParams, B_THROAT, B_EXIT);
    expect(state.specificImpulseS).toBeCloseTo(state.exhaustVelocityMS / G0, 6);
  });

  it('produces zero exhaust velocity and thrust at zero jet power', () => {
    const state = solveNozzleState(0, baseParams, B_THROAT, B_EXIT);
    expect(state.exhaustVelocityMS).toBe(0);
    expect(state.thrustN).toBe(0);
  });

  it('exhaust velocity rises with jet power at fixed mass flow', () => {
    const low = solveNozzleState(1, baseParams, B_THROAT, B_EXIT);
    const high = solveNozzleState(10, baseParams, B_THROAT, B_EXIT);
    expect(high.exhaustVelocityMS).toBeGreaterThan(low.exhaustVelocityMS);
  });

  it('exhaust velocity falls as mass flow rises at fixed jet power (fixed energy spread over more mass)', () => {
    const lowFlow = solveNozzleState(4, { ...baseParams, propMassFlowMgS: 20 }, B_THROAT, B_EXIT);
    const highFlow = solveNozzleState(4, { ...baseParams, propMassFlowMgS: 200 }, B_THROAT, B_EXIT);
    expect(highFlow.exhaustVelocityMS).toBeLessThan(lowFlow.exhaustVelocityMS);
  });

  it('reports the expansion ratio as bThroat/bExit, floored at 1', () => {
    expect(solveNozzleState(4, baseParams, 6, 0.5).expansionRatio).toBeCloseTo(12, 6);
    expect(solveNozzleState(4, baseParams, 0.5, 6).expansionRatio).toBe(1);
  });

  it('keeps conversion efficiency within (0, 1]', () => {
    const state = solveNozzleState(4, baseParams, B_THROAT, B_EXIT);
    expect(state.conversionEfficiency).toBeGreaterThan(0);
    expect(state.conversionEfficiency).toBeLessThanOrEqual(1);
  });

  it('conversion efficiency improves as the expansion ratio grows', () => {
    const poor = solveNozzleState(4, baseParams, 2, 1.8); // Rb ~ 1.1
    const good = solveNozzleState(4, baseParams, 6, 0.1); // Rb = 60
    expect(good.conversionEfficiency).toBeGreaterThan(poor.conversionEfficiency);
  });

  it('approaches the ideal (efficiency=1) energy-conservation limit for very large expansion ratios', () => {
    const jetPowerMW = 4;
    const state = solveNozzleState(jetPowerMW, baseParams, 100, 1e-6);
    const massFlowKgS = baseParams.propMassFlowMgS * 1e-6;
    const idealVe = Math.sqrt((2 * baseParams.nozzleEfficiency * jetPowerMW * 1e6) / massFlowKgS);
    expect(state.exhaustVelocityMS).toBeCloseTo(idealVe, 0);
  });
});
