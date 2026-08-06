import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import plasmaVertex from '../../shaders/plasmaVertex.glsl?raw';
import plasmaFragment from '../../shaders/plasmaFragment.glsl?raw';
import { useEngineStore } from '../../store/useEngineStore';
import { SubsystemLayer } from './SubsystemLayer';

const TEMP_MIN = 10;
const TEMP_MAX = 100;
const DENSITY_MIN = 1e19;
const DENSITY_MAX = 1e21;

export function VolumetricPlasma() {
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();

  const coreRadius = useEngineStore((s) => s.plasmaParams.coreRadius);
  const coreLength = useEngineStore((s) => s.plasmaParams.coreLength);
  const profileAlpha = useEngineStore((s) => s.plasmaParams.profileAlpha);
  const ionTempKeV = useEngineStore((s) => s.plasmaParams.ionTempKeV);
  const coreDensity = useEngineStore((s) => s.plasmaParams.coreDensity);

  // openEnded=false: BackSide raymarching needs cap geometry to catch rays
  // entering through the top/bottom of the cylinder, not just the side wall.
  const geometry = useMemo(() => new THREE.CylinderGeometry(1, 1, 2, 64, 1, false), []);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: plasmaVertex,
      fragmentShader: plasmaFragment,
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uCameraPosLocal: { value: new THREE.Vector3() },
        uTime: { value: 0 },
        uAlpha: { value: 1.2 },
        uTempNorm: { value: 0.5 },
        uDensityNorm: { value: 0.5 },
        uIntensity: { value: 2.6 },
        uColorLow: { value: new THREE.Color('#3d3a5c') },
        uColorMid: { value: new THREE.Color('#5b84a6') },
        uColorHigh: { value: new THREE.Color('#eef1f3') },
      },
    });
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const localCam = meshRef.current.worldToLocal(camera.position.clone());
    material.uniforms.uCameraPosLocal.value.copy(localCam);
    material.uniforms.uTime.value = state.clock.elapsedTime;
    material.uniforms.uAlpha.value = profileAlpha;
    material.uniforms.uTempNorm.value = THREE.MathUtils.clamp(
      (ionTempKeV - TEMP_MIN) / (TEMP_MAX - TEMP_MIN),
      0,
      1,
    );
    material.uniforms.uDensityNorm.value = THREE.MathUtils.clamp(
      (coreDensity - DENSITY_MIN) / (DENSITY_MAX - DENSITY_MIN),
      0.05,
      1,
    );
  });

  return (
    <SubsystemLayer layerKey="plasma" explodeDir={[0, 1, 0]} explodeDistance={0.3}>
      <mesh
        ref={meshRef}
        geometry={geometry}
        material={material}
        scale={[coreRadius, coreLength / 2, coreRadius]}
      />
    </SubsystemLayer>
  );
}
