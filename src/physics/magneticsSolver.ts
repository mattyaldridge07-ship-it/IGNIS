import type { CoilGeometry, MagneticsParams, MagneticsState } from './physicsTypes';

const MU0 = 4 * Math.PI * 1e-7;

/** Typical 2G REBCO tape cross-section (4mm wide x 0.1mm thick copper-stabilised tape). */
export const HTS_TAPE_WIDTH_M = 0.004;
export const HTS_TAPE_THICKNESS_M = 0.0001;
export const HTS_TAPE_CROSS_SECTION_M2 = HTS_TAPE_WIDTH_M * HTS_TAPE_THICKNESS_M;

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

  const mirrorRatio = bCenterT !== 0 ? bThroatT / Math.abs(bCenterT) : 0;
  const lossConeAngleDeg =
    mirrorRatio >= 1 ? (Math.asin(1 / Math.sqrt(mirrorRatio)) * 180) / Math.PI : 90;

  const criticalCurrentDensityAM2 = rebcoCriticalCurrentDensity(bThroatT, params.cryoTempK);
  const operatingCurrentDensityAM2 = params.coilCurrentA / HTS_TAPE_CROSS_SECTION_M2;
  const quenchWarning = operatingCurrentDensityAM2 > criticalCurrentDensityAM2;
  const quenchMargin = criticalCurrentDensityAM2 / Math.max(operatingCurrentDensityAM2, 1e-9);

  return {
    axialProfile,
    bCenterT,
    bThroatT,
    mirrorRatio,
    lossConeAngleDeg,
    criticalCurrentDensityAM2,
    operatingCurrentDensityAM2,
    quenchWarning,
    quenchMargin,
    coils,
  };
}
