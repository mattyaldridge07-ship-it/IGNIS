import { Boxes, Camera, Scissors } from 'lucide-react';
import { useEngineStore, type CameraPreset, type CutawayAxis, type SubsystemKey } from '../../store/useEngineStore';
import { cn } from '../../lib/cn';

const LAYER_LABELS: { key: SubsystemKey; label: string }[] = [
  { key: 'frame', label: 'Frame' },
  { key: 'shielding', label: 'Shield' },
  { key: 'coils', label: 'HTS Coils' },
  { key: 'vacuumTube', label: 'Vacuum Tube' },
  { key: 'rfAntenna', label: 'RF Antenna' },
  { key: 'injectors', label: 'Injectors' },
  { key: 'nozzle', label: 'Nozzle' },
  { key: 'plasma', label: 'Plasma' },
  { key: 'fieldLines', label: 'Field Lines' },
];

const CAMERA_PRESETS: { key: CameraPreset; label: string }[] = [
  { key: 'iso', label: 'ISO' },
  { key: 'front', label: 'Front' },
  { key: 'side', label: 'Side' },
  { key: 'top', label: 'Top' },
  { key: 'throat', label: 'Throat' },
];

const CUTAWAY_OPTIONS: { key: CutawayAxis; label: string }[] = [
  { key: 'none', label: 'Off' },
  { key: 'XZ', label: 'X-Z' },
  { key: 'YZ', label: 'Y-Z' },
];

export function ViewportControls() {
  const explosionFactor = useEngineStore((s) => s.explosionFactor);
  const setExplosionFactor = useEngineStore((s) => s.setExplosionFactor);
  const cutawayAxis = useEngineStore((s) => s.cutawayAxis);
  const setCutawayAxis = useEngineStore((s) => s.setCutawayAxis);
  const cutawayOffset = useEngineStore((s) => s.cutawayOffset);
  const setCutawayOffset = useEngineStore((s) => s.setCutawayOffset);
  const cameraPreset = useEngineStore((s) => s.cameraPreset);
  const setCameraPreset = useEngineStore((s) => s.setCameraPreset);
  const activeLayers = useEngineStore((s) => s.activeLayers);
  const toggleLayer = useEngineStore((s) => s.toggleLayer);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 p-3 flex flex-col gap-2 items-center">
      <div className="pointer-events-auto flex flex-wrap items-center gap-3 bg-ignis-panel/90 backdrop-blur-md border border-ignis-border rounded-lg px-4 py-2.5 shadow-xl">
        <div className="flex items-center gap-2">
          <Boxes className="w-3.5 h-3.5 text-ignis-cyan" />
          <span className="text-[10px] uppercase tracking-wider text-zinc-500">Explode</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={explosionFactor}
            onChange={(e) => setExplosionFactor(Number(e.target.value))}
            className="w-32"
          />
          <span className="font-mono-tech text-xs text-ignis-cyan w-9 tabular-nums">
            {(explosionFactor * 100).toFixed(0)}%
          </span>
        </div>

        <div className="w-px h-6 bg-ignis-border" />

        <div className="flex items-center gap-2">
          <Scissors className="w-3.5 h-3.5 text-ignis-orange" />
          <span className="text-[10px] uppercase tracking-wider text-zinc-500">Cutaway</span>
          <div className="flex bg-ignis-void rounded p-0.5 border border-ignis-border">
            {CUTAWAY_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setCutawayAxis(opt.key)}
                className={cn(
                  'px-2 py-0.5 text-[10px] font-mono-tech rounded',
                  cutawayAxis === opt.key ? 'bg-ignis-orange/20 text-ignis-orange' : 'text-zinc-500 hover:text-zinc-300',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {cutawayAxis !== 'none' && (
            <input
              type="range"
              min={-1}
              max={1}
              step={0.01}
              value={cutawayOffset}
              onChange={(e) => setCutawayOffset(Number(e.target.value))}
              className="w-24"
            />
          )}
        </div>

        <div className="w-px h-6 bg-ignis-border" />

        <div className="flex items-center gap-2">
          <Camera className="w-3.5 h-3.5 text-zinc-400" />
          <div className="flex bg-ignis-void rounded p-0.5 border border-ignis-border">
            {CAMERA_PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => setCameraPreset(p.key)}
                className={cn(
                  'px-2 py-0.5 text-[10px] font-mono-tech rounded',
                  cameraPreset === p.key ? 'bg-ignis-cyan/20 text-ignis-cyan' : 'text-zinc-500 hover:text-zinc-300',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 bg-ignis-panel/90 backdrop-blur-md border border-ignis-border rounded-lg px-3 py-1.5 shadow-xl">
        {LAYER_LABELS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => toggleLayer(key)}
            className={cn(
              'px-2 py-0.5 text-[10px] font-mono-tech rounded border transition-colors',
              activeLayers[key]
                ? 'border-ignis-cyan/40 text-ignis-cyan bg-ignis-cyan/10'
                : 'border-ignis-border text-zinc-600',
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
