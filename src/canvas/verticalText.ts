/**
 * Canvas 2D has no `writing-mode` equivalent, so vertical text (used for the DOM
 * `writing-mode: vertical-rl` preview) is approximated here by manually stacking
 * each character top-to-bottom, centered on x. Array.from() is used instead of
 * splitting by index so multi-byte / surrogate-pair characters aren't mangled.
 */
export function drawVerticalText(
  ctx: CanvasRenderingContext2D,
  content: string,
  x: number,
  y: number,
  fontSize: number,
) {
  const characters = Array.from(content);
  const lineHeight = fontSize * 1.1;
  const totalHeight = lineHeight * Math.max(characters.length - 1, 0);
  const startY = y - totalHeight / 2;

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  characters.forEach((char, idx) => {
    ctx.fillText(char, x, startY + idx * lineHeight);
  });
  ctx.restore();
}
