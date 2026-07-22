import { PAPER_TEXTURE_GLSL } from "@/canvas/gl/effects/textureShared";
import type { GLEffectModule } from "@/canvas/gl/effectTypes";
import type { BlackAndWhiteEffect } from "@/store/types";

// A curated film-stock B&W look, distinct from MonochromeEffect (the technical
// per-channel-weighted Black & White adjustment) — saturation fixed at 0.0, not
// user-adjustable, plus a punchy contrast recipe matching real panchromatic film.
const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_grainAmount;
uniform float u_vignette;
in vec2 v_uv;
out vec4 fragColor;

${PAPER_TEXTURE_GLSL}

void main() {
  vec4 s = texture(u_texture, v_uv);
  vec3 result = applyPaperTexture(
    s.rgb, v_uv, u_resolution,
    u_grainAmount, 2.0, u_vignette,
    vec3(1.0), 0.0,
    1.5, 0.0, -0.02
  );
  fragColor = vec4(result, s.a);
}
`;

export const blackAndWhiteEffect: GLEffectModule<BlackAndWhiteEffect> = {
  type: "blackAndWhite",
  fragmentShader: FRAGMENT_SHADER,
  uniformsFromParams(params, viewport) {
    return { u_resolution: [viewport.w, viewport.h], u_grainAmount: params.grainAmount, u_vignette: params.vignette };
  },
};
