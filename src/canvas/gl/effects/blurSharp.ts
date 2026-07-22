import { VERTEX_SHADER_SOURCE } from "@/canvas/gl/fullscreenQuad";
import { compileProgram, type CompiledProgram } from "@/canvas/gl/shaderProgram";
import { runPass } from "@/canvas/gl/runPass";
import { runGaussianBlurPass } from "@/canvas/gl/gaussianBlurShared";
import type { GLEffectModule } from "@/canvas/gl/effectTypes";
import type { BlurSharpEffect } from "@/store/types";

const BLUR_SCALE = 0.3;
// A fixed, moderate blur radius for the sharpen side's own internal blur pass —
// matches the typical default radius real Unsharp Mask tools use.
const UNSHARP_RADIUS = 4;
const SHARPEN_SCALE = 3;

// Positive: plain Gaussian blur. Negative: genuine Unsharp Masking (Photoshop's own
// real sharpening technique) — push each pixel away from its blurred version to
// amplify high-frequency detail, not the "cheap" fixed 3x3 sharpen-kernel shortcut.
const COMPOSITE_FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_source;
uniform sampler2D u_blurred;
uniform float u_isBlur;
uniform float u_sharpenPush;
in vec2 v_uv;
out vec4 fragColor;
void main() {
  vec4 source = texture(u_source, v_uv);
  vec4 blurred = texture(u_blurred, v_uv);
  vec3 sharpened = clamp(source.rgb + u_sharpenPush * (source.rgb - blurred.rgb), 0.0, 1.0);
  vec3 result = mix(sharpened, blurred.rgb, u_isBlur);
  fragColor = vec4(result, source.a);
}
`;

let compositeProgram: CompiledProgram | null = null;
function getCompositeProgram(gl: WebGL2RenderingContext): CompiledProgram {
  if (!compositeProgram) compositeProgram = compileProgram(gl, VERTEX_SHADER_SOURCE, COMPOSITE_FRAGMENT_SHADER);
  return compositeProgram;
}

/**
 * Blur/Sharp — one bidirectional control: positive is a true separable Gaussian blur
 * (see gaussianBlurShared.ts — radius scales with the value); negative is genuine
 * Unsharp Masking, the real industry-standard sharpening technique (blur the image,
 * then push each pixel away from its blurred version to amplify high-frequency
 * detail). `amount: 0` is a true no-op — blur radius 0 collapses both blur passes to
 * the identity.
 */
export const blurSharpEffect: GLEffectModule<BlurSharpEffect> = {
  type: "blurSharp",
  renderMultiPass(gl, source, ping, pong, params) {
    const w = source.width;
    const h = source.height;
    const isBlur = params.amount >= 0;
    const blurRadius = isBlur ? params.amount * BLUR_SCALE : UNSHARP_RADIUS;
    const sharpenPush = isBlur ? 0 : (-params.amount / 100) * SHARPEN_SCALE;

    // ping holds the horizontal-pass intermediate, then pong holds the finished
    // blur — by the time the composite pass runs, ping's stale intermediate is no
    // longer needed, so it doubles as the composite's safe write target.
    runGaussianBlurPass(gl, source.texture, ping.fbo, w, h, blurRadius, [1, 0]);
    runGaussianBlurPass(gl, ping.texture, pong.fbo, w, h, blurRadius, [0, 1]);
    runPass(
      gl,
      getCompositeProgram(gl),
      [
        { name: "u_source", texture: source.texture },
        { name: "u_blurred", texture: pong.texture },
      ],
      ping.fbo,
      w,
      h,
      { u_isBlur: isBlur ? 1 : 0, u_sharpenPush: sharpenPush },
    );
    return ping;
  },
};
