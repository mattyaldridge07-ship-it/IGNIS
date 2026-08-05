import { HTS_TAPE_CROSS_SECTION_M2 } from '../physics/magneticsSolver';
import { FUEL_CYCLES, type CostParams, type CostState, type FuelCycle, type MagneticsParams } from '../physics/physicsTypes';

const MEV_TO_JOULE = 1.602176634e-13;
const AMU_TO_G = 1.66053906660e-24;
const FUEL_B_MASS_AMU = 3.016; // He-3 and Tritium are both mass-3 isotopes

export const TUNGSTEN_DENSITY_KG_M3 = 19300;
export const BORATED_POLY_DENSITY_KG_M3 = 1050;
export const HTS_TAPE_DENSITY_KG_M3 = 7500; // copper-stabilised REBCO tape, blended density

export function htsTapeLengthM(magnetics: MagneticsParams): number {
  return magnetics.numCoils * 2 * Math.PI * magnetics.coilRadius * magnetics.turnsPerCoil;
}

export function htsTapeCostUsd(tapeLengthM: number, coilCurrentA: number, costPerKAm: number): number {
  return tapeLengthM * (coilCurrentA / 1000) * costPerKAm;
}

export function htsTapeMassKg(tapeLengthM: number): number {
  return tapeLengthM * HTS_TAPE_CROSS_SECTION_M2 * HTS_TAPE_DENSITY_KG_M3;
}

/** Fuel burn cost rate driven by total fusion power (reaction count) and the expensive-isotope unit cost. */
export function fuelCostPerSecondUsd(
  fusionPowerMW: number,
  fuel: FuelCycle,
  he3CostPerGram: number,
  tritiumCostPerGram: number,
): number {
  const species = FUEL_CYCLES[fuel];
  const reactionsPerSec = (fusionPowerMW * 1e6) / (species.eRxnMeV * MEV_TO_JOULE);
  const massPerReactionG = FUEL_B_MASS_AMU * AMU_TO_G;
  const costPerGram = fuel === 'D-3He' ? he3CostPerGram : tritiumCostPerGram;
  return reactionsPerSec * massPerReactionG * costPerGram;
}

export interface ShieldGeometry {
  volumeTungstenM3: number;
  volumePolyM3: number;
  massKg: number;
  cost: number;
}

export function solveShieldGeometry(params: CostParams): ShieldGeometry {
  const rOuter = params.shieldOuterRadiusM;
  const rInner = Math.max(rOuter - params.shieldThicknessM, 0);
  const shellVolume = Math.PI * (rOuter * rOuter - rInner * rInner) * params.shieldLengthM;

  const volumeTungstenM3 = shellVolume * params.tungstenFraction;
  const volumePolyM3 = shellVolume * (1 - params.tungstenFraction);

  const massTungsten = volumeTungstenM3 * TUNGSTEN_DENSITY_KG_M3;
  const massPoly = volumePolyM3 * BORATED_POLY_DENSITY_KG_M3;

  const cost = massTungsten * params.tungstenCostPerKg + massPoly * params.boratedPolyCostPerKg;

  return {
    volumeTungstenM3,
    volumePolyM3,
    massKg: massTungsten + massPoly,
    cost,
  };
}

export function solveCostState(
  magnetics: MagneticsParams,
  fuel: FuelCycle,
  fusionPowerMW: number,
  costParams: CostParams,
): CostState {
  const tapeLength = htsTapeLengthM(magnetics);
  const tapeCost = htsTapeCostUsd(tapeLength, magnetics.coilCurrentA, costParams.htsCostPerKAm);
  const tapeMass = htsTapeMassKg(tapeLength);

  const shield = solveShieldGeometry(costParams);

  const fuelPerSecond = fuelCostPerSecondUsd(
    fusionPowerMW,
    fuel,
    costParams.he3CostPerGram,
    costParams.tritiumCostPerGram,
  );

  const dryMassKg = shield.massKg + tapeMass + costParams.dryMassMarginKg;
  const launchCost = dryMassKg * costParams.launchCostPerKg;
  const totalCapex = tapeCost + shield.cost + launchCost;

  return {
    htsTapeLengthM: tapeLength,
    htsTapeCost: tapeCost,
    fuelCostPerSecond: fuelPerSecond,
    fuelCostPerDay: fuelPerSecond * 86400,
    shieldMassKg: shield.massKg,
    shieldCost: shield.cost,
    dryMassKg,
    launchCost,
    totalCapex,
    bom: [],
  };
}

export const DEFAULT_COST_PARAMS: CostParams = {
  htsCostPerKAm: 250,
  he3CostPerGram: 4000,
  tritiumCostPerGram: 30000,
  tungstenCostPerKg: 120,
  boratedPolyCostPerKg: 35,
  launchCostPerKg: 1500,
  shieldOuterRadiusM: 1.2,
  shieldThicknessM: 0.18,
  shieldLengthM: 4.5,
  tungstenFraction: 0.35,
  dryMassMarginKg: 3200,
};
