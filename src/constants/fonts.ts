export type FontFamilyKey = "sans" | "serif";

/** Shared between CSS classes (DOM preview) and canvas ctx.font (export) so both match. */
export const FONT_STACKS: Record<FontFamilyKey, string> = {
  sans: '"Inter", "Noto Sans JP", "Hiragino Kaku Gothic ProN", system-ui, sans-serif',
  serif: '"Noto Serif JP", "Hiragino Mincho ProN", Georgia, serif',
};

export const DEFAULT_FONT_SIZE = 64;
