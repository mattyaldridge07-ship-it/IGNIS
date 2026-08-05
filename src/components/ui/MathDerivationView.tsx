import * as Dialog from '@radix-ui/react-dialog';
import { BlockMath } from 'react-katex';
import { X, Sigma } from 'lucide-react';
import { useEngineStore } from '../../store/useEngineStore';
import { electronDensityAndZeff } from '../../physics/plasmaSolver';
import { FUEL_CYCLES } from '../../physics/physicsTypes';

function sci(value: number, digits = 3): string {
  if (!Number.isFinite(value) || value === 0) return '0';
  const exp = Math.floor(Math.log10(Math.abs(value)));
  const mantissa = value / Math.pow(10, exp);
  return `${mantissa.toFixed(digits)} \\times 10^{${exp}}`;
}

function fixed(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return '\\infty';
  return value.toFixed(digits);
}

export function MathDerivationView() {
  const open = useEngineStore((s) => s.mathDrawerOpen);
  const setOpen = useEngineStore((s) => s.setMathDrawerOpen);
  const plasmaParams = useEngineStore((s) => s.plasmaParams);
  const plasma = useEngineStore((s) => s.plasma);
  const magnetics = useEngineStore((s) => s.magnetics);
  const nozzle = useEngineStore((s) => s.nozzle);
  const nozzleParams = useEngineStore((s) => s.nozzleParams);
  const coreBeta = useEngineStore((s) => s.coreBeta);

  const species = FUEL_CYCLES[plasmaParams.fuel];
  const { ne, zEff } = electronDensityAndZeff(plasmaParams.coreDensity, plasmaParams.fuel);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-40" />
        <Dialog.Content className="fixed right-0 top-0 h-full w-full max-w-md bg-ignis-bg border-l border-ignis-border z-50 overflow-y-auto shadow-2xl">
          <div className="flex items-center justify-between px-4 h-14 border-b border-ignis-border sticky top-0 bg-ignis-bg/95 backdrop-blur-sm">
            <Dialog.Title className="flex items-center gap-2 text-sm font-mono-tech text-zinc-200">
              <Sigma className="w-4 h-4 text-ignis-cyan" />
              Live Derivations
            </Dialog.Title>
            <Dialog.Close className="text-zinc-500 hover:text-zinc-200">
              <X className="w-4 h-4" />
            </Dialog.Close>
          </div>

          <div className="p-5 space-y-6 text-sm">
            <section>
              <h3 className="text-xs uppercase tracking-wider text-ignis-orange mb-2">Fusion Reactivity</h3>
              <BlockMath math={`\\langle \\sigma v \\rangle (T_i = ${fixed(plasmaParams.ionTempKeV, 1)}\\,\\text{keV}) = ${sci(plasma.reactivityM3s)}\\ \\text{m}^3/\\text{s}`} />
              <p className="text-[11px] text-zinc-500">Bosch-Hale parametrisation for {species.label}.</p>
            </section>

            <section>
              <h3 className="text-xs uppercase tracking-wider text-ignis-orange mb-2">Fusion Power Density</h3>
              <BlockMath math={`P_{fus} = n_1 n_2 \\langle \\sigma v \\rangle E_{rxn} V_{core}`} />
              <BlockMath
                math={`P_{fus} = (${sci(plasmaParams.coreDensity / 2)})^2 (${sci(plasma.reactivityM3s)}) (${fixed(
                  species.eRxnMeV,
                  2,
                )}\\,\\text{MeV}) (${fixed(plasma.coreVolumeM3, 2)}\\,\\text{m}^3) = ${fixed(plasma.fusionPowerMW, 2)}\\,\\text{MW}`}
              />
            </section>

            <section>
              <h3 className="text-xs uppercase tracking-wider text-ignis-orange mb-2">Bremsstrahlung Loss</h3>
              <BlockMath math={`P_{brem} = 1.69\\times10^{-38} Z_{eff} n_e^2 \\sqrt{T_e}\\ \\ [\\text{W/m}^3]`} />
              <BlockMath
                math={`P_{brem} = 1.69\\times10^{-38} (${fixed(zEff, 2)}) (${sci(ne)})^2 \\sqrt{${fixed(
                  plasmaParams.ionTempKeV,
                  1,
                )}} = ${fixed(plasma.bremsstrahlungLossMW, 3)}\\,\\text{MW}`}
              />
            </section>

            <section>
              <h3 className="text-xs uppercase tracking-wider text-ignis-orange mb-2">Synchrotron Loss</h3>
              <BlockMath
                math={`P_{sync} = 6.2\\times10^{-17} n_e T_e B^2 \\left(1+\\frac{T_e}{204}\\right)(1-R_{wall})`}
              />
              <BlockMath
                math={`P_{sync} = ${fixed(plasma.synchrotronLossMW, 3)}\\,\\text{MW}\\quad (B_{center} = ${fixed(
                  Math.abs(magnetics.bCenterT),
                  2,
                )}\\,\\text{T})`}
              />
            </section>

            <section>
              <h3 className="text-xs uppercase tracking-wider text-ignis-cyan mb-2">Net Jet Power</h3>
              <BlockMath math={`P_{jet} = \\eta_{trap}(P_{fus,charged} + P_{RF}) - P_{brem} - P_{sync}`} />
              <BlockMath
                math={`P_{jet} = ${fixed(plasmaParams.trapEfficiency, 2)}(${fixed(
                  plasma.fusionPowerChargedMW,
                  2,
                )} + ${fixed(plasmaParams.rfPowerMW, 2)}) - ${fixed(plasma.bremsstrahlungLossMW, 2)} - ${fixed(
                  plasma.synchrotronLossMW,
                  2,
                )} = ${fixed(plasma.netJetPowerMW, 2)}\\,\\text{MW}`}
              />
            </section>

            <section>
              <h3 className="text-xs uppercase tracking-wider text-ignis-cyan mb-2">Biot-Savart Axial Field</h3>
              <BlockMath math={`B_z(z) = \\frac{\\mu_0}{2}\\sum_{i=1}^{N} \\frac{I_i R_i^2}{((z-z_i)^2+R_i^2)^{3/2}}`} />
              <BlockMath
                math={`B_{center} = ${fixed(Math.abs(magnetics.bCenterT), 3)}\\,\\text{T}\\quad B_{throat} = ${fixed(
                  magnetics.bThroatT,
                  3,
                )}\\,\\text{T}`}
              />
            </section>

            <section>
              <h3 className="text-xs uppercase tracking-wider text-ignis-cyan mb-2">Mirror Confinement</h3>
              <BlockMath math={`R_m = \\frac{B_{throat}}{B_{center}}\\qquad \\theta_{loss} = \\arcsin(1/\\sqrt{R_m})`} />
              <BlockMath
                math={`R_m = ${fixed(magnetics.mirrorRatio, 2)}\\qquad \\theta_{loss} = ${fixed(
                  magnetics.lossConeAngleDeg,
                  1,
                )}^\\circ`}
              />
            </section>

            <section>
              <h3 className="text-xs uppercase tracking-wider text-ignis-cyan mb-2">Plasma Beta</h3>
              <BlockMath math={`\\beta = \\frac{p_{plasma}}{p_{mag}} = \\frac{2 n_0 k_B T_i}{B^2/2\\mu_0}`} />
              <BlockMath math={`\\beta = ${fixed(coreBeta, 3)}`} />
            </section>

            <section>
              <h3 className="text-xs uppercase tracking-wider text-ignis-green mb-2">Exhaust &amp; Thrust</h3>
              <BlockMath math={`v_e = \\sqrt{\\frac{2\\eta_{nozzle} P_{jet}}{\\dot{m}}} \\qquad I_{sp} = \\frac{v_e}{g_0} \\qquad F = \\dot{m} v_e`} />
              <BlockMath
                math={`v_e = \\sqrt{\\frac{2 (${fixed(nozzleParams.nozzleEfficiency, 2)})(${fixed(
                  plasma.netJetPowerMW * 1e6,
                  0,
                )}\\,\\text{W})}{${sci(nozzle.massFlowKgS)}\\,\\text{kg/s}}} = ${fixed(
                  nozzle.exhaustVelocityMS,
                  0,
                )}\\,\\text{m/s}`}
              />
              <BlockMath
                math={`I_{sp} = ${fixed(nozzle.exhaustVelocityMS, 0)} / 9.80665 = ${fixed(
                  nozzle.specificImpulseS,
                  0,
                )}\\,\\text{s}\\qquad F = ${fixed(nozzle.thrustN, 2)}\\,\\text{N}`}
              />
            </section>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
