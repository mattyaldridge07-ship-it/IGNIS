import type { NozzleParams, NozzleState } from './physicsTypes';

export const G0 = 9.80665;

export function solveNozzleState(netJetPowerMW: number, params: NozzleParams): NozzleState {
  const massFlowKgS = Math.max(params.propMassFlowMgS * 1e-6, 1e-9);
  const jetPowerW = Math.max(netJetPowerMW * 1e6, 0);

  const exhaustVelocityMS = Math.sqrt((2 * params.nozzleEfficiency * jetPowerW) / massFlowKgS);
  const specificImpulseS = exhaustVelocityMS / G0;
  const thrustN = massFlowKgS * exhaustVelocityMS;
  const thrustPowerMW = (0.5 * massFlowKgS * exhaustVelocityMS * exhaustVelocityMS) / 1e6;

  return {
    massFlowKgS,
    exhaustVelocityMS,
    specificImpulseS,
    thrustN,
    thrustPowerMW,
  };
}
