import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import cutawayFragment from '../shaders/cutawayFragment.glsl?raw';
import { useEngineStore } from '../store/useEngineStore';

const cutawayVertex = /* glsl */ `
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export function useCutawayMaterial(baseColorHex: string, edgeColorHex = '#fb923c', opacity = 1) {
  const cutawayAxis = useEngineStore((s) => s.cutawayAxis);
  const cutawayOffset = useEngineStore((s) => s.cutawayOffset);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: cutawayVertex,
      fragmentShader: cutawayFragment,
      side: THREE.DoubleSide,
      transparent: opacity < 1,
      uniforms: {
        uPlaneNormal: { value: new THREE.Vector3(1, 0, 0) },
        uPlaneConstant: { value: 0 },
        uCutawayEnabled: { value: 0 },
        uBaseColor: { value: new THREE.Color(baseColorHex) },
        uEdgeColor: { value: new THREE.Color(edgeColorHex) },
        uEdgeWidth: { value: 0.03 },
        uLightDir: { value: new THREE.Vector3(0.4, 0.9, 0.6) },
        uOpacity: { value: opacity },
      },
      // eslint-disable-next-line
    });
    // baseColorHex/edgeColorHex/opacity are baked in at creation time by design
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseColorHex, edgeColorHex, opacity]);

  useEffect(() => {
    const normal =
      cutawayAxis === 'XZ' ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    material.uniforms.uPlaneNormal.value.copy(normal);
    material.uniforms.uPlaneConstant.value = -cutawayOffset;
    material.uniforms.uCutawayEnabled.value = cutawayAxis === 'none' ? 0 : 1;
  }, [material, cutawayAxis, cutawayOffset]);

  useEffect(() => () => material.dispose(), [material]);

  return material;
}
