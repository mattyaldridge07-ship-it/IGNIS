precision highp float;

varying vec3 vWorldPos;
varying vec3 vNormal;

uniform vec3 uPlaneNormal;
uniform float uPlaneConstant;
uniform float uCutawayEnabled; // 0 = off, 1 = on
uniform vec3 uBaseColor;
uniform vec3 uEdgeColor;
uniform float uEdgeWidth;
uniform vec3 uLightDir;
uniform float uOpacity;

void main() {
  float dist = dot(uPlaneNormal, vWorldPos) + uPlaneConstant;

  if (uCutawayEnabled > 0.5 && dist > 0.0) {
    discard;
  }

  vec3 n = normalize(vNormal);
  float diffuse = max(dot(n, normalize(uLightDir)), 0.0);
  float ambient = 0.35;
  vec3 shaded = uBaseColor * (ambient + diffuse * 0.75);

  float edge = uCutawayEnabled > 0.5
    ? 1.0 - smoothstep(0.0, uEdgeWidth, abs(dist))
    : 0.0;
  vec3 finalColor = mix(shaded, uEdgeColor, edge);

  gl_FragColor = vec4(finalColor, uOpacity);
}
