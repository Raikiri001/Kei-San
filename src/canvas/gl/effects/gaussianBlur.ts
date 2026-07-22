import { runGaussianBlurPass } from "@/canvas/gl/gaussianBlurShared";
import type { GLEffectModule } from "@/canvas/gl/effectTypes";
import type { GaussianBlurEffect } from "@/store/types";

/**
 * A true separable 2-pass gaussian blur (horizontal then vertical) — see
 * gaussianBlurShared.ts for why this replaced the original single-pass 5x5-tap
 * kernel, which showed visible discrete grid-line artifacts at larger radii (its 25
 * taps were fixed regardless of radius, so they ended up spread far apart in a
 * literal Cartesian grid once the radius grew).
 */
export const gaussianBlurEffect: GLEffectModule<GaussianBlurEffect> = {
  type: "gaussianBlur",
  renderMultiPass(gl, source, ping, pong, params) {
    const w = source.width;
    const h = source.height;
    runGaussianBlurPass(gl, source.texture, ping.fbo, w, h, params.radius, [1, 0]);
    runGaussianBlurPass(gl, ping.texture, pong.fbo, w, h, params.radius, [0, 1]);
    return pong;
  },
};
