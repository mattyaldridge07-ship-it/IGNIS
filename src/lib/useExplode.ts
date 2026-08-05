import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useEngineStore } from '../store/useEngineStore';

/** Smoothly damps an object's position from basePosition toward basePosition + direction*distance*explosionFactor. */
export function useExplode(
  basePosition: [number, number, number],
  direction: [number, number, number],
  distance: number,
) {
  const ref = useRef<THREE.Object3D>(null);
  const explosionFactor = useEngineStore((s) => s.explosionFactor);
  const base = useRef(new THREE.Vector3(...basePosition)).current;
  const dir = useRef(
    direction[0] === 0 && direction[1] === 0 && direction[2] === 0
      ? new THREE.Vector3()
      : new THREE.Vector3(...direction).normalize(),
  ).current;
  const target = useRef(new THREE.Vector3()).current;

  useFrame((_, delta) => {
    if (!ref.current) return;
    target.copy(base).addScaledVector(dir, distance * explosionFactor);
    ref.current.position.x = THREE.MathUtils.damp(ref.current.position.x, target.x, 6, delta);
    ref.current.position.y = THREE.MathUtils.damp(ref.current.position.y, target.y, 6, delta);
    ref.current.position.z = THREE.MathUtils.damp(ref.current.position.z, target.z, 6, delta);
  });

  return ref;
}
