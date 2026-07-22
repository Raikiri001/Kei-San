import type { PingPongTarget } from "@/canvas/gl/pingPong";

function createTarget(gl: WebGL2RenderingContext, width: number, height: number): PingPongTarget {
  const texture = gl.createTexture();
  if (!texture) throw new Error("Failed to create texture");
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const fbo = gl.createFramebuffer();
  if (!fbo) throw new Error("Failed to create framebuffer");
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindTexture(gl.TEXTURE_2D, null);

  return { fbo, texture, width, height };
}

function resizeTarget(gl: WebGL2RenderingContext, target: PingPongTarget, width: number, height: number): PingPongTarget {
  if (target.width === width && target.height === height) return target;
  gl.deleteFramebuffer(target.fbo);
  gl.deleteTexture(target.texture);
  return createTarget(gl, width, height);
}

export interface TripleBuffer {
  targets: [PingPongTarget, PingPongTarget, PingPongTarget];
}

/**
 * Three interchangeable targets for the per-layer transform-then-composite loop in
 * glRenderer.ts: each layer needs to simultaneously read "before" (the accumulated
 * result so far) and "transformed" (that layer's own raw effect output) while writing
 * a third "composited" buffer — a plain 2-buffer ping-pong pair can't do this since
 * WebGL forbids reading and writing the same texture within one pass. Unlike
 * PingPongPair's fixed a/b swap, callers pick whichever two of the three aren't the
 * current "before" index each iteration (see `otherTwo` below).
 */
export function createTripleBuffer(gl: WebGL2RenderingContext, width: number, height: number): TripleBuffer {
  return { targets: [createTarget(gl, width, height), createTarget(gl, width, height), createTarget(gl, width, height)] };
}

export function resizeTripleBuffer(gl: WebGL2RenderingContext, buffer: TripleBuffer, width: number, height: number): TripleBuffer {
  const [a, b, c] = buffer.targets;
  return { targets: [resizeTarget(gl, a, width, height), resizeTarget(gl, b, width, height), resizeTarget(gl, c, width, height)] };
}

/** The two target indices other than `index` — in a fixed, stable order (ascending),
 * so callers always know which is "transformed" (first) vs "composited" (second)
 * without needing their own bookkeeping. */
export function otherTwo(index: 0 | 1 | 2): [0 | 1 | 2, 0 | 1 | 2] {
  const others = ([0, 1, 2] as const).filter((i) => i !== index) as [0 | 1 | 2, 0 | 1 | 2];
  return others;
}
