import { createAnalysisCache } from "@/canvas/imageAnalysisCache";
import type { ColorSuggestions, RGB } from "@/canvas/colorExtraction";

/** Populated eagerly at upload time (ControlDock); consulted everywhere an image's derived values are needed. */
export const colorSuggestionsCache = createAnalysisCache<ColorSuggestions>();
export const edgeColorCache = createAnalysisCache<RGB>();
