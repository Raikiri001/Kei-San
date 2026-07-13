import { useMemo } from "react";
import { useProjectStore } from "@/store/projectStore";
import { useUIStore } from "@/store/uiStore";
import { useLoadedImage } from "@/hooks/useLoadedImage";
import { getColorSuggestions } from "@/canvas/colorExtraction";
import { colorSuggestionsCache } from "@/canvas/analysisCaches";
import { DeleteIcon, EdgeGlowIcon, HalftoneIcon, PaletteIcon, SizeIcon } from "@/components/RadialMenu/icons";
import { ColorPickerPanel } from "@/components/RadialMenu/contexts/ColorPickerPanel";
import type { RingItem } from "@/components/RadialMenu/RadialMenu";

const DOT_PITCH_MIN = 4;
const DOT_PITCH_MAX = 40;
const DOT_PITCH_STEP = 2;

const BLEND_MARGIN_MIN = 8;
const BLEND_MARGIN_MAX = 400;
const BLEND_MARGIN_STEP = 10;

const DISPLAY_SIZE_MIN = 20;
const DISPLAY_SIZE_MAX = 4000;
const RESCALE_FACTOR = 1.1;

function Stepper({ onDec, onInc }: { onDec: () => void; onInc: () => void }) {
  return (
    <span className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={onDec}
        className="flex h-5 w-5 items-center justify-center rounded border border-white/20"
      >
        −
      </button>
      <button
        type="button"
        onClick={onInc}
        className="flex h-5 w-5 items-center justify-center rounded border border-white/20"
      >
        +
      </button>
    </span>
  );
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function useImageContextItems(targetId: string | null): RingItem[] {
  const image = useProjectStore((s) => s.project.images.find((i) => i.id === targetId));
  const backgroundColor = useProjectStore((s) => s.project.backgroundColor);
  const updateImage = useProjectStore((s) => s.updateImage);
  const deleteImage = useProjectStore((s) => s.deleteImage);
  const setBackgroundColor = useProjectStore((s) => s.setBackgroundColor);
  const closeRadialMenu = useUIStore((s) => s.closeRadialMenu);

  const cached = image ? colorSuggestionsCache.get(image.dataUrl) : undefined;
  const loadedImg = useLoadedImage(!cached && image ? image.dataUrl : null);
  const suggestions = useMemo(() => {
    if (cached) return cached;
    if (!image || !loadedImg) return null;
    const computed = getColorSuggestions(loadedImg);
    colorSuggestionsCache.set(image.dataUrl, computed);
    return computed;
  }, [cached, image, loadedImg]);

  if (!image || !targetId) return [];
  const id = targetId;

  const items: RingItem[] = [
    {
      key: "halftone",
      icon: <HalftoneIcon />,
      label: image.circleMask ? "Halftone: On" : "Halftone",
      active: image.circleMask,
      onClick: () => updateImage(id, { circleMask: !image.circleMask }),
    },
  ];

  if (image.circleMask) {
    items.push({
      key: "halftone-mode",
      icon: <HalftoneIcon />,
      label: image.halftoneMode === "color" ? "Mode: Photo" : "Mode: Ink",
      onClick: () => updateImage(id, { halftoneMode: image.halftoneMode === "color" ? "ink" : "color" }),
    });
    items.push({
      key: "halftone-intensity",
      icon: <HalftoneIcon />,
      label: `Dot Size: ${image.halftoneDotPitch}px`,
      expandedContent: (
        <Stepper
          onDec={() => updateImage(id, { halftoneDotPitch: clamp(image.halftoneDotPitch - DOT_PITCH_STEP, DOT_PITCH_MIN, DOT_PITCH_MAX) })}
          onInc={() => updateImage(id, { halftoneDotPitch: clamp(image.halftoneDotPitch + DOT_PITCH_STEP, DOT_PITCH_MIN, DOT_PITCH_MAX) })}
        />
      ),
    });
  }

  items.push({
    key: "edge-blend",
    icon: <EdgeGlowIcon />,
    label: image.edgeBlend ? "Edge Blend: On" : "Edge Blend",
    active: image.edgeBlend,
    onClick: () => updateImage(id, { edgeBlend: !image.edgeBlend }),
  });

  if (image.edgeBlend) {
    items.push({
      key: "edge-blend-size",
      icon: <EdgeGlowIcon />,
      label: `Blend Size: ${Math.round(image.edgeBlendMargin)}px`,
      expandedContent: (
        <Stepper
          onDec={() =>
            updateImage(id, { edgeBlendMargin: clamp(image.edgeBlendMargin - BLEND_MARGIN_STEP, BLEND_MARGIN_MIN, BLEND_MARGIN_MAX) })
          }
          onInc={() =>
            updateImage(id, { edgeBlendMargin: clamp(image.edgeBlendMargin + BLEND_MARGIN_STEP, BLEND_MARGIN_MIN, BLEND_MARGIN_MAX) })
          }
        />
      ),
    });
  }

  items.push({
    key: "size",
    icon: <SizeIcon />,
    label: `Size: ${Math.round(image.displayWidth)}px`,
    expandedContent: (
      <Stepper
        onDec={() => {
          const displayWidth = clamp(image.displayWidth / RESCALE_FACTOR, DISPLAY_SIZE_MIN, DISPLAY_SIZE_MAX);
          const displayHeight = clamp(image.displayHeight / RESCALE_FACTOR, DISPLAY_SIZE_MIN, DISPLAY_SIZE_MAX);
          updateImage(id, { displayWidth, displayHeight });
        }}
        onInc={() => {
          const displayWidth = clamp(image.displayWidth * RESCALE_FACTOR, DISPLAY_SIZE_MIN, DISPLAY_SIZE_MAX);
          const displayHeight = clamp(image.displayHeight * RESCALE_FACTOR, DISPLAY_SIZE_MIN, DISPLAY_SIZE_MAX);
          updateImage(id, { displayWidth, displayHeight });
        }}
      />
    ),
  });

  if (suggestions) {
    items.push({
      key: "colors",
      icon: <PaletteIcon />,
      label: "Colors",
      popoverContent: <ColorPickerPanel suggestions={suggestions} value={backgroundColor} onChange={setBackgroundColor} />,
    });
  }

  items.push({
    key: "delete",
    icon: <DeleteIcon />,
    label: "Delete",
    onClick: () => {
      deleteImage(id);
      closeRadialMenu();
    },
  });

  return items;
}
