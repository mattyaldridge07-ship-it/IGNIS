import type { CoilGeometry, CoilStress, MagneticsParams, MagneticsState } from './physicsTypes';

const MU0 = 4 * Math.PI * 1e-7;

/** Typical 2G REBCO tape cross-section (4mm wide x 0.1mm thick copper-stabilised tape). */
export const HTS_TAPE_WIDTH_M = 0.004;
export const HTS_TAPE_THICKNESS_M = 0.0001;
export const HTS_TAPE_CROSS_SECTION_M2 = HTS_TAPE_WIDTH_M * HTS_TAPE_THICKNESS_M;

/** Engineering yield strength assumed for the reinforced (steel/composite-backed) coil structure. */
export const COIL_YIELD_STRENGTH_MPA = 350;

/**
 * Builds the coaxial coil array for the mirror-confined core: interior "center cell"
 * coils at full bore radius, two end "throat" coils pulled down to mirrorThroatRadius
 * to produce the field compression needed for a magnetic mirror (Rm > 1).
 */
export function generateCoilGeometry(params: MagneticsParams): CoilGeometry[] {
  const n = Math.max(params.numCoils, 2);
  const ampereTurns = params.coilCurrentA * params.turnsPerCoil;
  const coils: CoilGeometry[] = [];
  for (let i = 0; i < n; i++) {
    const frac = n === 1 ? 0 : i / (n - 1);
    const z = -params.coilSpan / 2 + frac * params.coilSpan;
    const isThroat = i === 0 || i === n - 1;
    const radius = isThroat ? params.mirrorThroatRadius : params.coilRadius;
    coils.push({ z, radius, currentA: ampereTurns });
  }
  return coils;
}

/** On-axis Bz(z) via superposition of coaxial current loops (Biot-Savart). */
export function biotSavartAxial(coils: CoilGeometry[], z: number): number {
  let bz = 0;
  for (const coil of coils) {
    const dz = z - coil.z;
    const denom = Math.pow(dz * dz + coil.radius * coil.radius, 1.5);
    if (denom > 0) {
      bz += (coil.currentA * coil.radius * coil.radius) / denom;
    }
  }
  return (MU0 / 2) * bz;
}

/**
 * Complete elliptic integrals K(m) and E(m) (parameter convention, m = k^2) via the
 * arithmetic-geometric mean algorithm (Abramowitz & Stegun 17.6 / Gauss's method).
 * Converges to double precision in well under 16 iterations for all m in [0, 1).
 */
export function ellipticKE(mIn: number): { K: number; E: number } {
  const m = Math.min(Math.max(mIn, 0), 1 - 1e-9);
  let a = 1;
  let b = Math.sqrt(1 - m);
  let c = Math.sqrt(m);
  let sum = 0;
  let p = 0.5;
  for (let n = 0; n < 16; n++) {
    sum += p * c * c;
    const aNext = (a + b) / 2;
    const bNext = Math.sqrt(a * b);
    const cNext = (a - b) / 2;
    a = aNext;
    b = bNext;
    c = cNext;
    p *= 2;
  }
  const K = Math.PI / (2 * a);
  const E = K * (1 - sum);
  return { K, E };
}

/**
 * Full off-axis magnetic field (Br, Bz) from a coaxial coil array, via the exact
 * elliptic-integral solution for a circular current loop. Reduces to biotSavartAxial
 * on-axis (r=0). Used for coil hoop-stress / mutual-force calculations and any
 * off-axis field query - the on-axis field alone does not tell you what field the
 * conductor itself (sitting at r = coil radius) actually experiences.
 */
export function offAxisField(coils: CoilGeometry[], r: number, z: number): { br: number; bz: number } {
  if (r < 1e-6) {
    return { br: 0, bz: biotSavartAxial(coils, z) };
  }
  let br = 0;
  let bz = 0;
  for (const coil of coils) {
    const a = coil.radius;
    const dz = z - coil.z;
    const denom0 = (a + r) * (a + r) + dz * dz;
    const sqrtDenom0 = Math.sqrt(denom0);
    const k2 = (4 * a * r) / denom0;
    const { K, E } = ellipticKE(k2);
    const denomMinus = Math.max((a - r) * (a - r) + dz * dz, 1e-12);
    const pref = (MU0 * coil.currentA) / (2 * Math.PI);
    bz += pref * (1 / sqrtDenom0) * ((E * (a * a - r * r - dz * dz)) / denomMinus + K);
    br += pref * (dz / (r * sqrtDenom0)) * ((E * (a * a + r * r + dz * dz)) / denomMinus - K);
  }
  return { br, bz };
}

/**
 * Per-coil hoop stress from the mutual field of every OTHER coil in the array
 * (a symmetric current loop exerts no net radial force on itself). The axial
 * field component crossed with the loop's own azimuthal current gives a
 * uniformly distributed radial line load, which a thin ring reacts to purely
 * in hoop tension: T = f_radial * R = (I * B_ext) * R.
 */
export function computeCoilStress(coils: CoilGeometry[], params: MagneticsParams): CoilStress[] {
  const conductorAreaM2 = params.turnsPerCoil * HTS_TAPE_CROSS_SECTION_M2;
  return coils.map((coil, i) => {
    const others = coils.filter((_, j) => j !== i);
    const { bz } = offAxisField(others, coil.radius, coil.z);
    const externalFieldT = Math.abs(bz);
    const hoopTensionN = coil.currentA * externalFieldT * coil.radius;
    const hoopStressMPa = hoopTensionN / conductorAreaM2 / 1e6;
    const structuralMargin = COIL_YIELD_STRENGTH_MPA / Math.max(hoopStressMPa, 1e-9);
    return { externalFieldT, hoopTensionN, hoopStressMPa, structuralMargin };
  });
}

export function sampleAxialProfile(
  coils: CoilGeometry[],
  span: number,
  samples = 160,
): { z: number; bz: number }[] {
  const zMax = span * 0.65;
  const out: { z: number; bz: number }[] = [];
  for (let i = 0; i < samples; i++) {
    const z = -zMax + (2 * zMax * i) / (samples - 1);
    out.push({ z, bz: biotSavartAxial(coils, z) });
  }
  return out;
}

/**
 * Phenomenological REBCO critical-current-density scaling law, engineering-current-density
 * form (whole tape cross-section). Captures the two dominant trends: Jc falls off with
 * field roughly as a power law, and collapses to zero at the superconducting transition Tc.
 */
export function rebcoCriticalCurrentDensity(bFieldT: number, cryoTempK: number): number {
  const jc0 = 3.2e10; // A/m^2, reference engineering Jc at 20K, self-field
  const tc = 92; // K, REBCO critical temperature
  const b0 = 5; // T, field scale
  const n = 0.7; // field roll-off exponent
  const tempFactor = Math.max(1 - cryoTempK / tc, 0) ** 1.5;
  const fieldFactor = 1 / (1 + Math.abs(bFieldT) / b0) ** n;
  return jc0 * tempFactor * fieldFactor;
}

export function solveMagneticsState(params: MagneticsParams): MagneticsState {
  const coils = generateCoilGeometry(params);
  const axialProfile = sampleAxialProfile(coils, params.coilSpan);

  const bCenterT = biotSavartAxial(coils, 0);
  const bThroatT = axialProfile.reduce((max, p) => Math.max(max, Math.abs(p.bz)), 0);
  // Nozzle sits at the -z end of the assembly - the near edge of the sampled
  // range is the best available proxy for the magnetic-nozzle exit field.
  const bExitT = Math.abs(axialProfile[0].bz);

  const mirrorRatio = bCenterT !== 0 ? bThroatT / Math.abs(bCenterT) : 0;
  const lossConeAngleDeg =
    mirrorRatio >= 1 ? (Math.asin(1 / Math.sqrt(mirrorRatio)) * 180) / Math.PI : 90;

  const coilStress = computeCoilStress(coils, params);
  const peakConductorFieldT = coilStress.reduce((max, c) => Math.max(max, c.externalFieldT), 0);

  const criticalCurrentDensityAM2 = rebcoCriticalCurrentDensity(peakConductorFieldT, params.cryoTempK);
  const operatingCurrentDensityAM2 = params.coilCurrentA / HTS_TAPE_CROSS_SECTION_M2;
  const quenchWarning = operatingCurrentDensityAM2 > criticalCurrentDensityAM2;
  const quenchMargin = criticalCurrentDensityAM2 / Math.max(operatingCurrentDensityAM2, 1e-9);

  const minStructuralMargin = coilStress.reduce((min, c) => Math.min(min, c.structuralMargin), Infinity);
  const structuralWarning = minStructuralMargin < 1;

  return {
    axialProfile,
    bCenterT,
    bThroatT,
    bExitT,
    mirrorRatio,
    lossConeAngleDeg,
    criticalCurrentDensityAM2,
    operatingCurrentDensityAM2,
    quenchWarning,
    quenchMargin,
    coils,
    coilStress,
    structuralWarning,
    minStructuralMargin,
  };
}
