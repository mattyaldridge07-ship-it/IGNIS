import { FUEL_CYCLES, type FuelCycle, type PlasmaParams, type PlasmaState } from './physicsTypes';

const MEV_TO_JOULE = 1.602176634e-13;

interface BoschHaleCoeffs {
  bg: number;
  mrc2: number;
  c1: number;
  c2: number;
  c3: number;
  c4: number;
  c5: number;
  c6: number;
  c7: number;
  tMin: number;
  tMax: number;
}

const BOSCH_HALE: Record<FuelCycle, BoschHaleCoeffs> = {
  'D-T': {
    bg: 34.3827,
    mrc2: 1124656,
    c1: 1.17302e-9,
    c2: 1.51361e-2,
    c3: 7.51886e-2,
    c4: 4.60643e-3,
    c5: 1.3500e-2,
    c6: -1.06750e-4,
    c7: 1.366e-5,
    tMin: 0.2,
    tMax: 100,
  },
  'D-3He': {
    bg: 68.7508,
    mrc2: 1124572,
    c1: 5.51036e-10,
    c2: 6.41918e-3,
    c3: -2.02896e-3,
    c4: -1.9108e-5,
    c5: 1.35776e-4,
    c6: 0,
    c7: 0,
    tMin: 0.5,
    tMax: 190,
  },
};

/**
 * Bosch-Hale (Nucl. Fusion 32 (1992) 611) parametrised reactivity <sigma*v>(Ti).
 * Returns m^3/s. Input Ti in keV.
 */
export function reactivity(ionTempKeV: number, fuel: FuelCycle): number {
  const t = Math.min(Math.max(ionTempKeV, BOSCH_HALE[fuel].tMin), BOSCH_HALE[fuel].tMax);
  const c = BOSCH_HALE[fuel];
  const numerator = t * (c.c2 + t * (c.c4 + t * c.c6));
  const denominator = 1 + t * (c.c3 + t * (c.c5 + t * c.c7));
  const theta = t / (1 - numerator / denominator);
  const xi = Math.cbrt((c.bg * c.bg) / (4 * theta));
  const sigmaVCm3 = c.c1 * theta * Math.sqrt(xi / (c.mrc2 * t * t * t)) * Math.exp(-3 * xi);
  return sigmaVCm3 * 1e-6;
}

/** Density-profile volume peaking factors for n(r,z) = n0 (1-(r/a)^2)^alpha cos(pi z / L). */
export function peakingFactorLinear(alpha: number): number {
  return 2 / (Math.PI * (alpha + 1));
}
export function peakingFactorQuadratic(alpha: number): number {
  return 1 / (2 * (2 * alpha + 1));
}

export function coreVolume(radius: number, length: number): number {
  return Math.PI * radius * radius * length;
}

/** Charge-weighted effective electron density and Z-effective for the 50/50 fuel mix. */
export function electronDensityAndZeff(n0: number, fuel: FuelCycle): { ne: number; zEff: number } {
  const species = FUEL_CYCLES[fuel];
  const nA = 0.5 * n0;
  const nB = 0.5 * n0;
  const ne = nA * species.za + nB * species.zb;
  const zEff = (nA * species.za * species.za + nB * species.zb * species.zb) / ne;
  return { ne, zEff };
}

export function bremsstrahlungLossDensity(zEff: number, ne: number, teKeV: number): number {
  return 1.69e-38 * zEff * ne * ne * Math.sqrt(Math.max(teKeV, 0));
}

export function synchrotronLossDensity(
  ne: number,
  teKeV: number,
  bFieldT: number,
  wallReflectivity: number,
): number {
  return 6.2e-17 * ne * teKeV * bFieldT * bFieldT * (1 + teKeV / 204) * (1 - wallReflectivity);
}

const ELEMENTARY_CHARGE = 1.602176634e-19;
const AMU_TO_KG = 1.66053906660e-27;

/** Approximate average ion mass for the 50/50 fuel mix, amu. */
const AVERAGE_ION_MASS_AMU: Record<FuelCycle, number> = {
  'D-T': (2.014 + 3.016) / 2,
  'D-3He': (2.014 + 3.016) / 2,
};

/**
 * Bohm-scaling cross-field diffusivity, m^2/s. D_Bohm = Te[eV] / (16 B[T]).
 * The standard pessimistic (worst-case) estimate for anomalous transport in
 * a magnetised plasma.
 */
export function bohmDiffusivity(teKeV: number, bFieldT: number): number {
  const teEv = Math.max(teKeV, 1e-6) * 1000;
  return teEv / (16 * Math.max(bFieldT, 1e-6));
}

/** Thermal ion Larmor radius, m: rho_i = sqrt(2 m T) / (e B). */
export function ionGyroradius(teKeV: number, bFieldT: number, fuel: FuelCycle): number {
  const massKg = AVERAGE_ION_MASS_AMU[fuel] * AMU_TO_KG;
  const tJ = Math.max(teKeV, 1e-6) * 1000 * ELEMENTARY_CHARGE;
  return Math.sqrt(2 * massKg * tJ) / (ELEMENTARY_CHARGE * Math.max(bFieldT, 1e-6));
}

/**
 * Gyro-Bohm diffusivity: D_gB = D_Bohm * (rho_i / a). Real optimised fusion
 * devices are designed to approach gyro-Bohm (favourable, size-scaling)
 * transport rather than the pessimistic Bohm limit, so this is the more
 * appropriate default for a confinement-quality estimate.
 */
export function gyroBohmDiffusivity(teKeV: number, bFieldT: number, coreRadius: number, fuel: FuelCycle): number {
  const rho = ionGyroradius(teKeV, bFieldT, fuel);
  return bohmDiffusivity(teKeV, bFieldT) * (rho / Math.max(coreRadius, 1e-6));
}

/** tau_E = a^2 / D_gyroBohm: cross-field energy confinement time, s. */
export function energyConfinementTimeS(
  coreRadius: number,
  teKeV: number,
  bFieldT: number,
  fuel: FuelCycle,
): number {
  return (coreRadius * coreRadius) / gyroBohmDiffusivity(teKeV, bFieldT, coreRadius, fuel);
}

/**
 * Confinement-limited fuel burn-up fraction: f_b = n*<sv>*tau_p / (1 + n*<sv>*tau_p),
 * assuming particle confinement time tau_p ~= tau_E (standard simplifying
 * assumption in 0D fusion power-balance models).
 */
export function burnupFraction(n0: number, sigmaV: number, tauPS: number): number {
  const x = n0 * sigmaV * tauPS;
  return x / (1 + x);
}

export function solvePlasmaState(params: PlasmaParams, bFieldT: number): PlasmaState {
  const species = FUEL_CYCLES[params.fuel];
  const V = coreVolume(params.coreRadius, params.coreLength);
  const f1 = peakingFactorLinear(params.profileAlpha);
  const f2 = peakingFactorQuadratic(params.profileAlpha);

  const { ne: neCentral, zEff: zEffCalc } = electronDensityAndZeff(params.coreDensity, params.fuel);
  const zEff = params.zEffOverride ?? zEffCalc;

  const sigmaV = reactivity(params.ionTempKeV, params.fuel);
  const nA0 = 0.5 * params.coreDensity;
  const nB0 = 0.5 * params.coreDensity;
  const eRxnJ = species.eRxnMeV * MEV_TO_JOULE;

  const fusionPowerW = nA0 * nB0 * sigmaV * eRxnJ * V * f2;
  const fusionPowerChargedW = fusionPowerW * species.chargedFraction;
  const fusionPowerNeutronW = fusionPowerW * (1 - species.chargedFraction);

  const neAvg = neCentral * f1;
  const bremsDensity = bremsstrahlungLossDensity(zEff, neCentral, params.ionTempKeV);
  const bremsPowerW = bremsDensity * V * f2;

  const syncDensity = synchrotronLossDensity(neAvg, params.ionTempKeV, bFieldT, params.wallReflectivity);
  const syncPowerW = syncDensity * V * f1;

  const tauE = energyConfinementTimeS(params.coreRadius, params.ionTempKeV, bFieldT, params.fuel);
  const thermalEnergyJ = 1.5 * plasmaPressurePa(params.coreDensity, params.ionTempKeV) * V;
  // The power that would be REQUIRED to replenish confinement losses fast enough
  // to actually sustain the assumed (n, Ti) state against gyro-Bohm transport.
  // This is a diagnostic, not an extra energy source: by conservation of energy,
  // whatever heating isn't radiated away already exits as usable exhaust power
  // below (open-field-line end-loss = the exhaust stream) - adding this term a
  // second time would double-count it and blow up for any short tau_E.
  const transportLossW = thermalEnergyJ / tauE;

  const rfPowerW = params.rfPowerMW * 1e6;
  const netJetPowerW = params.trapEfficiency * (fusionPowerChargedW + rfPowerW) - bremsPowerW - syncPowerW;

  const qFactor = rfPowerW > 0 ? fusionPowerW / rfPowerW : Infinity;

  // Ignition margin: charged-particle self-heating vs. every loss channel
  // (including the confinement-required replenishment power). >=1 means the
  // assumed (n, Ti) state is self-consistently sustainable without RF.
  const confinementLossW = transportLossW + bremsPowerW + syncPowerW;
  const ignitionMarginFactor = confinementLossW > 0 ? fusionPowerChargedW / confinementLossW : Infinity;

  const fBurn = burnupFraction(params.coreDensity, sigmaV, tauE);
  const lawsonTripleProduct = params.coreDensity * params.ionTempKeV * tauE;

  return {
    reactivityM3s: sigmaV,
    fusionPowerMW: fusionPowerW / 1e6,
    fusionPowerChargedMW: fusionPowerChargedW / 1e6,
    fusionPowerNeutronMW: fusionPowerNeutronW / 1e6,
    bremsstrahlungLossMW: bremsPowerW / 1e6,
    synchrotronLossMW: syncPowerW / 1e6,
    transportLossMW: transportLossW / 1e6,
    netJetPowerMW: netJetPowerW / 1e6,
    electronDensity: neCentral,
    zEff,
    qFactor,
    coreVolumeM3: V,
    peakingFactor1: f1,
    peakingFactor2: f2,
    energyConfinementTimeS: tauE,
    burnupFraction: fBurn,
    ignitionMarginFactor,
    lawsonTripleProduct,
  };
}

/** Local density profile sample, used by the volumetric shader / telemetry. n(r,z) = n0 (1-(r/a)^2)^alpha cos(pi z/L). */
export function densityProfile(
  r: number,
  z: number,
  n0: number,
  a: number,
  length: number,
  alpha: number,
): number {
  const rn = Math.min(Math.abs(r) / a, 1);
  const radial = Math.pow(Math.max(1 - rn * rn, 0), alpha);
  const axial = Math.cos((Math.PI * z) / length);
  return n0 * radial * Math.max(axial, 0);
}

/** Plasma thermal pressure p = n k_B T (Ti + Te ~ 2*Ti for single-fluid assumption), in Pascals. TempKeV in keV. */
export function plasmaPressurePa(n0: number, ionTempKeV: number): number {
  const keVToJoule = 1.602176634e-16;
  return 2 * n0 * ionTempKeV * keVToJoule;
}

export function magneticPressurePa(bFieldT: number): number {
  const mu0 = 4 * Math.PI * 1e-7;
  return (bFieldT * bFieldT) / (2 * mu0);
}

export function plasmaBeta(n0: number, ionTempKeV: number, bFieldT: number): number {
  if (bFieldT <= 0) return 0;
  return plasmaPressurePa(n0, ionTempKeV) / magneticPressurePa(bFieldT);
}
