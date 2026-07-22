import { drawFullscreenQuad } from "@/canvas/gl/fullscreenQuad";
import { setUniform, type CompiledProgram } from "@/canvas/gl/shaderProgram";

export interface TextureBinding {
  /** The sampler2D uniform name this texture binds to in the shader. */
  name: string;
  texture: WebGLTexture;
}

/**
 * Runs one fullscreen-quad draw: binds each of `textures` to sequential texture
 * units (so a shader needing more than one input — e.g. a bloom composite pass
 * reading both the original image and a separately-blurred glow buffer — just lists
 * more than one binding), sets `extraUniforms`, and draws. Shared by the main
 * single-texture-per-effect pipeline in glRenderer.ts and by any multi-pass effect's
 * own internal passes (see effects/bloomShared.ts) — one implementation, not two.
 */
export function runPass(
  gl: WebGL2RenderingContext,
  compiled: CompiledProgram,
  textures: TextureBinding[],
  destFbo: WebGLFramebuffer | null,
  width: number,
  height: number,
  extraUniforms: Record<string, number | number[] | Float32Array> = {},
): void {
  gl.bindFramebuffer(gl.FRAMEBUFFER, destFbo);
  gl.viewport(0, 0, width, height);
  gl.useProgram(compiled.program);

  textures.forEach(({ name, texture }, i) => {
    gl.activeTexture(gl.TEXTURE0 + i);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    setUniform(gl, compiled, name, i);
  });

  for (const [name, value] of Object.entries(extraUniforms)) {
    setUniform(gl, compiled, name, value);
  }

  drawFullscreenQuad(gl);
}
