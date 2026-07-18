import type { ImageElement, RadialMenuContext, TextElement } from "@/store/types";

/** Classifies a set of target ids as "image"/"text" (all one kind) or
 * "mixed" (spans both) — used when right-clicking opens the radial menu for
 * an existing multi-selection, whose composition isn't known in advance the
 * way a single-element right-click's is. */
export function resolveRadialContext(targetIds: string[], images: ImageElement[], texts: TextElement[]): RadialMenuContext {
  const hasImages = targetIds.some((id) => images.some((i) => i.id === id));
  const hasTexts = targetIds.some((id) => texts.some((t) => t.id === id));
  if (hasImages && hasTexts) return "mixed";
  return hasImages ? "image" : "text";
}
