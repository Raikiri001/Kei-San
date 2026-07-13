import { useMemo } from "react";
import { useProjectStore } from "@/store/projectStore";
import { useUIStore } from "@/store/uiStore";
import { useLoadedImage } from "@/hooks/useLoadedImage";
import { getColorSuggestions } from "@/canvas/colorExtraction";
import { colorSuggestionsCache } from "@/canvas/analysisCaches";
import { DeleteIcon, EdgeGlowIcon, HalftoneIcon, PaletteIcon } from "@/components/RadialMenu/icons";
import { ColorSwatchPanel } from "@/components/RadialMenu/contexts/ColorSwatchPanel";
import type { RingItem } from "@/components/RadialMenu/RadialMenu";

export function useImageContextItems(targetId: string | null): RingItem[] {
  const image = useProjectStore((s) => s.project.images.find((i) => i.id === targetId));
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
  }

  items.push({
    key: "edge-blend",
    icon: <EdgeGlowIcon />,
    label: image.edgeBlend ? "Edge Blend: On" : "Edge Blend",
    active: image.edgeBlend,
    onClick: () => updateImage(id, { edgeBlend: !image.edgeBlend }),
  });

  if (suggestions) {
    items.push({
      key: "colors",
      icon: <PaletteIcon />,
      label: "Colors",
      wide: true,
      expandedContent: <ColorSwatchPanel suggestions={suggestions} onPick={setBackgroundColor} />,
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
