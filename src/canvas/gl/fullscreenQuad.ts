/** Shared by every effect's fragment shader — explicit `layout(location=)` on both
 * attributes means every compiled program agrees on attribute locations 0/1
 * regardless of link order, so the VAO built here (bound once per draw) never
 * needs per-program rebinding. */
export const VERTEX_SHADER_SOURCE = `#version 300 es
layout(location = 0) in vec2 a_position;
layout(location = 1) in vec2 a_uv;
out vec2 v_uv;
void main() {
  v_uv = a_uv;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

let quadVao: WebGLVertexArrayObject | null = null;

function createFullscreenQuadVAO(gl: WebGL2RenderingContext): WebGLVertexArrayObject {
  // Two triangles covering clip space; UV (0,0) at the bottom-left / (1,1) at
  // the top-right — paired with UNPACK_FLIP_Y_WEBGL at texture-upload time
  // (see glRenderer.ts), this is the standard recipe for right-side-up output.
  const positions = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
  const uvs = new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]);

  const vao = gl.createVertexArray();
  if (!vao) throw new Error("Failed to create VAO");
  gl.bindVertexArray(vao);

  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const uvBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);

  gl.bindVertexArray(null);
  return vao;
}

export function drawFullscreenQuad(gl: WebGL2RenderingContext): void {
  if (!quadVao) quadVao = createFullscreenQuadVAO(gl);
  gl.bindVertexArray(quadVao);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  gl.bindVertexArray(null);
}
