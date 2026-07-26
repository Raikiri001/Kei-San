import { useEffect, useState } from "react";
import { useProjectStore } from "@/store/projectStore";
import { useUIStore } from "@/store/uiStore";
import { loadImage } from "@/utils/fileToDataUrl";
import { getColorSuggestions } from "@/canvas/colorExtraction";
import { colorSuggestionsCache } from "@/canvas/analysisCaches";
import { ColorPickerPanel } from "@/components/RadialMenu/contexts/ColorPickerPanel";
import type { SuggestionGroup } from "@/components/RadialMenu/contexts/ColorSwatchPanel";
import { LeftDockPanel } from "@/components/LeftDockPanel";
import { BACKGROUND_COLOR_PANEL_WIDTH } from "@/constants/defaults";

/**
 * Background Color's left-docked panel — the canvas background color picker,
 * previously a RailPopover flyout, now the same shared push/expand shell as
 * every other rail panel.
 */
export function BackgroundColorPanel() {
  const open = useUIStore((s) => s.activeLeftPanel === "backgroundColor");
  const closeLeftPanel = useUIStore((s) => s.closeLeftPanel);
  const backgroundColor = useProjectStore((s) => s.project.backgroundColor);
  const setBackgroundColor = useProjectStore((s) => s.setBackgroundColor);
  const backgroundAlpha = useProjectStore((s) => s.project.backgroundAlpha);
  const setBackgroundAlpha = useProjectStore((s) => s.setBackgroundAlpha);
  const images = useProjectStore((s) => s.project.images);

  const [, setWarmTick] = useState(0);

  // Suggestions are normally already cached at upload time (UploadPanel). This
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

  return (
    <LeftDockPanel open={open} onClose={closeLeftPanel} title="Background Color" width={BACKGROUND_COLOR_PANEL_WIDTH}>
      <ColorPickerPanel
        suggestionGroups={suggestionGroups}
        value={backgroundColor}
        alpha={backgroundAlpha}
        onChange={setBackgroundColor}
        onAlphaChange={setBackgroundAlpha}
      />
    </LeftDockPanel>
  );
}
