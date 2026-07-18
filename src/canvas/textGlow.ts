/** CSS text-shadow string for the DOM preview's glow — a single soft halo
 * layer, deliberately not the multi-layer "neon" text-shadow trick (several
 * stacked shadows at different blur radii) so the live preview and the
 * canvas-export glow (which can only ever draw one shadow layer per fillText
 * call, via ctx.shadowBlur) stay pixel-for-pixel equivalent instead of the
 * export looking thinner than the preview. */
export function getTextGlowShadow(color: string, size: number): string {
  return `0 0 ${size}px ${color}`;
}

/** Canvas-export equivalent of getTextGlowShadow — sets the shadow state that
 * the next fillText/strokeText call(s) will use. Caller is responsible for
 * resetting ctx.shadowBlur back to 0 afterward (or via ctx.save()/restore()),
 * same convention as edgeBlend.ts's drawEdgeGlow. */
export function applyTextGlow(ctx: CanvasRenderingContext2D, color: string, size: number) {
  ctx.shadowColor = color;
  ctx.shadowBlur = size;
}
