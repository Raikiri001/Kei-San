import type { GLEffectModule } from "@/canvas/gl/effectTypes";
import type { ColorMatrixEffect } from "@/store/types";

// Photoshop's Channel Mixer, generalized as a raw 3x3 matrix + 3 offsets — applied on
// the encoded signal (a creative/compositing tool, not a physical one, matching
// Levels/Curves/Contrast's convention rather than Exposure's linear-light one).
const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform mat3 u_matrix;
uniform vec3 u_offset;
in vec2 v_uv;
out vec4 fragColor;

void main() {
  vec4 s = texture(u_texture, v_uv);
  vec3 outRgb = clamp(s.rgb * u_matrix + u_offset, 0.0, 1.0);
  fragColor = vec4(outRgb, s.a);
}
`;

export const colorMatrixEffect: GLEffectModule<ColorMatrixEffect> = {
  type: "colorMatrix",
  fragmentShader: FRAGMENT_SHADER,
  uniformsFromParams(params) {
    // Row-major flatten paired with `rgb * u_matrix` (vector-times-matrix) in the
    // shader — same convention as whiteBalance.ts's own adaptation matrix upload:
    // GLSL's column-major storage means this combination applies the intended
    // matrix (outR = m00*r+m01*g+m02*b, etc.) without needing an explicit transpose.
    return {
      u_matrix: new Float32Array([params.m00, params.m01, params.m02, params.m10, params.m11, params.m12, params.m20, params.m21, params.m22]),
      u_offset: [params.offsetR, params.offsetG, params.offsetB],
    };
  },
};
