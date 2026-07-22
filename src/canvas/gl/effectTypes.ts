import type { PingPongTarget } from "@/canvas/gl/pingPong";
import type { StackableEffectType } from "@/store/types";

/**
 * `fragmentShader`/`uniformsFromParams` and `renderMultiPass` are mutually exclusive
 * in practice — every module supplies exactly one path — but both are typed optional
 * rather than as a discriminated union to keep this interface simple; the single-pass
 * fields are genuinely unused (never read) on a module that provides `renderMultiPass`,
 * and `effectRegistry.ts`'s `getCompiledProgram` throws a clear error if a module is
 * missing both, so a module authored without either fails loudly, not silently.
 */
export interface GLEffectModule<P> {
  type: StackableEffectType;
  /** GLSL ES 3.00 fragment shader source, samples `u_texture` (bound by the renderer) plus
   * whatever uniforms `uniformsFromParams` below returns. Plain TS template literal, not a
   * `.glsl` file import — there's no shader-loader plugin in this project's Vite config. */
  fragmentShader?: string;
  uniformsFromParams?(params: P, viewport: { w: number; h: number }): Record<string, number | number[] | Float32Array>;
  /**
   * Escape hatch for the rare genuinely multi-pass effect (e.g. star glow/bloom: threshold ->
   * blur -> additive composite) that can't be expressed as this effect's single fragmentShader
   * dispatched once. When present, the renderer calls this instead of the default single-pass
   * dispatch, handing it the ping-pong pair to render through however many internal passes it
   * needs, returning whichever target holds its final result.
   */
  renderMultiPass?: (
    gl: WebGL2RenderingContext,
    source: PingPongTarget,
    ping: PingPongTarget,
    pong: PingPongTarget,
    params: P,
  ) => PingPongTarget;
}
