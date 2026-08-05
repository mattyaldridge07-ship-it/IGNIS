precision highp float;

varying vec3 vLocalPos;

uniform vec3 uCameraPosLocal;
uniform float uTime;
uniform float uAlpha;
uniform float uTempNorm;   // 0..1, mapped from ion temperature
uniform float uDensityNorm; // 0..1, mapped from core density
uniform float uIntensity;
uniform vec3 uColorLow;
uniform vec3 uColorMid;
uniform vec3 uColorHigh;

const int STEPS = 72;
const float PI = 3.14159265359;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i + vec3(0, 0, 0)), hash(i + vec3(1, 0, 0)), f.x),
        mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x),
        mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
    f.z
  );
}

// n(r,z) = n0 (1 - (r/a)^2)^alpha * cos(pi z / L), evaluated in normalised local
// cylinder space where radius = 1 and half-length = 1 (mesh scale carries the
// physical dimensions, so local space is already the normalised r,z frame).
float densityAt(vec3 p) {
  float r = length(p.xz);
  if (r > 1.0) return 0.0;
  float zn = clamp(p.y, -1.0, 1.0);
  float radial = pow(max(1.0 - r * r, 0.0), uAlpha);
  float axial = max(cos(PI * zn * 0.5), 0.0);
  float turbulence = 0.85 + 0.3 * noise(p * 3.2 + vec3(0.0, uTime * 0.6, 0.0));
  return radial * axial * turbulence;
}

vec3 colorRamp(float t) {
  t = clamp(t, 0.0, 1.0);
  if (t < 0.5) {
    return mix(uColorLow, uColorMid, t * 2.0);
  }
  return mix(uColorMid, uColorHigh, (t - 0.5) * 2.0);
}

void main() {
  vec3 rayDir = normalize(vLocalPos - uCameraPosLocal);
  vec3 pos = vLocalPos;
  float stepLen = 2.4 / float(STEPS);

  vec4 accum = vec4(0.0);

  for (int i = 0; i < STEPS; i++) {
    pos -= rayDir * stepLen;
    float r = length(pos.xz);
    if (r <= 1.0 && abs(pos.y) <= 1.0) {
      float d = densityAt(pos) * uDensityNorm;
      if (d > 0.001) {
        float heat = clamp(d * 1.4 + uTempNorm * 0.5, 0.0, 1.0);
        vec3 col = colorRamp(heat) * uIntensity;
        float sampleAlpha = clamp(d * stepLen * 3.6, 0.0, 1.0);
        accum.rgb += (1.0 - accum.a) * sampleAlpha * col;
        accum.a += (1.0 - accum.a) * sampleAlpha;
        if (accum.a > 0.98) break;
      }
    }
  }

  if (accum.a < 0.01) discard;
  gl_FragColor = accum;
}
