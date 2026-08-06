import type React from 'react';
import { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { ChevronUp } from 'lucide-react';
import { Header } from './components/ui/Header';
import { SidebarControls } from './components/ui/SidebarControls';
import { TelemetryPanel } from './components/ui/TelemetryPanel';
import { ViewportControls } from './components/ui/ViewportControls';
import { MathDerivationView } from './components/ui/MathDerivationView';
import { CostAnalysisModal } from './components/ui/CostAnalysisModal';
import { EngineAssembly } from './components/cad/EngineAssembly';
import { useEngineStore, type CameraPreset } from './store/useEngineStore';
import { cn } from './lib/cn';

const PRESET_POS: Record<CameraPreset, [number, number, number]> = {
  iso: [4.5, 3, 4.5],
  front: [0, 0.4, 6.5],
  side: [6.5, 0.4, 0],
  top: [0.01, 7, 0.01],
  throat: [0, -4.5, 2.8],
};

const PRESET_TARGET: Record<CameraPreset, [number, number, number]> = {
  iso: [0, 0, 0],
  front: [0, 0, 0],
  side: [0, 0, 0],
  top: [0, 0, 0],
  throat: [0, -1.6, 0],
};

function CameraRig({ controlsRef }: { controlsRef: React.RefObject<OrbitControlsImpl | null> }) {
  const cameraPreset = useEngineStore((s) => s.cameraPreset);
  const lastPreset = useRef(cameraPreset);
  const transitioning = useRef(false);

  if (lastPreset.current !== cameraPreset) {
    lastPreset.current = cameraPreset;
    transitioning.current = true;
  }

  useFrame((state, delta) => {
    // Only steer the camera while a preset transition is in flight, so it
    // never fights the user's manual orbit/zoom/pan once settled.
    if (!transitioning.current) return;

    const pos = PRESET_POS[cameraPreset];
    const tgt = PRESET_TARGET[cameraPreset];
    state.camera.position.x = THREE.MathUtils.damp(state.camera.position.x, pos[0], 3, delta);
    state.camera.position.y = THREE.MathUtils.damp(state.camera.position.y, pos[1], 3, delta);
    state.camera.position.z = THREE.MathUtils.damp(state.camera.position.z, pos[2], 3, delta);

    if (controlsRef.current) {
      controlsRef.current.target.x = THREE.MathUtils.damp(controlsRef.current.target.x, tgt[0], 3, delta);
      controlsRef.current.target.y = THREE.MathUtils.damp(controlsRef.current.target.y, tgt[1], 3, delta);
      controlsRef.current.target.z = THREE.MathUtils.damp(controlsRef.current.target.z, tgt[2], 3, delta);
      controlsRef.current.update();
    }

    const dist = state.camera.position.distanceTo(new THREE.Vector3(...pos));
    if (dist < 0.02) transitioning.current = false;
  });

  return null;
}

function Viewport() {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  return (
    <div className="relative flex-1 min-h-[320px] bg-ignis-void">
      <Canvas camera={{ position: PRESET_POS.iso, fov: 42, near: 0.05, far: 60 }}>
        <color attach="background" args={['#08090a']} />
        <fog attach="fog" args={['#08090a', 9, 24]} />
        <EngineAssembly />
        <Grid
          position={[0, -2.4, 0]}
          args={[20, 20]}
          cellSize={0.5}
          cellThickness={0.4}
          cellColor="#1c1c1f"
          sectionSize={2.5}
          sectionThickness={0.7}
          sectionColor="#4c6a84"
          fadeDistance={16}
          fadeStrength={1.5}
          infiniteGrid
        />
        <OrbitControls ref={controlsRef} enableDamping dampingFactor={0.08} minDistance={1.5} maxDistance={18} />
        <CameraRig controlsRef={controlsRef} />
      </Canvas>
    </div>
  );
}

function App() {
  const [telemetryOpen, setTelemetryOpen] = useState(true);

  return (
    <div className="h-screen w-screen flex flex-col bg-ignis-void overflow-hidden">
      <Header />
      <div className="flex-1 min-h-0 flex">
        <SidebarControls />
        <main className="flex-1 min-w-0 flex flex-col">
          <Viewport />
          <ViewportControls />
          <button
            onClick={() => setTelemetryOpen((v) => !v)}
            className="shrink-0 flex items-center justify-center gap-1.5 py-1 text-[10px] font-mono-tech text-zinc-500 hover:text-zinc-300 border-t border-ignis-border bg-ignis-bg"
          >
            <ChevronUp className={cn('w-3 h-3 transition-transform', !telemetryOpen && 'rotate-180')} />
            {telemetryOpen ? 'Hide Telemetry' : 'Show Telemetry'}
          </button>
          {telemetryOpen && (
            <div className="shrink-0 max-h-[30%] overflow-y-auto p-3 bg-ignis-bg">
              <TelemetryPanel />
            </div>
          )}
        </main>
      </div>
      <MathDerivationView />
      <CostAnalysisModal />
    </div>
  );
}

export default App;
