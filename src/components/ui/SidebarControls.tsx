import { Flame, Magnet, Wind } from 'lucide-react';
import { useEngineStore } from '../../store/useEngineStore';
import { Panel } from './Panel';
import { Slider } from './Slider';
import { cn } from '../../lib/cn';
import type { FuelCycle } from '../../physics/physicsTypes';

function formatSci(v: number) {
  return v.toExponential(2);
}

export function SidebarControls() {
  const plasmaParams = useEngineStore((s) => s.plasmaParams);
  const magneticsParams = useEngineStore((s) => s.magneticsParams);
  const nozzleParams = useEngineStore((s) => s.nozzleParams);
  const setPlasmaParam = useEngineStore((s) => s.setPlasmaParam);
  const setMagneticsParam = useEngineStore((s) => s.setMagneticsParam);
  const setNozzleParam = useEngineStore((s) => s.setNozzleParam);
  const loadPreset = useEngineStore((s) => s.loadPreset);

  const densityExponent = Math.log10(plasmaParams.coreDensity);

  return (
    <aside className="w-[320px] shrink-0 border-r border-ignis-border bg-ignis-bg overflow-y-auto px-3 py-4 space-y-3">
      <Panel title="Plasma Core" icon={<Flame className="w-3.5 h-3.5" />} accent="orange">
        <Slider
          label="Central Ion Temperature"
          value={plasmaParams.ionTempKeV}
          min={10}
          max={100}
          unit=" keV"
          formatValue={(v) => v.toFixed(1)}
          onChange={(v) => setPlasmaParam('ionTempKeV', v)}
          accent="orange"
        />
        <Slider
          label="Core Ion Density (n₀)"
          value={densityExponent}
          min={19}
          max={21}
          step={0.01}
          unit=" m⁻³"
          formatValue={(v) => `10^${v.toFixed(2)}`}
          onChange={(v) => setPlasmaParam('coreDensity', Math.pow(10, v))}
          accent="orange"
        />
        <Slider
          label="Core Radius"
          value={plasmaParams.coreRadius}
          min={0.1}
          max={0.8}
          step={0.01}
          unit=" m"
          formatValue={(v) => v.toFixed(2)}
          onChange={(v) => setPlasmaParam('coreRadius', v)}
        />
        <Slider
          label="Core Length"
          value={plasmaParams.coreLength}
          min={1.0}
          max={4.5}
          step={0.05}
          unit=" m"
          formatValue={(v) => v.toFixed(2)}
          onChange={(v) => setPlasmaParam('coreLength', v)}
        />
        <Slider
          label="Density Profile Peaking (α)"
          value={plasmaParams.profileAlpha}
          min={0.3}
          max={3}
          step={0.05}
          formatValue={(v) => v.toFixed(2)}
          onChange={(v) => setPlasmaParam('profileAlpha', v)}
        />
        <Slider
          label="RF Auxiliary Heating Power"
          value={plasmaParams.rfPowerMW}
          min={0.1}
          max={10}
          step={0.1}
          unit=" MW"
          formatValue={(v) => v.toFixed(2)}
          onChange={(v) => setPlasmaParam('rfPowerMW', v)}
          accent="orange"
        />
      </Panel>

      <Panel title="Magnetics" icon={<Magnet className="w-3.5 h-3.5" />}>
        <Slider
          label="Peak Coil Current"
          value={magneticsParams.coilCurrentA}
          min={50}
          max={800}
          step={5}
          unit=" A"
          onChange={(v) => setMagneticsParam('coilCurrentA', v)}
        />
        <Slider
          label="HTS Turns per Coil"
          value={magneticsParams.turnsPerCoil}
          min={40}
          max={500}
          step={5}
          onChange={(v) => setMagneticsParam('turnsPerCoil', v)}
        />
        <Slider
          label="Coil Radius"
          value={magneticsParams.coilRadius}
          min={0.2}
          max={1.0}
          step={0.01}
          unit=" m"
          formatValue={(v) => v.toFixed(2)}
          onChange={(v) => setMagneticsParam('coilRadius', v)}
        />
        <Slider
          label="Mirror Throat Radius"
          value={magneticsParams.mirrorThroatRadius}
          min={0.1}
          max={magneticsParams.coilRadius}
          step={0.01}
          unit=" m"
          formatValue={(v) => v.toFixed(2)}
          onChange={(v) => setMagneticsParam('mirrorThroatRadius', v)}
        />
        <Slider
          label="Number of Coils"
          value={magneticsParams.numCoils}
          min={4}
          max={16}
          step={1}
          onChange={(v) => setMagneticsParam('numCoils', Math.round(v))}
        />
        <Slider
          label="Operating Temperature"
          value={magneticsParams.cryoTempK}
          min={20}
          max={77}
          step={1}
          unit=" K"
          onChange={(v) => setMagneticsParam('cryoTempK', v)}
        />
      </Panel>

      <Panel title="Propellant" icon={<Wind className="w-3.5 h-3.5" />}>
        <div className="mb-4">
          <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-400 block mb-1.5">
            Fuel Cycle
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {(['D-3He', 'D-T'] as FuelCycle[]).map((fuel) => (
              <button
                key={fuel}
                onClick={() => loadPreset(fuel)}
                className={cn(
                  'py-1.5 rounded text-xs font-mono-tech border transition-colors',
                  plasmaParams.fuel === fuel
                    ? 'border-ignis-cyan/50 bg-ignis-cyan/10 text-ignis-cyan'
                    : 'border-ignis-border text-zinc-500 hover:text-zinc-300',
                )}
              >
                {fuel === 'D-3He' ? 'D-³He' : 'D-T'}
              </button>
            ))}
          </div>
        </div>
        <Slider
          label="Auxiliary Propellant Flow"
          value={nozzleParams.propMassFlowMgS}
          min={1}
          max={200}
          step={1}
          unit=" mg/s"
          onChange={(v) => setNozzleParam('propMassFlowMgS', v)}
        />
        <Slider
          label="Nozzle Efficiency"
          value={nozzleParams.nozzleEfficiency}
          min={0.5}
          max={0.99}
          step={0.01}
          formatValue={(v) => `${(v * 100).toFixed(0)}%`}
          onChange={(v) => setNozzleParam('nozzleEfficiency', v)}
        />
        <Slider
          label="Wall Reflectivity"
          value={plasmaParams.wallReflectivity}
          min={0.5}
          max={0.99}
          step={0.01}
          formatValue={(v) => `${(v * 100).toFixed(0)}%`}
          onChange={(v) => setPlasmaParam('wallReflectivity', v)}
        />
      </Panel>
      <p className="text-[10px] text-zinc-600 font-mono-tech leading-relaxed px-1 pb-2">
        n(r,z) profile: n₀·(1-(r/a)²)^α·cos(πz/L) &nbsp;·&nbsp; core density shown as log₁₀(n₀) [{formatSci(
          plasmaParams.coreDensity,
        )} m⁻³]
      </p>
    </aside>
  );
}
