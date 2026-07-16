import { useEffect, useState } from "react";
import { useProjectStore } from "@/store/projectStore";
import { loadImage } from "@/utils/fileToDataUrl";
import { getColorSuggestions } from "@/canvas/colorExtraction";
import { colorSuggestionsCache } from "@/canvas/analysisCaches";
import { PaletteIcon } from "@/components/RadialMenu/icons";
import { ColorPickerPanel } from "@/components/RadialMenu/contexts/ColorPickerPanel";
import type { SuggestionGroup } from "@/components/RadialMenu/contexts/ColorSwatchPanel";
import type { RingItem } from "@/components/RadialMenu/RadialMenu";

/**
 * A single "Background" ring item now carries every uploaded image's suggested
 * palette (each as its own labeled group inside the one panel) instead of a
 * separate ring pill per image — one place to both browse suggestions and pick a
 * custom color for the canvas background.
 */
export function useCanvasContextItems(): RingItem[] {
  const backgroundColor = useProjectStore((s) => s.project.backgroundColor);
  const setBackgroundColor = useProjectStore((s) => s.setBackgroundColor);
  const images = useProjectStore((s) => s.project.images);
  const [, setWarmTick] = useState(0);

  // Suggestions are normally already cached at upload time (ControlDock). This
  // only covers images restored from an older saved design that predates the
  // cache — decode+compute them once, outside the render loop (calling a hook
  // per-image in a variable-length loop would break the rules of hooks).
  useEffect(() => {
    const missing = images.filter((img) => !colorSuggestionsCache.get(img.dataUrl));
    if (missing.length === 0) return;
    let cancelled = false;
    (async () => {
      for (const img of missing) {
        if (cancelled) return;
        try {
          const loaded = await loadImage(img.dataUrl);
          colorSuggestionsCache.set(img.dataUrl, getColorSuggestions(loaded));
        } catch {
          // Decode failed — that image just won't get a suggestions entry.
        }
      }
      if (!cancelled) setWarmTick((t) => t + 1);
    })();
    return () => {
      cancelled = true;
    };
  }, [images]);

  const suggestionGroups: SuggestionGroup[] = images
    .map((image, idx) => {
      const suggestions = colorSuggestionsCache.get(image.dataUrl);
      return suggestions ? { label: `Img ${idx + 1}`, suggestions } : null;
    })
    .filter((g): g is SuggestionGroup => g !== null);

  return [
    {
      key: "background",
      icon: <PaletteIcon />,
      label: "Background",
      popoverContent: (
        <ColorPickerPanel suggestionGroups={suggestionGroups} value={backgroundColor} onChange={setBackgroundColor} />
      ),
    },
  ];
}
