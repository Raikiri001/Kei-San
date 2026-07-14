import { useMemo } from "react";
import { useProjectStore } from "@/store/projectStore";
import { useUIStore } from "@/store/uiStore";
import { useDraftNumber } from "@/hooks/useDraftNumber";
import { useLoadedImage } from "@/hooks/useLoadedImage";
import { getColorSuggestions } from "@/canvas/colorExtraction";
import { colorSuggestionsCache } from "@/canvas/analysisCaches";
import { numberInputClass } from "@/components/RadialMenu/inputStyles";
import {
  BringForwardIcon,
  BringToFrontIcon,
  DeleteIcon,
  FontIcon,
  LayersIcon,
  OrientationIcon,
  PaletteIcon,
  PencilIcon,
  SendBackwardIcon,
  SendToBackIcon,
  SizeIcon,
} from "@/components/RadialMenu/icons";
import { ColorPickerPanel } from "@/components/RadialMenu/contexts/ColorPickerPanel";
import type { RingItem } from "@/components/RadialMenu/RadialMenu";

const FONT_SIZE_MIN = 12;
const FONT_SIZE_MAX = 400;

export function useTextContextItems(targetId: string | null): RingItem[] {
  const text = useProjectStore((s) => s.project.texts.find((t) => t.id === targetId));
  const updateText = useProjectStore((s) => s.updateText);
  const deleteText = useProjectStore((s) => s.deleteText);
  const bringToFront = useProjectStore((s) => s.bringToFront);
  const bringForward = useProjectStore((s) => s.bringForward);
  const sendBackward = useProjectStore((s) => s.sendBackward);
  const sendToBack = useProjectStore((s) => s.sendToBack);
  const closeRadialMenu = useUIStore((s) => s.closeRadialMenu);
  const setEditingTextId = useUIStore((s) => s.setEditingTextId);

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

  const fontSizeDraft = useDraftNumber(text ? text.fontSize : 0, {
    min: FONT_SIZE_MIN,
    max: FONT_SIZE_MAX,
    onCommit: (fontSize) => {
      if (!text) return;
      updateText(text.id, { fontSize });
    },
  });

  if (!text || !targetId) return [];
  const id = targetId;

  const layerSubItems: RingItem[] = [
    { key: "bring-to-front", icon: <BringToFrontIcon />, label: "Bring to Front", onClick: () => bringToFront(id) },
    { key: "bring-forward", icon: <BringForwardIcon />, label: "Bring Forward", onClick: () => bringForward(id) },
    { key: "send-backward", icon: <SendBackwardIcon />, label: "Send Backward", onClick: () => sendBackward(id) },
    { key: "send-to-back", icon: <SendToBackIcon />, label: "Send to Back", onClick: () => sendToBack(id) },
  ];

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
      wide: true,
      expandedContent: (
        <span className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => updateText(id, { fontSize: Math.max(FONT_SIZE_MIN, text.fontSize - 8) })}
            className="flex h-5 w-5 items-center justify-center rounded border border-white/20"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => updateText(id, { fontSize: Math.min(FONT_SIZE_MAX, text.fontSize + 8) })}
            className="flex h-5 w-5 items-center justify-center rounded border border-white/20"
          >
            +
          </button>
          <input
            type="number"
            min={FONT_SIZE_MIN}
            max={FONT_SIZE_MAX}
            value={fontSizeDraft.draft}
            onChange={fontSizeDraft.onChange}
            onFocus={fontSizeDraft.onFocus}
            onBlur={fontSizeDraft.onBlur}
            onKeyDown={fontSizeDraft.onKeyDown}
            className={numberInputClass}
            aria-label="Font size in pixels"
          />
        </span>
      ),
    },
    {
      key: "content",
      icon: <PencilIcon />,
      label: "Edit Text",
      // The ring is only a secondary path to editing now — the primary path is
      // tapping the text directly, which opens the same inline on-canvas box.
      onClick: () => {
        closeRadialMenu();
        setEditingTextId(id);
      },
    },
  ];

  if (suggestions) {
    items.push({
      key: "colors",
      icon: <PaletteIcon />,
      label: "Colors",
      popoverContent: (
        <ColorPickerPanel suggestions={suggestions} value={text.color} onChange={(color) => updateText(id, { color })} />
      ),
    });
  }

  items.push({
    key: "layers",
    icon: <LayersIcon />,
    label: "Layers",
    subItems: layerSubItems,
  });

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
