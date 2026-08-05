import {
  htsTapeMassKg,
  TUNGSTEN_DENSITY_KG_M3,
  BORATED_POLY_DENSITY_KG_M3,
  solveShieldGeometry,
} from './costModel';
import type { BomLineItem, CostParams, CostState, MagneticsParams } from '../physics/physicsTypes';

export function generateBom(
  magnetics: MagneticsParams,
  costParams: CostParams,
  costState: CostState,
): BomLineItem[] {
  const shield = solveShieldGeometry(costParams);
  const tapeMass = htsTapeMassKg(costState.htsTapeLengthM);

  const items: BomLineItem[] = [
    {
      id: 'hts-tape',
      category: 'Magnetics',
      name: 'REBCO 2G HTS Tape',
      quantity: costState.htsTapeLengthM,
      unit: 'm',
      unitCost: costState.htsTapeCost / Math.max(costState.htsTapeLengthM, 1e-9),
      totalCost: costState.htsTapeCost,
      massKg: tapeMass,
    },
    {
      id: 'coil-formers',
      category: 'Magnetics',
      name: `Coil Formers & Cryostat Interfaces (${magnetics.numCoils}x)`,
      quantity: magnetics.numCoils,
      unit: 'ea',
      unitCost: 18500,
      totalCost: magnetics.numCoils * 18500,
      massKg: magnetics.numCoils * 42,
    },
    {
      id: 'tungsten-shield',
      category: 'Shielding',
      name: 'Tungsten Radiation Shield',
      quantity: shield.volumeTungstenM3 * TUNGSTEN_DENSITY_KG_M3,
      unit: 'kg',
      unitCost: costParams.tungstenCostPerKg,
      totalCost: shield.volumeTungstenM3 * TUNGSTEN_DENSITY_KG_M3 * costParams.tungstenCostPerKg,
      massKg: shield.volumeTungstenM3 * TUNGSTEN_DENSITY_KG_M3,
    },
    {
      id: 'borated-poly-shield',
      category: 'Shielding',
      name: 'Borated Polyethylene Neutron Shield',
      quantity: shield.volumePolyM3 * BORATED_POLY_DENSITY_KG_M3,
      unit: 'kg',
      unitCost: costParams.boratedPolyCostPerKg,
      totalCost: shield.volumePolyM3 * BORATED_POLY_DENSITY_KG_M3 * costParams.boratedPolyCostPerKg,
      massKg: shield.volumePolyM3 * BORATED_POLY_DENSITY_KG_M3,
    },
    {
      id: 'structure-margin',
      category: 'Structure',
      name: 'Vacuum Vessel, RF System & Structural Margin',
      quantity: 1,
      unit: 'lot',
      unitCost: costParams.dryMassMarginKg * 220,
      totalCost: costParams.dryMassMarginKg * 220,
      massKg: costParams.dryMassMarginKg,
    },
    {
      id: 'launch',
      category: 'Logistics',
      name: 'Launch-to-Orbit Service',
      quantity: costState.dryMassKg,
      unit: 'kg',
      unitCost: costParams.launchCostPerKg,
      totalCost: costState.launchCost,
      massKg: 0,
    },
  ];

  return items;
}

export function bomToCsv(bom: BomLineItem[]): string {
  const header = ['ID', 'Category', 'Name', 'Quantity', 'Unit', 'Unit Cost (USD)', 'Total Cost (USD)', 'Mass (kg)'];
  const rows = bom.map((item) => [
    item.id,
    item.category,
    item.name,
    item.quantity.toFixed(2),
    item.unit,
    item.unitCost.toFixed(2),
    item.totalCost.toFixed(2),
    item.massKg.toFixed(2),
  ]);
  return [header, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
}

export function bomToJson(bom: BomLineItem[]): string {
  return JSON.stringify(bom, null, 2);
}

export function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
