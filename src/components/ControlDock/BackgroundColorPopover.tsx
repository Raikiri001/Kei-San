import { useEffect, useRef, useState } from "react";
import { useProjectStore } from "@/store/projectStore";
import { useClickOutside } from "@/hooks/useClickOutside";
import { loadImage } from "@/utils/fileToDataUrl";
import { getColorSuggestions } from "@/canvas/colorExtraction";
import { colorSuggestionsCache } from "@/canvas/analysisCaches";
import { PaletteIcon } from "@/components/RadialMenu/icons";
import { ColorPickerPanel } from "@/components/RadialMenu/contexts/ColorPickerPanel";
import type { SuggestionGroup } from "@/components/RadialMenu/contexts/ColorSwatchPanel";
import { ToolbarIconButton } from "@/components/ControlDock/ToolbarIconButton";

/**
 * Toolbar home for the canvas background color picker — previously the sole
 * item behind a radial menu on background click, now a trigger next to Canvas
 * Settings since both configure canvas-level properties, not per-element ones.
 */
export function BackgroundColorPopover() {
  const backgroundColor = useProjectStore((s) => s.project.backgroundColor);
  const setBackgroundColor = useProjectStore((s) => s.setBackgroundColor);
  const backgroundAlpha = useProjectStore((s) => s.project.backgroundAlpha);
  const setBackgroundAlpha = useProjectStore((s) => s.setBackgroundAlpha);
  const images = useProjectStore((s) => s.project.images);

  const [open, setOpen] = useState(false);
  const [, setWarmTick] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  useClickOutside(rootRef, () => setOpen(false), open);

  // Suggestions are normally already cached at upload time (UploadDialog). This
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
    <div ref={rootRef} className="relative">
      <ToolbarIconButton
        onClick={() => setOpen((o) => !o)}
        icon={<PaletteIcon />}
        label="Background Color"
        ariaExpanded={open}
        active={open}
        forceExpanded={open}
      />

      {open && (
        <div className="glass-panel corner-frame radial-appear absolute left-0 top-full z-40 mt-2 p-2">
          <span className="corner-tl" />
          <span className="corner-bl" />
          <span className="corner-br" />
          <ColorPickerPanel
            suggestionGroups={suggestionGroups}
            value={backgroundColor}
            alpha={backgroundAlpha}
            onChange={setBackgroundColor}
            onAlphaChange={setBackgroundAlpha}
          />
        </div>
      )}
    </div>
  );
}
