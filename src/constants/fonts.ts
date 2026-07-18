export type FontTag =
  | "sans-serif"
  | "serif"
  | "slab-serif"
  | "display"
  | "handwriting"
  | "monospace"
  | "condensed";

export interface FontEntry {
  id: string;
  /** Google Fonts family name — also the CSS font-family value. */
  name: string;
  tags: FontTag[];
  /** "Family+Name:wght@400;700" segment used to build the combined Google Fonts CSS2 URL. */
  googleFont: string;
}

/** Curated set spanning every FontTag — real content, not placeholders. */
export const FONTS: FontEntry[] = [
  { id: "inter", name: "Inter", tags: ["sans-serif"], googleFont: "Inter:wght@400;700" },
  { id: "roboto", name: "Roboto", tags: ["sans-serif"], googleFont: "Roboto:wght@400;700" },
  { id: "open-sans", name: "Open Sans", tags: ["sans-serif"], googleFont: "Open+Sans:wght@400;700" },
  { id: "lato", name: "Lato", tags: ["sans-serif"], googleFont: "Lato:wght@400;700" },
  { id: "montserrat", name: "Montserrat", tags: ["sans-serif", "display"], googleFont: "Montserrat:wght@400;700" },
  { id: "poppins", name: "Poppins", tags: ["sans-serif", "display"], googleFont: "Poppins:wght@400;700" },
  { id: "nunito", name: "Nunito", tags: ["sans-serif"], googleFont: "Nunito:wght@400;700" },
  { id: "work-sans", name: "Work Sans", tags: ["sans-serif"], googleFont: "Work+Sans:wght@400;700" },
  { id: "source-sans", name: "Source Sans 3", tags: ["sans-serif"], googleFont: "Source+Sans+3:wght@400;700" },
  { id: "manrope", name: "Manrope", tags: ["sans-serif"], googleFont: "Manrope:wght@400;700" },
  { id: "karla", name: "Karla", tags: ["sans-serif"], googleFont: "Karla:wght@400;700" },
  { id: "rubik", name: "Rubik", tags: ["sans-serif", "display"], googleFont: "Rubik:wght@400;700" },
  { id: "space-grotesk", name: "Space Grotesk", tags: ["sans-serif", "display"], googleFont: "Space+Grotesk:wght@400;700" },
  { id: "noto-sans-jp", name: "Noto Sans JP", tags: ["sans-serif"], googleFont: "Noto+Sans+JP:wght@400;700;900" },
  { id: "noto-serif-jp", name: "Noto Serif JP", tags: ["serif"], googleFont: "Noto+Serif+JP:wght@400;700;900" },
  { id: "playfair-display", name: "Playfair Display", tags: ["serif", "display"], googleFont: "Playfair+Display:wght@400;700" },
  { id: "merriweather", name: "Merriweather", tags: ["serif"], googleFont: "Merriweather:wght@400;700" },
  { id: "lora", name: "Lora", tags: ["serif"], googleFont: "Lora:wght@400;700" },
  { id: "pt-serif", name: "PT Serif", tags: ["serif"], googleFont: "PT+Serif:wght@400;700" },
  { id: "source-serif", name: "Source Serif 4", tags: ["serif"], googleFont: "Source+Serif+4:wght@400;700" },
  { id: "crimson-text", name: "Crimson Text", tags: ["serif"], googleFont: "Crimson+Text:wght@400;700" },
  { id: "libre-baskerville", name: "Libre Baskerville", tags: ["serif"], googleFont: "Libre+Baskerville:wght@400;700" },
  { id: "eb-garamond", name: "EB Garamond", tags: ["serif"], googleFont: "EB+Garamond:wght@400;700" },
  { id: "cormorant-garamond", name: "Cormorant Garamond", tags: ["serif", "display"], googleFont: "Cormorant+Garamond:wght@400;700" },
  { id: "roboto-slab", name: "Roboto Slab", tags: ["slab-serif"], googleFont: "Roboto+Slab:wght@400;700" },
  { id: "bitter", name: "Bitter", tags: ["slab-serif"], googleFont: "Bitter:wght@400;700" },
  { id: "arvo", name: "Arvo", tags: ["slab-serif"], googleFont: "Arvo:wght@400;700" },
  { id: "zilla-slab", name: "Zilla Slab", tags: ["slab-serif"], googleFont: "Zilla+Slab:wght@400;700" },
  { id: "bebas-neue", name: "Bebas Neue", tags: ["display", "condensed"], googleFont: "Bebas+Neue:wght@400" },
  { id: "anton", name: "Anton", tags: ["display", "condensed"], googleFont: "Anton:wght@400" },
  { id: "abril-fatface", name: "Abril Fatface", tags: ["display", "serif"], googleFont: "Abril+Fatface:wght@400" },
  { id: "righteous", name: "Righteous", tags: ["display"], googleFont: "Righteous:wght@400" },
  { id: "fredoka", name: "Fredoka", tags: ["display", "sans-serif"], googleFont: "Fredoka:wght@400;600" },
  { id: "alfa-slab-one", name: "Alfa Slab One", tags: ["display", "slab-serif"], googleFont: "Alfa+Slab+One:wght@400" },
  { id: "bungee", name: "Bungee", tags: ["display"], googleFont: "Bungee:wght@400" },
  { id: "pacifico", name: "Pacifico", tags: ["handwriting"], googleFont: "Pacifico:wght@400" },
  { id: "dancing-script", name: "Dancing Script", tags: ["handwriting"], googleFont: "Dancing+Script:wght@400;700" },
  { id: "caveat", name: "Caveat", tags: ["handwriting"], googleFont: "Caveat:wght@400;700" },
  { id: "sacramento", name: "Sacramento", tags: ["handwriting"], googleFont: "Sacramento:wght@400" },
  { id: "shadows-into-light", name: "Shadows Into Light", tags: ["handwriting"], googleFont: "Shadows+Into+Light:wght@400" },
  { id: "great-vibes", name: "Great Vibes", tags: ["handwriting"], googleFont: "Great+Vibes:wght@400" },
  { id: "kalam", name: "Kalam", tags: ["handwriting"], googleFont: "Kalam:wght@400;700" },
  { id: "roboto-mono", name: "Roboto Mono", tags: ["monospace"], googleFont: "Roboto+Mono:wght@400;700" },
  { id: "source-code-pro", name: "Source Code Pro", tags: ["monospace"], googleFont: "Source+Code+Pro:wght@400;700" },
  { id: "jetbrains-mono", name: "JetBrains Mono", tags: ["monospace"], googleFont: "JetBrains+Mono:wght@400;700" },
  { id: "ibm-plex-mono", name: "IBM Plex Mono", tags: ["monospace"], googleFont: "IBM+Plex+Mono:wght@400;700" },
  { id: "space-mono", name: "Space Mono", tags: ["monospace"], googleFont: "Space+Mono:wght@400;700" },
  { id: "courier-prime", name: "Courier Prime", tags: ["monospace"], googleFont: "Courier+Prime:wght@400;700" },
  { id: "oswald", name: "Oswald", tags: ["condensed", "sans-serif"], googleFont: "Oswald:wght@400;700" },
  { id: "pt-sans-narrow", name: "PT Sans Narrow", tags: ["condensed", "sans-serif"], googleFont: "PT+Sans+Narrow:wght@400;700" },
  { id: "barlow-condensed", name: "Barlow Condensed", tags: ["condensed", "sans-serif"], googleFont: "Barlow+Condensed:wght@400;700" },
  { id: "fjalla-one", name: "Fjalla One", tags: ["display", "condensed"], googleFont: "Fjalla+One:wght@400" },
];

export type FontId = (typeof FONTS)[number]["id"];

export const DEFAULT_FONT_ID: FontId = "inter";
export const DEFAULT_FONT_SIZE = 64;

/** Resolves a font id to a full CSS font-family stack, layering the same
 * JP-glyph + generic fallback chain every font used to share when there were
 * only two options — every curated font still falls back gracefully for
 * Japanese text and if the web font somehow fails to load. */
export function getFontStack(id: FontId): string {
  const font = FONTS.find((f) => f.id === id) ?? FONTS.find((f) => f.id === DEFAULT_FONT_ID)!;
  const fallback = font.tags.includes("serif") || font.tags.includes("slab-serif")
    ? '"Noto Serif JP", "Hiragino Mincho ProN", Georgia, serif'
    : font.tags.includes("monospace")
      ? '"Noto Sans JP", ui-monospace, monospace'
      : '"Noto Sans JP", "Hiragino Kaku Gothic ProN", system-ui, sans-serif';
  return `"${font.name}", ${fallback}`;
}

const FONT_LINK_ID = "kei-san-google-fonts";

/**
 * Injects a single combined Google Fonts stylesheet for every curated font,
 * then forces each weight to actually download (a <link> alone only
 * registers @font-face rules — the browser won't fetch the binary until
 * something renders with that font) via the CSS Font Loading API. This also
 * yields genuine per-font progress for the boot loading screen, not a faked
 * animation.
 */
export function ensureFontsLoaded(onProgress?: (ratio: number) => void): Promise<void> {
  if (!document.getElementById(FONT_LINK_ID)) {
    const link = document.createElement("link");
    link.id = FONT_LINK_ID;
    link.rel = "stylesheet";
    // Deliberately NOT encodeURIComponent'd: Google's css2 endpoint expects the
    // "+" (space), ":", ";", and "@" in each family segment literal, exactly as
    // its own docs show them. Percent-encoding them (e.g. "+" -> "%2B") makes
    // Google's server fail to recognize the family entirely — confirmed by
    // curling both forms directly: the encoded version doesn't return CSS at
    // all, it silently 404s into a challenge page, so every multi-word font
    // (anything with a "+" in its name) fell back to the generic sans-serif
    // fallback and looked identical to a handful of other "broken" fonts.
    const families = FONTS.map((f) => `family=${f.googleFont}`).join("&");
    link.href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
    document.head.appendChild(link);
  }

  const specs = FONTS.flatMap((f) => [`400 16px "${f.name}"`, `700 16px "${f.name}"`]);
  let done = 0;
  return Promise.all(
    specs.map((spec) =>
      document.fonts
        .load(spec)
        .catch(() => undefined)
        .finally(() => {
          done += 1;
          onProgress?.(done / specs.length);
        }),
    ),
  ).then(() => undefined);
}
