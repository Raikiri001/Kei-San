import type { GLEffectModule } from "@/canvas/gl/effectTypes";
import type { ElasticGridEffect } from "@/store/types";

// The real draggable mesh warp (free-form deformation, Sederberg & Parry 1986) — a
// 5x5 grid of control-point displacements, bilinearly interpolated at every pixel
// (the standard technique for this class of tool). MeshWarpEditor.tsx (the drag UI)
// imports MESH_GRID_SIZE from here so the UI and the shader can never drift apart.
export const MESH_GRID_SIZE = 5;
const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform vec2 u_grid[${MESH_GRID_SIZE * MESH_GRID_SIZE}];
in vec2 v_uv;
out vec4 fragColor;

const int GRID_SIZE = ${MESH_GRID_SIZE};

vec2 sampleGridDisplacement(vec2 uv) {
  vec2 gridPos = clamp(uv, 0.0, 1.0) * float(GRID_SIZE - 1);
  int ix = int(floor(gridPos.x));
  int iy = int(floor(gridPos.y));
  int ix1 = min(ix + 1, GRID_SIZE - 1);
  int iy1 = min(iy + 1, GRID_SIZE - 1);
  float fx = gridPos.x - float(ix);
  float fy = gridPos.y - float(iy);
  vec2 d00 = u_grid[iy * GRID_SIZE + ix];
  vec2 d10 = u_grid[iy * GRID_SIZE + ix1];
  vec2 d01 = u_grid[iy1 * GRID_SIZE + ix];
  vec2 d11 = u_grid[iy1 * GRID_SIZE + ix1];
  vec2 dTop = mix(d00, d10, fx);
  vec2 dBottom = mix(d01, d11, fx);
  return mix(dTop, dBottom, fy);
}

void main() {
  vec2 displacement = sampleGridDisplacement(v_uv);
  fragColor = texture(u_texture, v_uv - displacement);
}
`;

export const elasticGridEffect: GLEffectModule<ElasticGridEffect> = {
  type: "elasticGrid",
  fragmentShader: FRAGMENT_SHADER,
  uniformsFromParams(params) {
    const flat = new Float32Array(MESH_GRID_SIZE * MESH_GRID_SIZE * 2);
    for (let k = 0; k < params.points.length; k++) {
      flat[k * 2] = params.points[k].dx;
      flat[k * 2 + 1] = params.points[k].dy;
    }
    return { u_grid: flat };
  },
};
