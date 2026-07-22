export interface PingPongTarget {
  fbo: WebGLFramebuffer;
  texture: WebGLTexture;
  width: number;
  height: number;
}

export interface PingPongPair {
  a: PingPongTarget;
  b: PingPongTarget;
}

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

/** A source/destination texture+FBO pair for chaining N effect passes — each pass
 * reads the previous pass's output texture and renders into the other target, then
 * the read/write roles swap for the next pass (see glRenderer.ts's renderEffectStack). */
export function createPingPongPair(gl: WebGL2RenderingContext, width: number, height: number): PingPongPair {
  return { a: createTarget(gl, width, height), b: createTarget(gl, width, height) };
}

function resizeTarget(gl: WebGL2RenderingContext, target: PingPongTarget, width: number, height: number): PingPongTarget {
  if (target.width === width && target.height === height) return target;
  gl.deleteFramebuffer(target.fbo);
  gl.deleteTexture(target.texture);
  return createTarget(gl, width, height);
}

/** Reallocates only whichever target(s) actually changed size — a same-size call
 * (the common case, since most re-renders are a param/effect-order change, not a
 * resize) is a cheap no-op for both. */
export function resizePingPongPair(gl: WebGL2RenderingContext, pair: PingPongPair, width: number, height: number): PingPongPair {
  return { a: resizeTarget(gl, pair.a, width, height), b: resizeTarget(gl, pair.b, width, height) };
}
