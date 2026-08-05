import * as Dialog from '@radix-ui/react-dialog';
import { X, DollarSign, Download } from 'lucide-react';
import { useEngineStore } from '../../store/useEngineStore';
import { bomToCsv, bomToJson, downloadTextFile } from '../../economics/bomGenerator';
import { cn } from '../../lib/cn';

function usd(value: number): string {
  if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (Math.abs(value) >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  if (Math.abs(value) >= 1) return `$${value.toFixed(2)}`;
  if (value === 0) return '$0';
  return `$${value.toFixed(4)}`;
}

export function CostAnalysisModal() {
  const open = useEngineStore((s) => s.costModalOpen);
  const setOpen = useEngineStore((s) => s.setCostModalOpen);
  const cost = useEngineStore((s) => s.cost);
  const bom = useEngineStore((s) => s.bom);

  const handleExport = (format: 'csv' | 'json') => {
    const content = format === 'csv' ? bomToCsv(bom) : bomToJson(bom);
    downloadTextFile(`ignis-bom.${format}`, content, format === 'csv' ? 'text/csv' : 'application/json');
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-3xl max-h-[85vh] overflow-y-auto bg-ignis-bg border border-ignis-border rounded-lg z-50 shadow-2xl">
          <div className="flex items-center justify-between px-4 h-14 border-b border-ignis-border sticky top-0 bg-ignis-bg/95 backdrop-blur-sm">
            <Dialog.Title className="flex items-center gap-2 text-sm font-mono-tech text-zinc-200">
              <DollarSign className="w-4 h-4 text-ignis-orange" />
              Techno-Economic Analysis
            </Dialog.Title>
            <Dialog.Close className="text-zinc-500 hover:text-zinc-200">
              <X className="w-4 h-4" />
            </Dialog.Close>
          </div>

          <div className="p-5 space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              <SummaryTile label="HTS Tape Cost" value={usd(cost.htsTapeCost)} />
              <SummaryTile label="Shielding Cost" value={usd(cost.shieldCost)} />
              <SummaryTile label="Launch Cost" value={usd(cost.launchCost)} />
              <SummaryTile label="Total CAPEX" value={usd(cost.totalCapex)} accent />
              <SummaryTile label="Fuel Burn Rate" value={`${usd(cost.fuelCostPerSecond)}/s`} />
              <SummaryTile label="Fuel Cost / Day" value={usd(cost.fuelCostPerDay)} />
              <SummaryTile label="Dry Mass" value={`${cost.dryMassKg.toFixed(0)} kg`} />
              <SummaryTile label="HTS Tape Length" value={`${cost.htsTapeLengthM.toFixed(0)} m`} />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs uppercase tracking-wider text-zinc-400">Bill of Materials</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleExport('csv')}
                    className="flex items-center gap-1 text-[11px] font-mono-tech text-zinc-400 hover:text-ignis-cyan border border-ignis-border hover:border-ignis-cyan/40 rounded px-2 py-1"
                  >
                    <Download className="w-3 h-3" /> CSV
                  </button>
                  <button
                    onClick={() => handleExport('json')}
                    className="flex items-center gap-1 text-[11px] font-mono-tech text-zinc-400 hover:text-ignis-cyan border border-ignis-border hover:border-ignis-cyan/40 rounded px-2 py-1"
                  >
                    <Download className="w-3 h-3" /> JSON
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto rounded-lg border border-ignis-border">
                <table className="w-full text-xs font-mono-tech">
                  <thead>
                    <tr className="bg-ignis-panel text-zinc-500 text-left">
                      <th className="px-3 py-2 font-normal">Category</th>
                      <th className="px-3 py-2 font-normal">Item</th>
                      <th className="px-3 py-2 font-normal text-right">Qty</th>
                      <th className="px-3 py-2 font-normal text-right">Unit Cost</th>
                      <th className="px-3 py-2 font-normal text-right">Total</th>
                      <th className="px-3 py-2 font-normal text-right">Mass (kg)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bom.map((item) => (
                      <tr key={item.id} className="border-t border-ignis-border/70 text-zinc-300">
                        <td className="px-3 py-2 text-zinc-500">{item.category}</td>
                        <td className="px-3 py-2">{item.name}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {item.quantity.toFixed(1)} {item.unit}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{usd(item.unitCost)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-ignis-cyan">{usd(item.totalCost)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{item.massKg.toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function SummaryTile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={cn(
        'panel-edge rounded-lg px-3 py-2.5',
        accent ? 'bg-ignis-orange/10 border-ignis-orange/30' : 'bg-ignis-panel/80',
      )}
    >
      <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">{label}</div>
      <div className={cn('font-mono-tech text-base font-semibold', accent ? 'text-ignis-orange' : 'text-zinc-200')}>
        {value}
      </div>
    </div>
  );
}
