import * as RadixSlider from '@radix-ui/react-slider';
import { cn } from '../../lib/cn';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  formatValue?: (v: number) => string;
  onChange: (value: number) => void;
  accent?: 'cyan' | 'orange';
}

export function Slider({
  label,
  value,
  min,
  max,
  step = (max - min) / 100,
  unit = '',
  formatValue,
  onChange,
  accent = 'cyan',
}: SliderProps) {
  const display = formatValue ? formatValue(value) : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  const accentColor = accent === 'cyan' ? 'bg-ignis-cyan' : 'bg-ignis-orange';

  return (
    <div className="mb-4">
      <div className="flex items-baseline justify-between mb-1.5">
        <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">{label}</label>
        <span
          className={cn(
            'font-mono-tech text-xs tabular-nums',
            accent === 'cyan' ? 'text-ignis-cyan' : 'text-ignis-orange',
          )}
        >
          {display}
          {unit}
        </span>
      </div>
      <RadixSlider.Root
        className="relative flex items-center select-none touch-none w-full h-4"
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
      >
        <RadixSlider.Track className="bg-zinc-800 relative grow rounded-full h-[3px]">
          <RadixSlider.Range className={cn('absolute rounded-full h-full', accentColor)} />
        </RadixSlider.Track>
        <RadixSlider.Thumb
          className="block w-3 h-3 rounded-full bg-zinc-200 border border-ignis-void focus:outline-none focus:ring-2 focus:ring-ignis-cyan/50 cursor-pointer"
        />
      </RadixSlider.Root>
    </div>
  );
}
