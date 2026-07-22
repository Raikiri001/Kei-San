let glCanvas: HTMLCanvasElement | null = null;
let gl: WebGL2RenderingContext | null = null;

/**
 * Lazily creates a single, never-attached, app-lifetime WebGL2 context shared by
 * every image's effect render, every export, and every gallery-card thumbnail —
 * a context-per-image would risk hitting the browser's live-WebGL-context cap
 * (historically ~8-16 in Chrome before old ones get evicted) on a multi-image
 * project. Because every caller shares this one physical canvas, a render call
 * and the blit that copies its result out (`ctx.drawImage(getGLCanvas(), ...)`)
 * MUST stay synchronous and back-to-back — no `await` in between, never two
 * renders interleaved via Promise.all — or one render can stomp another's
 * still-unread output.
 */
export function getGL(): WebGL2RenderingContext {
  if (gl) return gl;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("webgl2", {
    premultipliedAlpha: true,
    alpha: true,
    // This app never runs a continuous render loop (only re-renders on user
    // edits), so the flag's usual perf cost (an extra copy every frame in a
    // 60fps loop) doesn't apply here — it's a cheap safety net against a
    // future refactor accidentally introducing an await between render and blit.
    preserveDrawingBuffer: true,
  });
  if (!context) throw new Error("WebGL2 is not available in this browser");
  // No effect pass ever blends with existing framebuffer contents — each pass's
  // fullscreen quad fully overwrites every pixel — so blending is disabled once,
  // globally, rather than trusting every effect module to leave it untouched.
  context.disable(context.BLEND);
  glCanvas = canvas;
  gl = context;
  return gl;
}

export function getGLCanvas(): HTMLCanvasElement {
  getGL();
  return glCanvas!;
}

/** Resizes the shared canvas only if the requested size actually changed — a
 * same-size call (the common case) is a cheap no-op instead of an implicit clear. */
export function resizeGLCanvas(width: number, height: number): void {
  const canvas = getGLCanvas();
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
}
