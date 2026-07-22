import { getGL, resizeGLCanvas } from "@/canvas/gl/glContext";
import { VERTEX_SHADER_SOURCE } from "@/canvas/gl/fullscreenQuad";
import { compileProgram, type CompiledProgram } from "@/canvas/gl/shaderProgram";
import { createTripleBuffer, resizeTripleBuffer, otherTwo, type TripleBuffer } from "@/canvas/gl/tripleBuffer";
import type { PingPongTarget } from "@/canvas/gl/pingPong";
import { runPass } from "@/canvas/gl/runPass";
import { runCompositePass } from "@/canvas/gl/compositeShared";
import { getCompiledProgram, getEffectModule } from "@/canvas/gl/effectRegistry";
import { computeCropSourceRect } from "@/utils/coverFit";
import type { ContentLayer, EffectLayer } from "@/store/types";

// A tiny fixed pass that samples the just-uploaded natural-size source texture at a
// crop-remapped UV — this is a structural step (turns whatever crop/pan state the
// image has into an already-cropped w x h image for every later pass to work with),
// not a toggleable effect, so it's compiled once here rather than going through the
// per-StackableEffectType program cache in effectRegistry.ts.
const CROP_FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform vec4 u_cropRect; // x, y, w, h — normalized 0..1 UV space of the natural image
in vec2 v_uv;
out vec4 fragColor;
void main() {
  vec2 uv = u_cropRect.xy + v_uv * u_cropRect.zw;
  fragColor = texture(u_texture, uv);
}
`;

// Trivial "sample and output unchanged" pass — used to land the chain's last result
// onto the default framebuffer at the very end, and reused here as a plain copy pass
// (writing into an arbitrary FBO instead of null) anywhere a texture needs to be
// duplicated into a fresh target, e.g. seeding a Layer Mix branch's own triple buffer
// with the state it should start from.
const PASSTHROUGH_FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
in vec2 v_uv;
out vec4 fragColor;
void main() {
  fragColor = texture(u_texture, v_uv);
}
`;

let cropProgram: CompiledProgram | null = null;
let passthroughProgram: CompiledProgram | null = null;
let naturalTexture: WebGLTexture | null = null;
let tripleBuffer: TripleBuffer | null = null;
let branchTripleA: TripleBuffer | null = null;
let branchTripleB: TripleBuffer | null = null;

function getCropProgram(gl: WebGL2RenderingContext): CompiledProgram {
  if (!cropProgram) cropProgram = compileProgram(gl, VERTEX_SHADER_SOURCE, CROP_FRAGMENT_SHADER);
  return cropProgram;
}

function getPassthroughProgram(gl: WebGL2RenderingContext): CompiledProgram {
  if (!passthroughProgram) passthroughProgram = compileProgram(gl, VERTEX_SHADER_SOURCE, PASSTHROUGH_FRAGMENT_SHADER);
  return passthroughProgram;
}

function copyIntoTarget(gl: WebGL2RenderingContext, sourceTex: WebGLTexture, destFbo: WebGLFramebuffer, w: number, h: number): void {
  runPass(gl, getPassthroughProgram(gl), [{ name: "u_texture", texture: sourceTex }], destFbo, w, h);
}

function getNaturalTexture(gl: WebGL2RenderingContext): WebGLTexture {
  if (naturalTexture) return naturalTexture;
  const texture = gl.createTexture();
  if (!texture) throw new Error("Failed to create texture");
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  naturalTexture = texture;
  return texture;
}

function getTripleBuffer(gl: WebGL2RenderingContext, width: number, height: number): TripleBuffer {
  tripleBuffer = tripleBuffer ? resizeTripleBuffer(gl, tripleBuffer, width, height) : createTripleBuffer(gl, width, height);
  return tripleBuffer;
}

/** A Layer Mix's two branches each get their own dedicated triple buffer — a
 * completely separate physical resource from the outer stack's own triple buffer (and
 * from each other), so a branch's internal per-layer transform+composite loop can
 * freely use all 3 of its own buffers without ever risking clobbering the outer
 * stack's "before" state or the other branch's still-being-read result. Reused (not
 * reallocated) across every Layer Mix node encountered in a render call and across
 * every subsequent render call, same lazy-singleton pattern as the main triple buffer. */
function getBranchTriple(which: "a" | "b", gl: WebGL2RenderingContext, width: number, height: number): TripleBuffer {
  if (which === "a") {
    branchTripleA = branchTripleA ? resizeTripleBuffer(gl, branchTripleA, width, height) : createTripleBuffer(gl, width, height);
    return branchTripleA;
  }
  branchTripleB = branchTripleB ? resizeTripleBuffer(gl, branchTripleB, width, height) : createTripleBuffer(gl, width, height);
  return branchTripleB;
}

/**
 * Runs one EffectLayer's own raw transform (single- or multi-pass) and then the
 * universal blend/mask composite (see compositeShared.ts) against whatever was in
 * `buffer` at `beforeIdx`, returning the index the composited result landed at.
 * Shared by the outer stack's own loop and by renderEffectChain (a Layer Mix branch)
 * — identical logic either way, just operating on whichever TripleBuffer it's given.
 */
function processEffectLayer(gl: WebGL2RenderingContext, buffer: TripleBuffer, beforeIdx: 0 | 1 | 2, w: number, h: number, layer: EffectLayer): 0 | 1 | 2 {
  const module = getEffectModule(layer.type);
  if (!module) return beforeIdx;

  const beforeTarget = buffer.targets[beforeIdx];
  const [idxA, idxB] = otherTwo(beforeIdx);
  const targetA = buffer.targets[idxA];
  const targetB = buffer.targets[idxB];

  let transformedTarget: PingPongTarget;
  if (module.renderMultiPass) {
    transformedTarget = module.renderMultiPass(gl, beforeTarget, targetA, targetB, layer);
  } else {
    if (!module.uniformsFromParams) {
      throw new Error(`Effect module "${layer.type}" has neither renderMultiPass nor uniformsFromParams`);
    }
    const compiled = getCompiledProgram(gl, layer.type);
    const uniforms = module.uniformsFromParams(layer, { w, h });
    runPass(gl, compiled, [{ name: "u_texture", texture: beforeTarget.texture }], targetA.fbo, w, h, uniforms);
    transformedTarget = targetA;
  }

  const compositeTarget = transformedTarget === targetA ? targetB : targetA;
  runCompositePass(gl, beforeTarget, transformedTarget, compositeTarget.fbo, w, h, layer.blend, layer.mask);
  return buffer.targets.indexOf(compositeTarget) as 0 | 1 | 2;
}

/**
 * Renders a flat EffectLayer chain (a Layer Mix branch) starting from `startTex`,
 * using its own dedicated `buffer` (never the outer stack's) — copies `startTex` in
 * as the initial state, then runs processEffectLayer per enabled layer. An empty
 * chain returns `startTex` unchanged, which is what makes an empty branchB "pass
 * through the original input" rather than needing special-casing.
 */
function renderEffectChain(gl: WebGL2RenderingContext, buffer: TripleBuffer, startTex: WebGLTexture, w: number, h: number, chain: EffectLayer[]): WebGLTexture {
  if (chain.length === 0) return startTex;
  copyIntoTarget(gl, startTex, buffer.targets[0].fbo, w, h);
  let idx: 0 | 1 | 2 = 0;
  for (const layer of chain) {
    idx = processEffectLayer(gl, buffer, idx, w, h, layer);
  }
  return buffer.targets[idx].texture;
}

/**
 * Renders `layers` (already flattened to just the enabled top-level content entries,
 * in compositing order — see flattenEnabledEffectLayers/getEnabledContentLayers in
 * store/imageEffects.ts; edgeBlend/ascii/blobTracker are never part of this list, they
 * render via their own separate passes elsewhere) into the shared GL canvas at
 * (width x height), crop already applied. The caller MUST blit `getGLCanvas()` onto
 * its own destination canvas immediately afterward, synchronously — see glContext.ts's
 * doc comment for why.
 *
 * Assumes `layers` is non-empty; callers gate on that before calling this at all (see
 * ImageElementView.tsx/exportEngine.ts's `hasContentEffectEnabled`).
 */
export function renderEffectStack(
  img: HTMLImageElement,
  width: number,
  height: number,
  layers: ContentLayer[],
  cropZoom: number,
  cropOffsetX: number,
  cropOffsetY: number,
): void {
  const gl = getGL();
  const w = Math.max(1, Math.ceil(width));
  const h = Math.max(1, Math.ceil(height));
  resizeGLCanvas(w, h);

  // Upload at natural size (cheap re-upload on every call — this only ever runs on a
  // meaningful commit, e.g. a param edit or resize-drag release, never on every drag
  // frame, matching the existing halftone effect's perf discipline) and apply the crop
  // as a UV remap in a dedicated first pass, so cropping is "free" for every later pass.
  const naturalTex = getNaturalTexture(gl);
  gl.bindTexture(gl.TEXTURE_2D, naturalTex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

  const crop = computeCropSourceRect(img.naturalWidth, img.naturalHeight, cropZoom, cropOffsetX, cropOffsetY);
  const cropRect: [number, number, number, number] = [
    crop.x / img.naturalWidth,
    crop.y / img.naturalHeight,
    crop.width / img.naturalWidth,
    crop.height / img.naturalHeight,
  ];

  const buffer = getTripleBuffer(gl, w, h);
  runPass(gl, getCropProgram(gl), [{ name: "u_texture", texture: naturalTex }], buffer.targets[0].fbo, w, h, { u_cropRect: cropRect });

  // Every enabled effect gets its own raw transform ("transformed") rendered into
  // whichever of the two non-"before" buffers it chooses, then universally
  // recomposited over "before" via that layer's own blend mode/opacity/mask — this
  // needs 3 live buffers at once (before + transformed + composited can't alias,
  // since WebGL forbids reading and writing the same texture in one pass), hence the
  // round-robin triple buffer instead of a fixed-swap pair. A Layer Mix node is the
  // one exception to "single transform": it runs its two branches (each in their own
  // private triple buffer, so they never disturb this outer one) and composites their
  // two results together instead of transforming `before` itself. A final,
  // unconditional passthrough pass below lands the chain's last result onto the
  // visible canvas.
  let beforeIdx: 0 | 1 | 2 = 0;

  for (const layer of layers) {
    if (layer.kind === "effect") {
      beforeIdx = processEffectLayer(gl, buffer, beforeIdx, w, h, layer);
      continue;
    }

    // layer.kind === "mix"
    const beforeTex = buffer.targets[beforeIdx].texture;
    const triA = getBranchTriple("a", gl, w, h);
    const triB = getBranchTriple("b", gl, w, h);
    const resultATex = renderEffectChain(gl, triA, beforeTex, w, h, layer.branchA.filter((l) => l.enabled));
    const resultBTex = renderEffectChain(gl, triB, beforeTex, w, h, layer.branchB.filter((l) => l.enabled));

    const [destIdx] = otherTwo(beforeIdx);
    const destTarget = buffer.targets[destIdx];
    runCompositePass(gl, { texture: resultBTex }, { texture: resultATex }, destTarget.fbo, w, h, layer.blend, layer.mask);
    beforeIdx = destIdx;
  }

  runPass(gl, getPassthroughProgram(gl), [{ name: "u_texture", texture: buffer.targets[beforeIdx].texture }], null, w, h);
}
