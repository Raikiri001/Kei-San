import { VERTEX_SHADER_SOURCE } from "@/canvas/gl/fullscreenQuad";
import { compileProgram, type CompiledProgram } from "@/canvas/gl/shaderProgram";
import { runPass } from "@/canvas/gl/runPass";

// Safety cap on tap count regardless of requested radius — every current caller
// keeps radius <= ~40 (tapRadius ~60), this just bounds worst-case cost.
const MAX_TAP_RADIUS = 100;

// A true separable gaussian blur — one 1D pass per axis, tap count scaling with the
// requested radius (sigma = radius/2, taps out to 3 sigma, the standard >99%-mass
// truncation) — not a fixed-size grid/ring of taps. Several single-pass blur kernels
// in this app previously used a fixed 5x5 (25-tap) grid regardless of radius, which
// showed visible discrete grid-line artifacts once the requested radius exceeded
// what 25 fixed taps could actually resolve (the samples end up spread far apart in
// a literal Cartesian grid at large radii). A separable blur needs only tapRadius*2
// taps per pass (two passes) instead of tapRadius^2 for an equivalent single 2D
// kernel, so scaling tap count with radius stays cheap.
const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform vec2 u_direction;
uniform float u_sigma;
uniform int u_tapRadius;
in vec2 v_uv;
out vec4 fragColor;

void main() {
  vec2 texel = 1.0 / u_resolution;
  float sigma = max(u_sigma, 0.001);
  vec4 sum = vec4(0.0);
  float totalWeight = 0.0;
  for (int i = -u_tapRadius; i <= u_tapRadius; i++) {
    float fi = float(i);
    float weight = exp(-(fi * fi) / (2.0 * sigma * sigma));
    sum += texture(u_texture, v_uv + u_direction * fi * texel) * weight;
    totalWeight += weight;
  }
  fragColor = sum / totalWeight;
}
`;

let blurProgram: CompiledProgram | null = null;
function getGaussianBlurProgram(gl: WebGL2RenderingContext): CompiledProgram {
  if (!blurProgram) blurProgram = compileProgram(gl, VERTEX_SHADER_SOURCE, FRAGMENT_SHADER);
  return blurProgram;
}

/**
 * Runs one 1D pass of a separable gaussian blur. Call once with `direction: [1, 0]`
 * then once more with `direction: [0, 1]` (the second call's source = the first
 * call's destination) for a full 2-pass blur — the standard, exact way to compute a
 * large-radius gaussian cheaply. `radius: 0` is a true no-op on each pass (tapRadius
 * collapses to 0, a single un-offset tap with weight 1).
 */
export function runGaussianBlurPass(
  gl: WebGL2RenderingContext,
  sourceTex: WebGLTexture,
  destFbo: WebGLFramebuffer,
  w: number,
  h: number,
  radius: number,
  direction: [number, number],
): void {
  const sigma = radius / 2;
  const tapRadius = Math.min(Math.ceil(sigma * 3), MAX_TAP_RADIUS);
  runPass(gl, getGaussianBlurProgram(gl), [{ name: "u_texture", texture: sourceTex }], destFbo, w, h, {
    u_resolution: [w, h],
    u_direction: direction,
    u_sigma: sigma,
    u_tapRadius: tapRadius,
  });
}
