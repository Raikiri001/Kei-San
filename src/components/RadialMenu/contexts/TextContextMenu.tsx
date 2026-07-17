import { useMemo } from "react";
import clsx from "clsx";
import { useProjectStore } from "@/store/projectStore";
import { useUIStore } from "@/store/uiStore";
import { useDraftNumber } from "@/hooks/useDraftNumber";
import { useLoadedImage } from "@/hooks/useLoadedImage";
import { getColorSuggestions } from "@/canvas/colorExtraction";
import { colorSuggestionsCache } from "@/canvas/analysisCaches";
import { NumberStepperField } from "@/components/RadialMenu/NumberStepperField";
import { fieldLabelClass } from "@/components/RadialMenu/inputStyles";
import { FONT_SIZE_MAX, FONT_SIZE_MIN, RESCALE_STEP_PX, TEXT_SCALE_MAX, TEXT_SCALE_MIN } from "@/constants/defaults";
import {
  AlignCenterIcon,
  AlignJustifyIcon,
  AlignLeftIcon,
  AlignRightIcon,
  BringForwardIcon,
  BringToFrontIcon,
  DeleteIcon,
  DimensionsIcon,
  FontIcon,
  LayersIcon,
  OrientationIcon,
  PaletteIcon,
  PencilIcon,
  ResetIcon,
  SendBackwardIcon,
  SendToBackIcon,
  SizeIcon,
} from "@/components/RadialMenu/icons";
import { ColorPickerPanel } from "@/components/RadialMenu/contexts/ColorPickerPanel";
import type { RingItem } from "@/components/RadialMenu/RadialMenu";
import type { TextAlign } from "@/store/types";

const ALIGN_OPTIONS: { value: TextAlign; label: string; Icon: () => React.ReactElement }[] = [
  { value: "left", label: "Left", Icon: AlignLeftIcon },
  { value: "center", label: "Center", Icon: AlignCenterIcon },
  { value: "right", label: "Right", Icon: AlignRightIcon },
  { value: "justify", label: "Justify", Icon: AlignJustifyIcon },
];

/** Renders the icon matching the current alignment, so the collapsed pill itself
 * previews the active state instead of a static icon (unlike font-family/orientation,
 * which only vary their label — alignment has an obvious visual per state worth reusing). */
function AlignIconFor({ value }: { value: TextAlign }) {
  const Icon = ALIGN_OPTIONS.find((o) => o.value === value)?.Icon ?? AlignLeftIcon;
  return <Icon />;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

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

  // Published live by TextElementView (it's the only place with a DOM ref to
  // measure from) — this text's own rendered box at scaleX/scaleY=1, so the
  // Width/Height fields below can convert to/from the existing scaleX/scaleY
  // stretch without re-implementing text measurement here. Falls back to 1×1
  // for the one-frame gap before that effect first reports.
  const base = useUIStore((s) => (targetId ? s.textBaseSizes[targetId] : undefined)) ?? { w: 1, h: 1 };

  const widthDraft = useDraftNumber(text ? Math.round(base.w * text.scaleX) : 0, {
    min: Math.round(base.w * TEXT_SCALE_MIN),
    max: Math.round(base.w * TEXT_SCALE_MAX),
    onCommit: (px) => {
      if (!text) return;
      updateText(text.id, { scaleX: clamp(px / base.w, TEXT_SCALE_MIN, TEXT_SCALE_MAX) });
    },
  });
  const heightDraft = useDraftNumber(text ? Math.round(base.h * text.scaleY) : 0, {
    min: Math.round(base.h * TEXT_SCALE_MIN),
    max: Math.round(base.h * TEXT_SCALE_MAX),
    onCommit: (px) => {
      if (!text) return;
      updateText(text.id, { scaleY: clamp(px / base.h, TEXT_SCALE_MIN, TEXT_SCALE_MAX) });
    },
  });

  if (!text || !targetId) return [];
  const id = targetId;

  // Width and Height used to be two separate drill-down pills, each expanding
  // into its own long horizontal bar (and sharing the same generic SizeIcon as
  // Font Size above, which read ambiguously). Combined into one "Dimensions"
  // pill instead: a single square icon button that unfurls into a compact box
  // (both dimensions grow, not just width) with Width stacked above Height —
  // see IconPill's `stack` mode. Kept separate from the "font-size" item above
  // (still labeled "Font Size", unaffected) since these drive scaleX/scaleY,
  // not fontSize — see the module doc comment.
  const dimensionsSubItems: RingItem[] = [
    {
      key: "dimensions-fields",
      icon: <DimensionsIcon />,
      label: "Dimensions",
      stack: true,
      expandedContent: (
        <>
          <span className="flex items-center gap-1">
            <span className={fieldLabelClass}>W</span>
            <NumberStepperField
              draft={widthDraft}
              onDec={() => updateText(id, { scaleX: clamp((base.w * text.scaleX - RESCALE_STEP_PX) / base.w, TEXT_SCALE_MIN, TEXT_SCALE_MAX) })}
              onInc={() => updateText(id, { scaleX: clamp((base.w * text.scaleX + RESCALE_STEP_PX) / base.w, TEXT_SCALE_MIN, TEXT_SCALE_MAX) })}
              min={Math.round(base.w * TEXT_SCALE_MIN)}
              max={Math.round(base.w * TEXT_SCALE_MAX)}
              ariaLabel="Width in pixels"
            />
          </span>
          <span className="flex items-center gap-1">
            <span className={fieldLabelClass}>H</span>
            <NumberStepperField
              draft={heightDraft}
              onDec={() => updateText(id, { scaleY: clamp((base.h * text.scaleY - RESCALE_STEP_PX) / base.h, TEXT_SCALE_MIN, TEXT_SCALE_MAX) })}
              onInc={() => updateText(id, { scaleY: clamp((base.h * text.scaleY + RESCALE_STEP_PX) / base.h, TEXT_SCALE_MIN, TEXT_SCALE_MAX) })}
              min={Math.round(base.h * TEXT_SCALE_MIN)}
              max={Math.round(base.h * TEXT_SCALE_MAX)}
              ariaLabel="Height in pixels"
            />
          </span>
        </>
      ),
    },
    {
      key: "reset-dimensions",
      icon: <ResetIcon />,
      label: "Reset Size",
      onClick: () => updateText(id, { scaleX: 1, scaleY: 1 }),
    },
  ];

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
    ...(text.orientation === "horizontal"
      ? [
          {
            key: "align",
            icon: <AlignIconFor value={text.align} />,
            label: ALIGN_OPTIONS.find((o) => o.value === text.align)?.label ?? "Align",
            wide: true,
            expandedContent: (
              <span className="flex items-center gap-1">
                {ALIGN_OPTIONS.map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => updateText(id, { align: value })}
                    aria-label={`Align ${label}`}
                    aria-pressed={text.align === value}
                    className={clsx(
                      "press-scale flex h-5 w-5 items-center justify-center rounded border transition-colors duration-150",
                      text.align === value
                        ? "border-accent/70 text-accent"
                        : "border-[rgb(var(--chrome-border)/0.2)] hover:border-accent/50",
                    )}
                  >
                    <Icon />
                  </button>
                ))}
              </span>
            ),
          } satisfies RingItem,
        ]
      : []),
    {
      key: "size",
      icon: <SizeIcon />,
      label: "Font Size",
      wide: true,
      expandedContent: (
        <NumberStepperField
          draft={fontSizeDraft}
          onDec={() => updateText(id, { fontSize: Math.max(FONT_SIZE_MIN, text.fontSize - 8) })}
          onInc={() => updateText(id, { fontSize: Math.min(FONT_SIZE_MAX, text.fontSize + 8) })}
          min={FONT_SIZE_MIN}
          max={FONT_SIZE_MAX}
          ariaLabel="Font size in pixels"
        />
      ),
    },
    {
      key: "dimensions",
      icon: <DimensionsIcon />,
      label: "Dimensions",
      subItems: dimensionsSubItems,
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
        <ColorPickerPanel
          suggestionGroups={[{ label: "Suggested", suggestions }]}
          value={text.color}
          onChange={(color) => updateText(id, { color })}
        />
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
