import type { NozzleParams, NozzleState } from './physicsTypes';

export const G0 = 9.80665;

/**
 * Fraction of the throat's thermal energy assumed isotropic (perpendicular)
 * versus already-directed (parallel) at nozzle entry, for a near-Maxwellian
 * source distribution. Only the perpendicular share is convertible by the
 * magnetic-mirror nozzle effect.
 */
const ISOTROPIC_FRACTION = 0.5;

/**
 * Adiabatic magnetic-nozzle expansion model.
 *
 * A magnetic nozzle accelerates plasma not by a physical converging-diverging
 * duct but by conserving the first adiabatic invariant mu = m*v_perp^2 / (2B)
 * as the plasma flows from the high-field throat to the low-field exit: as B
 * falls, v_perp^2 falls proportionally (mu = const), and that lost
 * perpendicular thermal energy is converted into directed (parallel) kinetic
 * energy - literally how the "magnetic nozzle" in a DFD/VASIMR-type engine
 * works. The flux-tube expansion ratio B_throat/B_exit plays the role a
 * physical area ratio plays in a de Laval nozzle.
 *
 * Only a finite fraction of the throat's thermal energy is convertible (the
 * isotropic/perpendicular share), and even that converts incompletely for a
 * finite expansion ratio - so this model is intrinsically less optimistic
 * than a naive "all jet power becomes directed KE" estimate, and converges
 * to that naive estimate only in the ideal Rb -> infinity limit.
 */
export function solveNozzleState(
  netJetPowerMW: number,
  params: NozzleParams,
  bThroatT: number,
  bExitT: number,
): NozzleState {
  const massFlowKgS = Math.max(params.propMassFlowMgS * 1e-6, 1e-9);
  const jetPowerW = Math.max(netJetPowerMW * 1e6, 0);

  const specificEnergyTotal = jetPowerW / massFlowKgS; // J/kg available at the throat
  const ePerp0 = ISOTROPIC_FRACTION * specificEnergyTotal;
  const ePar0 = (1 - ISOTROPIC_FRACTION) * specificEnergyTotal;

  const expansionRatio = Math.max(bThroatT / Math.max(bExitT, 1e-9), 1);
  const ePerpResidual = ePerp0 / expansionRatio;
  const eConverted = ePerp0 - ePerpResidual;
  const eDirectedExit = Math.max(ePar0 + eConverted, 0);

  const conversionEfficiency = specificEnergyTotal > 0 ? eDirectedExit / specificEnergyTotal : 0;

  const exhaustVelocityMS = Math.sqrt(2 * params.nozzleEfficiency * eDirectedExit);
  const specificImpulseS = exhaustVelocityMS / G0;
  const thrustN = massFlowKgS * exhaustVelocityMS;
  const thrustPowerMW = (0.5 * massFlowKgS * exhaustVelocityMS * exhaustVelocityMS) / 1e6;

  return {
    massFlowKgS,
    exhaustVelocityMS,
    specificImpulseS,
    thrustN,
    thrustPowerMW,
    expansionRatio,
    conversionEfficiency,
  };
}
