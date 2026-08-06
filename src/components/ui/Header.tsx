import { Atom, AlertTriangle, CircleCheck, FileDown, Sigma } from 'lucide-react';
import { useEngineStore } from '../../store/useEngineStore';
import { cn } from '../../lib/cn';
import type { FuelCycle } from '../../physics/physicsTypes';

export function Header() {
  const plasmaParams = useEngineStore((s) => s.plasmaParams);
  const loadPreset = useEngineStore((s) => s.loadPreset);
  const quenchWarning = useEngineStore((s) => s.magnetics.quenchWarning);
  const structuralWarning = useEngineStore((s) => s.magnetics.structuralWarning);
  const coreBeta = useEngineStore((s) => s.coreBeta);
  const setMathDrawerOpen = useEngineStore((s) => s.setMathDrawerOpen);
  const setCostModalOpen = useEngineStore((s) => s.setCostModalOpen);

  const nominal = !quenchWarning && !structuralWarning && coreBeta < 1;

  const presets: { id: FuelCycle; label: string }[] = [
    { id: 'D-3He', label: 'D-³He' },
    { id: 'D-T', label: 'D-T' },
  ];

  return (
    <header className="h-14 shrink-0 border-b border-ignis-border bg-ignis-bg flex items-center justify-between px-4 z-20">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Atom className="w-5 h-5 text-ignis-cyan" strokeWidth={1.5} />
          <span className="font-mono-tech font-semibold tracking-[0.2em] text-sm text-zinc-200">IGNIS</span>
        </div>
        <span className="hidden md:inline text-[11px] text-zinc-500 font-mono-tech">
          Direct Fusion Drive Digital Twin
        </span>
      </div>

      <div className="flex items-center gap-1 bg-ignis-panel rounded-md p-0.5 border border-ignis-border">
        {presets.map((p) => (
          <button
            key={p.id}
            onClick={() => loadPreset(p.id)}
            className={cn(
              'px-3 py-1 text-xs font-mono-tech rounded transition-colors',
              plasmaParams.fuel === p.id
                ? 'bg-ignis-cyan/15 text-ignis-cyan'
                : 'text-zinc-500 hover:text-zinc-300',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setMathDrawerOpen(true)}
          className="flex items-center gap-1.5 text-xs font-mono-tech text-zinc-400 hover:text-ignis-cyan transition-colors px-2 py-1 rounded border border-ignis-border hover:border-ignis-cyan/40"
        >
          <Sigma className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Derivations</span>
        </button>
        <button
          onClick={() => setCostModalOpen(true)}
          className="flex items-center gap-1.5 text-xs font-mono-tech text-zinc-400 hover:text-ignis-orange transition-colors px-2 py-1 rounded border border-ignis-border hover:border-ignis-orange/40"
        >
          <FileDown className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">BOM / Cost</span>
        </button>

        <div
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono-tech border',
            nominal
              ? 'border-ignis-green/40 text-ignis-green bg-ignis-green/10'
              : 'border-ignis-red/40 text-ignis-red bg-ignis-red/10 animate-pulse-slow',
          )}
        >
          {nominal ? <CircleCheck className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
          {nominal ? 'NOMINAL' : quenchWarning ? 'QUENCH RISK' : structuralWarning ? 'STRUCTURAL LIMIT' : 'BETA LIMIT'}
        </div>
      </div>
    </header>
  );
}
