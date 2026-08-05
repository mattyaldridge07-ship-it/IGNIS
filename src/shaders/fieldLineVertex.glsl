varying vec2 vUv;
varying vec3 vNormal;

uniform float uTime;
uniform float uPulseAmount;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);

  float pulse = sin(uv.x * 18.0 - uTime * 3.0) * 0.5 + 0.5;
  vec3 displaced = position + normal * pulse * uPulseAmount;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
}
