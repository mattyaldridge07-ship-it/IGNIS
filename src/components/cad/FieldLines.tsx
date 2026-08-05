import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import fieldLineVertex from '../../shaders/fieldLineVertex.glsl?raw';
import { useEngineStore } from '../../store/useEngineStore';
import { SubsystemLayer } from './SubsystemLayer';

const LINE_COUNT = 12;
const PARTICLES_PER_LINE = 4;

const fieldLineFragment = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  varying vec3 vNormal;
  uniform float uTime;
  uniform vec3 uColor;

  void main() {
    float flow = fract(vUv.x * 4.0 - uTime * 0.5);
    float glow = smoothstep(0.22, 0.0, abs(flow - 0.5));
    vec3 col = uColor * (0.55 + 0.9 * glow);
    gl_FragColor = vec4(col, 0.28 + 0.5 * glow);
  }
`;

function buildFieldCurve(
  profile: { z: number; bz: number }[],
  baseRadius: number,
  minR: number,
  maxR: number,
  angle: number,
): THREE.CatmullRomCurve3 {
  const centerIdx = Math.floor(profile.length / 2);
  const bRef = Math.max(Math.abs(profile[centerIdx]?.bz ?? 1), 1e-6);
  const points = profile.map(({ z, bz }) => {
    const b = Math.max(Math.abs(bz), bRef * 0.05);
    const r = THREE.MathUtils.clamp(baseRadius * Math.sqrt(bRef / b), minR, maxR);
    return new THREE.Vector3(r * Math.cos(angle), z, r * Math.sin(angle));
  });
  return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.4);
}

export function FieldLines() {
  const axialProfile = useEngineStore((s) => s.magnetics.axialProfile);
  const coilRadius = useEngineStore((s) => s.magneticsParams.coilRadius);
  const mirrorThroatRadius = useEngineStore((s) => s.magneticsParams.mirrorThroatRadius);

  const curves = useMemo(() => {
    if (axialProfile.length < 2) return [];
    const baseRadius = (coilRadius + mirrorThroatRadius) / 2;
    const minR = mirrorThroatRadius * 0.4;
    const maxR = coilRadius * 1.7;
    return Array.from({ length: LINE_COUNT }, (_, i) =>
      buildFieldCurve(axialProfile, baseRadius, minR, maxR, (i / LINE_COUNT) * Math.PI * 2),
    );
  }, [axialProfile, coilRadius, mirrorThroatRadius]);

  const tubeGeometries = useMemo(
    () => curves.map((curve) => new THREE.TubeGeometry(curve, 128, 0.006, 8, false)),
    [curves],
  );

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: fieldLineVertex,
        fragmentShader: fieldLineFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        uniforms: {
          uTime: { value: 0 },
          uPulseAmount: { value: 0.002 },
          uColor: { value: new THREE.Color('#22d3ee') },
        },
      }),
    [],
  );

  const instancedRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const phases = useMemo(
    () => Array.from({ length: LINE_COUNT * PARTICLES_PER_LINE }, () => Math.random()),
    [],
  );

  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;

    if (!instancedRef.current || curves.length === 0) return;
    let idx = 0;
    for (let lineIdx = 0; lineIdx < curves.length; lineIdx++) {
      const curve = curves[lineIdx];
      for (let p = 0; p < PARTICLES_PER_LINE; p++) {
        const t = (phases[idx] + state.clock.elapsedTime * 0.08) % 1;
        const point = curve.getPointAt(t);
        dummy.position.copy(point);
        dummy.scale.setScalar(0.012);
        dummy.updateMatrix();
        instancedRef.current.setMatrixAt(idx, dummy.matrix);
        idx++;
      }
    }
    instancedRef.current.instanceMatrix.needsUpdate = true;
  });

  if (curves.length === 0) return null;

  return (
    <SubsystemLayer layerKey="fieldLines" explodeDir={[0, 0, 0]} explodeDistance={0}>
      {tubeGeometries.map((geo, i) => (
        <mesh key={i} geometry={geo} material={material} />
      ))}
      <instancedMesh ref={instancedRef} args={[undefined, undefined, LINE_COUNT * PARTICLES_PER_LINE]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial color="#f0fdff" toneMapped={false} />
      </instancedMesh>
    </SubsystemLayer>
  );
}
