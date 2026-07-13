import { useMemo } from "react";
import { useProjectStore } from "@/store/projectStore";
import { useUIStore } from "@/store/uiStore";
import { useLoadedImage } from "@/hooks/useLoadedImage";
import { getColorSuggestions } from "@/canvas/colorExtraction";
import { colorSuggestionsCache } from "@/canvas/analysisCaches";
import {
  DeleteIcon,
  FontIcon,
  OrientationIcon,
  PaletteIcon,
  SizeIcon,
  TextContentIcon,
} from "@/components/RadialMenu/icons";
import { ColorSwatchPanel } from "@/components/RadialMenu/contexts/ColorSwatchPanel";
import type { RingItem } from "@/components/RadialMenu/RadialMenu";

export function useTextContextItems(targetId: string | null): RingItem[] {
  const text = useProjectStore((s) => s.project.texts.find((t) => t.id === targetId));
  const updateText = useProjectStore((s) => s.updateText);
  const deleteText = useProjectStore((s) => s.deleteText);
  const closeRadialMenu = useUIStore((s) => s.closeRadialMenu);

  // Colors pill sources suggestions from the first uploaded image, if any exist.
  const sourceImage = useProjectStore((s) => s.project.images[0]);
  const cached = sourceImage ? colorSuggestionsCache.get(sourceImage.dataUrl) : undefined;
  const loadedImg = useLoadedImage(!cached && sourceImage ? sourceImage.dataUrl : null);
  const suggestions = useMemo(() => {
    if (cached) return cached;
    if (!sourceImage || !loadedImg) return null;
    const computed = getColorSuggestions(loadedImg);
    colorSuggestionsCache.set(sourceImage.dataUrl, computed);
    return computed;
  }, [cached, sourceImage, loadedImg]);

  if (!text || !targetId) return [];
  const id = targetId;

  const items: RingItem[] = [
    {
      key: "font-family",
      icon: <FontIcon />,
      label: text.fontFamily === "sans" ? "Sans" : "Serif",
      onClick: () => updateText(id, { fontFamily: text.fontFamily === "sans" ? "serif" : "sans" }),
    },
    {
      key: "orientation",
      icon: <OrientationIcon />,
      label: text.orientation === "horizontal" ? "Horizontal" : "Vertical",
      active: text.orientation === "vertical",
      onClick: () =>
        updateText(id, { orientation: text.orientation === "horizontal" ? "vertical" : "horizontal" }),
    },
    {
      key: "size",
      icon: <SizeIcon />,
      label: `${text.fontSize}px`,
      expandedContent: (
        <span className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => updateText(id, { fontSize: Math.max(12, text.fontSize - 8) })}
            className="flex h-5 w-5 items-center justify-center rounded border border-white/20"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => updateText(id, { fontSize: Math.min(400, text.fontSize + 8) })}
            className="flex h-5 w-5 items-center justify-center rounded border border-white/20"
          >
            +
          </button>
        </span>
      ),
    },
    {
      key: "content",
      icon: <TextContentIcon />,
      label: "Edit Text",
      expandedContent: (
        <input
          autoFocus
          value={text.content}
          onChange={(e) => updateText(id, { content: e.target.value })}
          className="w-32 border-b border-white/30 bg-transparent px-1 text-[11px] outline-none"
        />
      ),
    },
  ];

  if (suggestions) {
    items.push({
      key: "colors",
      icon: <PaletteIcon />,
      label: "Colors",
      wide: true,
      expandedContent: (
        <ColorSwatchPanel suggestions={suggestions} onPick={(color) => updateText(id, { color })} />
      ),
    });
  }

  items.push({
    key: "delete",
    icon: <DeleteIcon />,
    label: "Delete",
    onClick: () => {
      deleteText(id);
      closeRadialMenu();
    },
  });

  return items;
}
