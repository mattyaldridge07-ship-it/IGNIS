import type React from 'react';
import type * as THREE from 'three';
import { useEngineStore, type SubsystemKey } from '../../store/useEngineStore';
import { useExplode } from '../../lib/useExplode';

interface SubsystemLayerProps {
  layerKey: SubsystemKey;
  basePosition?: [number, number, number];
  explodeDir?: [number, number, number];
  explodeDistance?: number;
  children: React.ReactNode;
}

export function SubsystemLayer({
  layerKey,
  basePosition = [0, 0, 0],
  explodeDir = [0, 0, 0],
  explodeDistance = 0,
  children,
}: SubsystemLayerProps) {
  const active = useEngineStore((s) => s.activeLayers[layerKey]);
  const groupRef = useExplode(basePosition, explodeDir, explodeDistance);

  if (!active) return null;

  return (
    <group ref={groupRef as React.RefObject<THREE.Group>} position={basePosition}>
      {children}
    </group>
  );
}
