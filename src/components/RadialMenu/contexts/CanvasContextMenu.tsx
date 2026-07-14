import { useEffect, useState } from "react";
import { useProjectStore } from "@/store/projectStore";
import { loadImage } from "@/utils/fileToDataUrl";
import { getColorSuggestions } from "@/canvas/colorExtraction";
import { colorSuggestionsCache } from "@/canvas/analysisCaches";
import { PaletteIcon } from "@/components/RadialMenu/icons";
import { ColorPickerPanel } from "@/components/RadialMenu/contexts/ColorPickerPanel";
import type { RingItem } from "@/components/RadialMenu/RadialMenu";

/**
 * Picking a background color here — rather than from an image's own tool menu —
 * makes the association explicit: every uploaded image gets its own entry with
 * its 3 suggested color groups, so it's clear which image a suggestion came from
 * and that choosing one sets the canvas background (not the image itself).
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

  const items: RingItem[] = [
    {
      key: "background",
      icon: <PaletteIcon />,
      label: "Background",
      popoverContent: <ColorPickerPanel suggestions={null} value={backgroundColor} onChange={setBackgroundColor} />,
    },
  ];

  images.forEach((image, idx) => {
    const suggestions = colorSuggestionsCache.get(image.dataUrl);
    if (!suggestions) return;
    items.push({
      key: `bg-from-image-${image.id}`,
      icon: <img src={image.dataUrl} alt="" className="h-full w-full rounded-full object-cover" />,
      label: `Image ${idx + 1}`,
      popoverContent: <ColorPickerPanel suggestions={suggestions} value={backgroundColor} onChange={setBackgroundColor} />,
    });
  });

  return items;
}
