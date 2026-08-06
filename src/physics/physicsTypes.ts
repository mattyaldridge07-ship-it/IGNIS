export type FuelCycle = 'D-3He' | 'D-T';

export interface FuelSpecies {
  label: string;
  za: number;
  zb: number;
  eRxnMeV: number;
  chargedFraction: number;
}

export const FUEL_CYCLES: Record<FuelCycle, FuelSpecies> = {
  'D-3He': { label: 'Deuterium / Helium-3', za: 1, zb: 2, eRxnMeV: 18.35, chargedFraction: 1.0 },
  'D-T': { label: 'Deuterium / Tritium', za: 1, zb: 1, eRxnMeV: 17.6, chargedFraction: 0.2 },
};

export interface PlasmaParams {
  fuel: FuelCycle;
  ionTempKeV: number;
  coreDensity: number;
  coreRadius: number;
  coreLength: number;
  profileAlpha: number;
  zEffOverride?: number;
  wallReflectivity: number;
  rfPowerMW: number;
  trapEfficiency: number;
  nozzleEfficiency: number;
}

export interface PlasmaState {
  reactivityM3s: number;
  fusionPowerMW: number;
  fusionPowerChargedMW: number;
  fusionPowerNeutronMW: number;
  bremsstrahlungLossMW: number;
  synchrotronLossMW: number;
  transportLossMW: number;
  netJetPowerMW: number;
  electronDensity: number;
  zEff: number;
  qFactor: number;
  coreVolumeM3: number;
  peakingFactor1: number;
  peakingFactor2: number;
  /** Bohm-scaling energy confinement time, s. */
  energyConfinementTimeS: number;
  /** Fraction of fuel ions consumed before being lost from confinement (n*<sv>*tau_p limited). */
  burnupFraction: number;
  /** P_fus,charged / (P_transport + P_brem + P_sync). >=1 means alpha/charged-particle heating alone sustains the plasma (ignition). */
  ignitionMarginFactor: number;
  /** n * T[keV] * tau_E triple product, m^-3 s keV. */
  lawsonTripleProduct: number;
}

export interface MagneticsParams {
  coilCurrentA: number;
  turnsPerCoil: number;
  coilRadius: number;
  numCoils: number;
  coilSpan: number;
  mirrorThroatRadius: number;
  cryoTempK: number;
}

export interface CoilGeometry {
  z: number;
  radius: number;
  currentA: number;
}

export interface CoilStress {
  /** Peak field magnitude at this coil's own conductor, from the mutual field of every other coil (T). */
  externalFieldT: number;
  /** Hoop tension from that mutual field, N. */
  hoopTensionN: number;
  /** Hoop stress in the wound conductor bundle, MPa. */
  hoopStressMPa: number;
  /** yieldStrengthMPa / hoopStressMPa. <1 means the structure is predicted to fail. */
  structuralMargin: number;
}

export interface MagneticsState {
  axialProfile: { z: number; bz: number }[];
  bCenterT: number;
  bThroatT: number;
  /** Field at the far (nozzle-side) end of the sampled axial range - proxy for the magnetic nozzle exit field. */
  bExitT: number;
  mirrorRatio: number;
  lossConeAngleDeg: number;
  criticalCurrentDensityAM2: number;
  operatingCurrentDensityAM2: number;
  quenchWarning: boolean;
  quenchMargin: number;
  coils: CoilGeometry[];
  coilStress: CoilStress[];
  structuralWarning: boolean;
  minStructuralMargin: number;
}

export interface NozzleParams {
  propMassFlowMgS: number;
  nozzleEfficiency: number;
}

export interface NozzleState {
  massFlowKgS: number;
  exhaustVelocityMS: number;
  specificImpulseS: number;
  thrustN: number;
  thrustPowerMW: number;
  /** B_throat / B_exit magnetic expansion ratio driving the adiabatic conversion. */
  expansionRatio: number;
  /** Fraction of the throat's total specific energy that ends up as directed exit kinetic energy. */
  conversionEfficiency: number;
}

export interface CostParams {
  htsCostPerKAm: number;
  he3CostPerGram: number;
  tritiumCostPerGram: number;
  tungstenCostPerKg: number;
  boratedPolyCostPerKg: number;
  launchCostPerKg: number;
  shieldOuterRadiusM: number;
  shieldThicknessM: number;
  shieldLengthM: number;
  tungstenFraction: number;
  dryMassMarginKg: number;
}

export interface BomLineItem {
  id: string;
  category: string;
  name: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  massKg: number;
}

export interface CostState {
  htsTapeLengthM: number;
  htsTapeCost: number;
  fuelCostPerSecond: number;
  fuelCostPerDay: number;
  shieldMassKg: number;
  shieldCost: number;
  dryMassKg: number;
  launchCost: number;
  totalCapex: number;
  bom: BomLineItem[];
}
