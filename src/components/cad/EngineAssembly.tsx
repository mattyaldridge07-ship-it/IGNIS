import type React from 'react';
import * as THREE from 'three';
import { useEngineStore } from '../../store/useEngineStore';
import { useCutawayMaterial } from '../../lib/useCutawayMaterial';
import { useExplode } from '../../lib/useExplode';
import { SubsystemLayer } from './SubsystemLayer';
import { VolumetricPlasma } from './VolumetricPlasma';
import { FieldLines } from './FieldLines';

function CoilRing({ z, radius, current }: { z: number; radius: number; current: number }) {
  const dir: [number, number, number] = [0, z >= 0 ? 1 : -1, 0];
  const ref = useExplode([0, z, 0], dir, 0.55);
  const intensity = THREE.MathUtils.clamp(Math.abs(current) / 1e5, 0.4, 2.2);
  return (
    <group ref={ref as React.RefObject<THREE.Group>}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius, 0.045, 12, 48]} />
        <meshStandardMaterial
          color="#33475a"
          emissive="#6e93b3"
          emissiveIntensity={intensity}
          metalness={0.6}
          roughness={0.4}
        />
      </mesh>
    </group>
  );
}

function FrameStrut({ angle, radius, length }: { angle: number; radius: number; length: number }) {
  const x = radius * Math.cos(angle);
  const z = radius * Math.sin(angle);
  const dir: [number, number, number] = [Math.cos(angle), 0, Math.sin(angle)];
  const ref = useExplode([x, 0, z], dir, 0.5);
  return (
    <group ref={ref as React.RefObject<THREE.Group>}>
      <mesh>
        <cylinderGeometry args={[0.025, 0.025, length, 8]} />
        <meshStandardMaterial color="#9f9fab" metalness={0.7} roughness={0.35} />
      </mesh>
    </group>
  );
}

function InjectorCone({ angle, radius }: { angle: number; radius: number }) {
  const x = radius * Math.cos(angle);
  const z = radius * Math.sin(angle);
  const dir: [number, number, number] = [Math.cos(angle), 0, Math.sin(angle)];
  const ref = useExplode([x, 0, z], dir, 0.35);
  return (
    <group ref={ref as React.RefObject<THREE.Group>} rotation={[0, -angle, Math.PI / 2]}>
      <mesh>
        <coneGeometry args={[0.035, 0.14, 12]} />
        <meshStandardMaterial color="#b8925a" emissive="#8f7146" emissiveIntensity={0.5} metalness={0.4} roughness={0.45} />
      </mesh>
    </group>
  );
}

export function EngineAssembly() {
  const coreRadius = useEngineStore((s) => s.plasmaParams.coreRadius);
  const coreLength = useEngineStore((s) => s.plasmaParams.coreLength);
  const coils = useEngineStore((s) => s.magnetics.coils);
  const shieldOuterRadius = useEngineStore((s) => s.costParams.shieldOuterRadiusM);
  const shieldThickness = useEngineStore((s) => s.costParams.shieldThicknessM);
  const shieldLength = useEngineStore((s) => s.costParams.shieldLengthM);

  const shieldInnerRadius = Math.max(shieldOuterRadius - shieldThickness, 0.05);
  const frameRadius = shieldOuterRadius * 1.18;
  const shieldColor = useCutawayMaterial('#83838c', '#b8925a', 1);

  const strutAngles = Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2);
  const injectorAngles = Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2);
  const injectorRadius = coreRadius * 1.05;
  const injectorY = coreLength / 2 + 0.15;

  return (
    <group>
      <VolumetricPlasma />
      <FieldLines />

      <SubsystemLayer layerKey="vacuumTube" explodeDir={[0, 0, 0]} explodeDistance={0}>
        <mesh>
          <cylinderGeometry args={[coreRadius * 1.15, coreRadius * 1.15, coreLength * 1.08, 48, 1, true]} />
          <meshPhysicalMaterial
            color="#8ca0ac"
            transparent
            opacity={0.12}
            depthWrite={false}
            roughness={0.05}
            metalness={0}
            transmission={0.85}
            side={THREE.DoubleSide}
          />
        </mesh>
      </SubsystemLayer>

      <SubsystemLayer layerKey="coils" explodeDir={[0, 0, 0]} explodeDistance={0}>
        {coils.map((coil, i) => (
          <CoilRing key={i} z={coil.z} radius={coil.radius} current={coil.currentA} />
        ))}
      </SubsystemLayer>

      <SubsystemLayer layerKey="shielding" explodeDir={[0, 0, 0]} explodeDistance={0}>
        <ShieldHalf
          side={1}
          outerRadius={shieldOuterRadius}
          innerRadius={shieldInnerRadius}
          length={shieldLength / 2}
          material={shieldColor}
        />
        <ShieldHalf
          side={-1}
          outerRadius={shieldOuterRadius}
          innerRadius={shieldInnerRadius}
          length={shieldLength / 2}
          material={shieldColor}
        />
      </SubsystemLayer>

      <SubsystemLayer layerKey="frame" explodeDir={[0, 0, 0]} explodeDistance={0}>
        {strutAngles.map((angle, i) => (
          <FrameStrut key={i} angle={angle} radius={frameRadius} length={shieldLength * 1.05} />
        ))}
        <mesh position={[0, shieldLength / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[frameRadius, 0.03, 8, 32]} />
          <meshStandardMaterial color="#9f9fab" metalness={0.7} roughness={0.35} />
        </mesh>
        <mesh position={[0, -shieldLength / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[frameRadius, 0.03, 8, 32]} />
          <meshStandardMaterial color="#9f9fab" metalness={0.7} roughness={0.35} />
        </mesh>
      </SubsystemLayer>

      <SubsystemLayer
        layerKey="rfAntenna"
        basePosition={[0, coreLength / 2 + 0.4, 0]}
        explodeDir={[0, 1, 0]}
        explodeDistance={0.5}
      >
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[coreRadius * 1.25, 0.025, 10, 48]} />
          <meshStandardMaterial color="#a67f4e" emissive="#8f7146" emissiveIntensity={0.4} metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.12, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[coreRadius * 1.25, 0.02, 10, 48]} />
          <meshStandardMaterial color="#a67f4e" emissive="#8f7146" emissiveIntensity={0.4} metalness={0.6} roughness={0.4} />
        </mesh>
      </SubsystemLayer>

      <SubsystemLayer layerKey="injectors" explodeDir={[0, 0, 0]} explodeDistance={0}>
        {injectorAngles.map((angle, i) => (
          <InjectorCone key={i} angle={angle} radius={injectorRadius} />
        ))}
        <group position={[0, injectorY, 0]}>
          {injectorAngles.map((angle, i) => (
            <InjectorCone key={i} angle={angle} radius={injectorRadius} />
          ))}
        </group>
      </SubsystemLayer>

      <SubsystemLayer
        layerKey="nozzle"
        basePosition={[0, -coreLength / 2 - 0.3, 0]}
        explodeDir={[0, -1, 0]}
        explodeDistance={0.7}
      >
        <mesh>
          <cylinderGeometry args={[coreRadius * 0.5, coreRadius * 0.5, 0.25, 32, 1, true]} />
          <meshStandardMaterial color="#a1a1aa" metalness={0.85} roughness={0.25} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, -0.55, 0]}>
          <cylinderGeometry args={[coreRadius * 0.5, coreRadius * 1.6, 0.85, 32, 1, true]} />
          <meshStandardMaterial color="#d4d4d8" metalness={0.9} roughness={0.2} side={THREE.DoubleSide} />
        </mesh>
      </SubsystemLayer>

      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 6, 4]} intensity={1.8} color="#d8dee2" />
      <directionalLight position={[-5, -2, -3]} intensity={0.5} color="#8f7146" />
      <pointLight position={[0, 0, 0]} intensity={0.35} color="#6e93b3" distance={4} />
    </group>
  );
}

function ShieldHalf({
  side,
  outerRadius,
  innerRadius,
  length,
  material,
}: {
  side: 1 | -1;
  outerRadius: number;
  innerRadius: number;
  length: number;
  material: THREE.ShaderMaterial;
}) {
  const basePos: [number, number, number] = [0, (side * length) / 2, 0];
  const ref = useExplode(basePos, [0, side, 0], 0.9);
  return (
    <group ref={ref as React.RefObject<THREE.Group>} position={basePos}>
      <mesh material={material}>
        <cylinderGeometry args={[outerRadius, outerRadius, length, 48, 1, true]} />
      </mesh>
      <mesh material={material} position={[0, (side * length) / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[innerRadius, outerRadius, 48]} />
      </mesh>
    </group>
  );
}
