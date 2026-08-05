import { create } from 'zustand';
import { solvePlasmaState, plasmaBeta } from '../physics/plasmaSolver';
import { solveMagneticsState } from '../physics/magneticsSolver';
import { solveNozzleState } from '../physics/nozzleSolver';
import { solveCostState, DEFAULT_COST_PARAMS } from '../economics/costModel';
import { generateBom } from '../economics/bomGenerator';
import type {
  BomLineItem,
  CostParams,
  CostState,
  FuelCycle,
  MagneticsParams,
  MagneticsState,
  NozzleParams,
  NozzleState,
  PlasmaParams,
  PlasmaState,
} from '../physics/physicsTypes';

export type SubsystemKey =
  | 'frame'
  | 'shielding'
  | 'coils'
  | 'vacuumTube'
  | 'rfAntenna'
  | 'injectors'
  | 'nozzle'
  | 'plasma'
  | 'fieldLines';

export type CutawayAxis = 'XZ' | 'YZ' | 'none';
export type CameraPreset = 'iso' | 'front' | 'side' | 'top' | 'throat';

interface EnginePreset {
  label: string;
  plasma: PlasmaParams;
  magnetics: MagneticsParams;
  nozzle: NozzleParams;
}

const PRESETS: Record<FuelCycle, EnginePreset> = {
  'D-3He': {
    label: 'D-³He Aneutronic Baseline',
    plasma: {
      fuel: 'D-3He',
      ionTempKeV: 65,
      coreDensity: 4e20,
      coreRadius: 0.35,
      coreLength: 2.4,
      profileAlpha: 1.2,
      wallReflectivity: 0.92,
      rfPowerMW: 2.5,
      trapEfficiency: 0.85,
      nozzleEfficiency: 0.9,
    },
    magnetics: {
      coilCurrentA: 380,
      turnsPerCoil: 260,
      coilRadius: 0.55,
      numCoils: 8,
      coilSpan: 3.2,
      mirrorThroatRadius: 0.32,
      cryoTempK: 20,
    },
    nozzle: {
      propMassFlowMgS: 45,
      nozzleEfficiency: 0.9,
    },
  },
  'D-T': {
    label: 'D-T High-Thrust Baseline',
    plasma: {
      fuel: 'D-T',
      ionTempKeV: 22,
      coreDensity: 3e20,
      coreRadius: 0.35,
      coreLength: 2.4,
      profileAlpha: 1.2,
      wallReflectivity: 0.85,
      rfPowerMW: 1.8,
      trapEfficiency: 0.85,
      nozzleEfficiency: 0.9,
    },
    magnetics: {
      coilCurrentA: 340,
      turnsPerCoil: 260,
      coilRadius: 0.55,
      numCoils: 8,
      coilSpan: 3.2,
      mirrorThroatRadius: 0.32,
      cryoTempK: 20,
    },
    nozzle: {
      propMassFlowMgS: 70,
      nozzleEfficiency: 0.9,
    },
  },
};

interface EngineStore {
  plasmaParams: PlasmaParams;
  magneticsParams: MagneticsParams;
  nozzleParams: NozzleParams;
  costParams: CostParams;

  plasma: PlasmaState;
  magnetics: MagneticsState;
  nozzle: NozzleState;
  cost: CostState;
  bom: BomLineItem[];
  coreBeta: number;

  explosionFactor: number;
  cutawayAxis: CutawayAxis;
  cutawayOffset: number;
  activeLayers: Record<SubsystemKey, boolean>;
  cameraPreset: CameraPreset;
  mathDrawerOpen: boolean;
  costModalOpen: boolean;
  telemetryHistory: { t: number; isp: number; thrust: number; qFactor: number }[];

  setPlasmaParam: <K extends keyof PlasmaParams>(key: K, value: PlasmaParams[K]) => void;
  setMagneticsParam: <K extends keyof MagneticsParams>(key: K, value: MagneticsParams[K]) => void;
  setNozzleParam: <K extends keyof NozzleParams>(key: K, value: NozzleParams[K]) => void;
  setCostParam: <K extends keyof CostParams>(key: K, value: CostParams[K]) => void;
  loadPreset: (fuel: FuelCycle) => void;
  recompute: () => void;

  setExplosionFactor: (value: number) => void;
  setCutawayAxis: (axis: CutawayAxis) => void;
  setCutawayOffset: (value: number) => void;
  toggleLayer: (key: SubsystemKey) => void;
  setCameraPreset: (preset: CameraPreset) => void;
  setMathDrawerOpen: (open: boolean) => void;
  setCostModalOpen: (open: boolean) => void;
}

const ALL_LAYERS_ON: Record<SubsystemKey, boolean> = {
  frame: true,
  shielding: true,
  coils: true,
  vacuumTube: true,
  rfAntenna: true,
  injectors: true,
  nozzle: true,
  plasma: true,
  fieldLines: true,
};

function computeAll(
  plasmaParams: PlasmaParams,
  magneticsParams: MagneticsParams,
  nozzleParams: NozzleParams,
  costParams: CostParams,
) {
  const magnetics = solveMagneticsState(magneticsParams);
  const plasma = solvePlasmaState(plasmaParams, Math.abs(magnetics.bCenterT));
  const nozzle = solveNozzleState(plasma.netJetPowerMW, nozzleParams);
  const cost = solveCostState(magneticsParams, plasmaParams.fuel, plasma.fusionPowerMW, costParams);
  const bom = generateBom(magneticsParams, costParams, cost);
  const coreBeta = plasmaBeta(plasmaParams.coreDensity, plasmaParams.ionTempKeV, Math.abs(magnetics.bCenterT));
  return { plasma, magnetics, nozzle, cost, bom, coreBeta };
}

const initialPreset = PRESETS['D-3He'];
const initialSolved = computeAll(
  initialPreset.plasma,
  initialPreset.magnetics,
  initialPreset.nozzle,
  DEFAULT_COST_PARAMS,
);

export const useEngineStore = create<EngineStore>((set, get) => ({
  plasmaParams: initialPreset.plasma,
  magneticsParams: initialPreset.magnetics,
  nozzleParams: initialPreset.nozzle,
  costParams: DEFAULT_COST_PARAMS,

  plasma: initialSolved.plasma,
  magnetics: initialSolved.magnetics,
  nozzle: initialSolved.nozzle,
  cost: initialSolved.cost,
  bom: initialSolved.bom,
  coreBeta: initialSolved.coreBeta,

  explosionFactor: 0,
  cutawayAxis: 'none',
  cutawayOffset: 0,
  activeLayers: ALL_LAYERS_ON,
  cameraPreset: 'iso',
  mathDrawerOpen: false,
  costModalOpen: false,
  telemetryHistory: [],

  setPlasmaParam: (key, value) => {
    set((s) => ({ plasmaParams: { ...s.plasmaParams, [key]: value } }));
    get().recompute();
  },
  setMagneticsParam: (key, value) => {
    set((s) => ({ magneticsParams: { ...s.magneticsParams, [key]: value } }));
    get().recompute();
  },
  setNozzleParam: (key, value) => {
    set((s) => ({ nozzleParams: { ...s.nozzleParams, [key]: value } }));
    get().recompute();
  },
  setCostParam: (key, value) => {
    set((s) => ({ costParams: { ...s.costParams, [key]: value } }));
    get().recompute();
  },
  loadPreset: (fuel) => {
    const preset = PRESETS[fuel];
    set({
      plasmaParams: preset.plasma,
      magneticsParams: preset.magnetics,
      nozzleParams: preset.nozzle,
    });
    get().recompute();
  },
  recompute: () => {
    const s = get();
    const { plasma, magnetics, nozzle, cost, bom, coreBeta } = computeAll(
      s.plasmaParams,
      s.magneticsParams,
      s.nozzleParams,
      s.costParams,
    );
    const historyEntry = {
      t: Date.now(),
      isp: nozzle.specificImpulseS,
      thrust: nozzle.thrustN,
      qFactor: plasma.qFactor,
    };
    const telemetryHistory = [...s.telemetryHistory.slice(-59), historyEntry];
    set({ plasma, magnetics, nozzle, cost, bom, coreBeta, telemetryHistory });
  },

  setExplosionFactor: (value) => set({ explosionFactor: value }),
  setCutawayAxis: (axis) => set({ cutawayAxis: axis }),
  setCutawayOffset: (value) => set({ cutawayOffset: value }),
  toggleLayer: (key) =>
    set((s) => ({ activeLayers: { ...s.activeLayers, [key]: !s.activeLayers[key] } })),
  setCameraPreset: (preset) => set({ cameraPreset: preset }),
  setMathDrawerOpen: (open) => set({ mathDrawerOpen: open }),
  setCostModalOpen: (open) => set({ costModalOpen: open }),
}));

export { PRESETS };
