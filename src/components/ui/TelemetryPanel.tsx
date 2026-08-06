import type React from 'react';
import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Gauge, Zap, Wind, Sigma, CircleGauge, Flame, Percent, ShieldAlert } from 'lucide-react';
import { useEngineStore } from '../../store/useEngineStore';
import { solveNozzleState } from '../../physics/nozzleSolver';
import { Panel } from './Panel';
import { cn } from '../../lib/cn';

/** Adaptive formatting: fixed decimals for readable magnitudes, scientific notation
 * outside that range so genuinely tiny/huge (but real) values don't collapse to "0.00". */
function compact(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return '∞';
  if (value !== 0 && (Math.abs(value) < 0.01 || Math.abs(value) >= 100000)) {
    return value.toExponential(digits);
  }
  return value.toFixed(digits);
}

function StatTile({
  label,
  value,
  unit,
  icon,
  accent = 'cyan',
}: {
  label: string;
  value: string;
  unit: string;
  icon: React.ReactNode;
  accent?: 'cyan' | 'orange' | 'green';
}) {
  const colorClass =
    accent === 'cyan' ? 'text-ignis-cyan' : accent === 'orange' ? 'text-ignis-orange' : 'text-ignis-green';
  return (
    <div className="panel-edge rounded-lg bg-ignis-panel/80 px-3 py-2.5 flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-zinc-500">
        {icon}
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <div className={cn('font-mono-tech text-lg font-semibold tabular-nums', colorClass)}>
        {value}
        <span className="text-xs text-zinc-500 ml-1">{unit}</span>
      </div>
    </div>
  );
}

const tooltipStyle = {
  background: '#101014',
  border: '1px solid #26262e',
  borderRadius: 6,
  fontSize: 11,
  fontFamily: 'var(--font-mono)',
  color: '#e4e4e7',
};

export function TelemetryPanel() {
  const plasma = useEngineStore((s) => s.plasma);
  const nozzle = useEngineStore((s) => s.nozzle);
  const magnetics = useEngineStore((s) => s.magnetics);
  const coreBeta = useEngineStore((s) => s.coreBeta);
  const nozzleParams = useEngineStore((s) => s.nozzleParams);

  const ispCurve = useMemo(() => {
    const points = [];
    for (let mdot = 5; mdot <= 200; mdot += 5) {
      const state = solveNozzleState(
        plasma.netJetPowerMW,
        { ...nozzleParams, propMassFlowMgS: mdot },
        magnetics.bThroatT,
        magnetics.bExitT,
      );
      points.push({ mdot, isp: state.specificImpulseS });
    }
    return points;
  }, [plasma.netJetPowerMW, nozzleParams, magnetics.bThroatT, magnetics.bExitT]);

  const powerBalance = [
    { name: 'Fusion', value: plasma.fusionPowerMW, fill: '#fb923c' },
    { name: 'Bremsstrahlung', value: -plasma.bremsstrahlungLossMW, fill: '#f43f5e' },
    { name: 'Synchrotron', value: -plasma.synchrotronLossMW, fill: '#a78bfa' },
    { name: 'Net Jet', value: plasma.netJetPowerMW, fill: '#22d3ee' },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-2.5">
        <StatTile
          label="Specific Impulse"
          value={nozzle.specificImpulseS.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          unit="s"
          icon={<Wind className="w-3 h-3" />}
        />
        <StatTile
          label="Thrust"
          value={nozzle.thrustN.toFixed(2)}
          unit="N"
          icon={<Gauge className="w-3 h-3" />}
        />
        <StatTile
          label="Net Jet Power"
          value={plasma.netJetPowerMW.toFixed(2)}
          unit="MW"
          icon={<Zap className="w-3 h-3" />}
          accent="orange"
        />
        <StatTile
          label="Q-Factor"
          value={Number.isFinite(plasma.qFactor) ? plasma.qFactor.toFixed(2) : '∞'}
          unit="Pfus/Prf"
          icon={<Sigma className="w-3 h-3" />}
          accent="green"
        />
        <StatTile
          label="Core Beta"
          value={coreBeta.toFixed(3)}
          unit="β"
          icon={<CircleGauge className="w-3 h-3" />}
          accent={coreBeta > 1 ? 'orange' : 'cyan'}
        />
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5">
        <StatTile
          label="Ignition Margin"
          value={compact(plasma.ignitionMarginFactor)}
          unit="fα"
          icon={<Flame className="w-3 h-3" />}
          accent={plasma.ignitionMarginFactor >= 1 ? 'green' : 'orange'}
        />
        <StatTile
          label="Fuel Burn-up"
          value={compact(plasma.burnupFraction * 100)}
          unit="%"
          icon={<Percent className="w-3 h-3" />}
        />
        <StatTile
          label="Nozzle Conversion"
          value={compact(nozzle.conversionEfficiency * 100, 1)}
          unit="%"
          icon={<Wind className="w-3 h-3" />}
          accent="green"
        />
        <StatTile
          label="Coil Structural Margin"
          value={compact(magnetics.minStructuralMargin)}
          unit="×"
          icon={<ShieldAlert className="w-3 h-3" />}
          accent={magnetics.structuralWarning ? 'orange' : 'cyan'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
        <Panel title="Isp vs Propellant Mass Flow" accent="cyan">
          <ResponsiveContainer width="100%" height={170}>
            <LineChart data={ispCurve} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="#1f1f24" strokeDasharray="3 3" />
              <XAxis
                dataKey="mdot"
                stroke="#71717a"
                fontSize={10}
                tickLine={false}
                label={{ value: 'mg/s', position: 'insideBottomRight', offset: -2, fontSize: 10, fill: '#71717a' }}
              />
              <YAxis stroke="#71717a" fontSize={10} tickLine={false} width={46} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#a1a1aa' }} />
              <Line type="monotone" dataKey="isp" stroke="#22d3ee" strokeWidth={2} dot={false} />
              <ReferenceDot
                x={nozzleParams.propMassFlowMgS}
                y={nozzle.specificImpulseS}
                r={4}
                fill="#f8fafc"
                stroke="#22d3ee"
              />
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Power Balance (MW)" accent="orange">
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={powerBalance} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="#1f1f24" strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke="#71717a" fontSize={9.5} tickLine={false} />
              <YAxis stroke="#71717a" fontSize={10} tickLine={false} width={46} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#a1a1aa' }} />
              <Bar dataKey="value" radius={[3, 3, 3, 3]}>
                {powerBalance.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>
    </div>
  );
}
