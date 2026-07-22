export interface UniformInfo {
  location: WebGLUniformLocation;
  /** GLSL type constant (gl.FLOAT, gl.INT, gl.FLOAT_VEC2, gl.SAMPLER_2D, ...) — read back
   * from the compiled program so `setUniform` can dispatch to the right gl.uniform*
   * call without every effect module having to declare its own uniforms' GLSL types. */
  type: number;
}

export interface CompiledProgram {
  program: WebGLProgram;
  uniforms: Map<string, UniformInfo>;
}

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Failed to create shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compile error: ${info}`);
  }
  return shader;
}

/** Compiles+links a vertex/fragment pair and indexes every active uniform's location
 * and declared type. Callers should compile each effect's program exactly once (see
 * effectRegistry.ts's cache) and reuse it for the app's whole lifetime. */
export function compileProgram(gl: WebGL2RenderingContext, vertexSource: string, fragmentSource: string): CompiledProgram {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (!program) throw new Error("Failed to create program");
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`Program link error: ${info}`);
  }

  const uniforms = new Map<string, UniformInfo>();
  const uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number;
  for (let i = 0; i < uniformCount; i++) {
    const info = gl.getActiveUniform(program, i);
    if (!info) continue;
    const location = gl.getUniformLocation(program, info.name);
    if (!location) continue;
    // Array uniforms (e.g. `float u_curve[32]`) are reported by some drivers as
    // "u_curve[0]" — normalize the map key to the bare name so callers can always
    // look up (and setUniform can always set) an array uniform by its plain name.
    const name = info.name.replace(/\[0\]$/, "");
    uniforms.set(name, { location, type: info.type });
  }

  return { program, uniforms };
}

/** Sets one uniform by name, dispatching on its GLSL type (read back at compile time)
 * rather than requiring the caller to know int-vs-float/vector-length ahead of time —
 * lets every effect's `uniformsFromParams` return a flat, uniformly-typed record. */
export function setUniform(
  gl: WebGL2RenderingContext,
  compiled: CompiledProgram,
  name: string,
  value: number | number[] | Float32Array,
): void {
  const info = compiled.uniforms.get(name);
  // Not an error: GLSL compilers commonly optimize out a uniform that ends up
  // unused on some code path (e.g. one branch of a mode switch) — silently
  // no-op rather than making every effect's uniformsFromParams special-case that.
  if (!info) return;

  const { location, type } = info;
  if (type === gl.INT || type === gl.BOOL || type === gl.SAMPLER_2D) {
    gl.uniform1i(location, typeof value === "number" ? value : value[0]);
    return;
  }
  if (typeof value === "number") {
    gl.uniform1f(location, value);
    return;
  }
  const arr = value instanceof Float32Array ? value : Float32Array.from(value);
  if (type === gl.FLOAT_VEC2) gl.uniform2fv(location, arr);
  else if (type === gl.FLOAT_VEC3) gl.uniform3fv(location, arr);
  else if (type === gl.FLOAT_VEC4) gl.uniform4fv(location, arr);
  else if (type === gl.FLOAT_MAT3) gl.uniformMatrix3fv(location, false, arr);
  else gl.uniform1fv(location, arr);
}
