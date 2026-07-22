/** The real mechanism professional shadow/midtone/highlight tools (Color Balance,
 * Color Grading's 3-way wheels) use to blend a zone's adjustment smoothly by
 * luminance instead of hard-banding at a fixed cutoff — a partition of unity (the
 * three weights always sum to exactly 1) built from two complementary smoothsteps,
 * each zone peaking at its own end of the tonal range and fading out by mid-gray. */
export const TONE_ZONE_GLSL_HELPERS = `
vec3 toneZoneWeights(float lum) {
  float highlightW = smoothstep(0.5, 1.0, lum);
  float shadowW = 1.0 - smoothstep(0.0, 0.5, lum);
  float midtoneW = 1.0 - highlightW - shadowW;
  return vec3(shadowW, midtoneW, highlightW);
}
`;
