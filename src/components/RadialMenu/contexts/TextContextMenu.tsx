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
import {
  DEFAULT_TEXT_BOX_HEIGHT,
  DEFAULT_TEXT_BOX_WIDTH,
  DISPLAY_SIZE_MAX,
  DISPLAY_SIZE_MIN,
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  GLOW_SIZE_MAX,
  GLOW_SIZE_MIN,
  RESCALE_STEP_PX,
  WARP_MAX,
  WARP_MIN,
  WARP_STEP_PERCENT,
} from "@/constants/defaults";
import {
  AlignCenterIcon,
  AlignJustifyIcon,
  AlignLeftIcon,
  AlignRightIcon,
  BoldIcon,
  BringForwardIcon,
  BringToFrontIcon,
  DeleteIcon,
  DimensionsIcon,
  FontIcon,
  GlowIcon,
  ItalicIcon,
  LayersIcon,
  LayoutIcon,
  OrientationIcon,
  PaletteIcon,
  PencilIcon,
  ResetIcon,
  SendBackwardIcon,
  SendToBackIcon,
  SizeIcon,
  UnderlineIcon,
  WarpIcon,
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

const STYLE_TOGGLES: { key: "bold" | "italic" | "underline"; label: string; Icon: () => React.ReactElement }[] = [
  { key: "bold", label: "Bold", Icon: BoldIcon },
  { key: "italic", label: "Italic", Icon: ItalicIcon },
  { key: "underline", label: "Underline", Icon: UnderlineIcon },
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

  const glowSizeDraft = useDraftNumber(text ? text.glowSize : 0, {
    min: GLOW_SIZE_MIN,
    max: GLOW_SIZE_MAX,
    onCommit: (glowSize) => {
      if (!text) return;
      updateText(text.id, { glowSize });
    },
  });

  // Dimensions now edit the text's own boxWidth/boxHeight directly — a real
  // textbox frame (see TextElement's doc comment), same as an image's
  // displayWidth/Height. No more measuring a "base" DOM size to convert
  // to/from a scale factor; the stored fields ARE the pixel dimensions.
  const widthDraft = useDraftNumber(text ? Math.round(text.boxWidth) : 0, {
    min: DISPLAY_SIZE_MIN,
    max: DISPLAY_SIZE_MAX,
    onCommit: (boxWidth) => {
      if (!text) return;
      updateText(text.id, { boxWidth });
    },
  });
  const heightDraft = useDraftNumber(text ? Math.round(text.boxHeight) : 0, {
    min: DISPLAY_SIZE_MIN,
    max: DISPLAY_SIZE_MAX,
    onCommit: (boxHeight) => {
      if (!text) return;
      updateText(text.id, { boxHeight });
    },
  });

  // Warp: a purely decorative glyph stretch, displayed/edited as a percentage
  // (100% = warpX/Y of 1, no warp) — independent of the box dimensions above.
  const warpXDraft = useDraftNumber(text ? Math.round(text.warpX * 100) : 100, {
    min: Math.round(WARP_MIN * 100),
    max: Math.round(WARP_MAX * 100),
    onCommit: (percent) => {
      if (!text) return;
      updateText(text.id, { warpX: clamp(percent / 100, WARP_MIN, WARP_MAX) });
    },
  });
  const warpYDraft = useDraftNumber(text ? Math.round(text.warpY * 100) : 100, {
    min: Math.round(WARP_MIN * 100),
    max: Math.round(WARP_MAX * 100),
    onCommit: (percent) => {
      if (!text) return;
      updateText(text.id, { warpY: clamp(percent / 100, WARP_MIN, WARP_MAX) });
    },
  });

  if (!text || !targetId) return [];
  const id = targetId;

  // Width/Height combined into one stacked "Dimensions" pill (a square icon
  // button that unfurls into a compact box, both dimensions growing together)
  // rather than two separate pills each expanding sideways — see IconPill's
  // `stack` mode doc comment.
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
              onDec={() => updateText(id, { boxWidth: clamp(text.boxWidth - RESCALE_STEP_PX, DISPLAY_SIZE_MIN, DISPLAY_SIZE_MAX) })}
              onInc={() => updateText(id, { boxWidth: clamp(text.boxWidth + RESCALE_STEP_PX, DISPLAY_SIZE_MIN, DISPLAY_SIZE_MAX) })}
              min={DISPLAY_SIZE_MIN}
              max={DISPLAY_SIZE_MAX}
              ariaLabel="Width in pixels"
            />
          </span>
          <span className="flex items-center gap-1">
            <span className={fieldLabelClass}>H</span>
            <NumberStepperField
              draft={heightDraft}
              onDec={() => updateText(id, { boxHeight: clamp(text.boxHeight - RESCALE_STEP_PX, DISPLAY_SIZE_MIN, DISPLAY_SIZE_MAX) })}
              onInc={() => updateText(id, { boxHeight: clamp(text.boxHeight + RESCALE_STEP_PX, DISPLAY_SIZE_MIN, DISPLAY_SIZE_MAX) })}
              min={DISPLAY_SIZE_MIN}
              max={DISPLAY_SIZE_MAX}
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
      onClick: () => updateText(id, { boxWidth: DEFAULT_TEXT_BOX_WIDTH, boxHeight: DEFAULT_TEXT_BOX_HEIGHT }),
    },
  ];

  // Warp: same stacked-pill pattern as Dimensions, but for the decorative
  // percentage stretch instead of the box's real layout size.
  const warpSubItems: RingItem[] = [
    {
      key: "warp-fields",
      icon: <WarpIcon />,
      label: "Warp",
      stack: true,
      expandedContent: (
        <>
          <span className="flex items-center gap-1">
            <span className={fieldLabelClass}>X</span>
            <NumberStepperField
              draft={warpXDraft}
              onDec={() => updateText(id, { warpX: clamp(text.warpX - WARP_STEP_PERCENT / 100, WARP_MIN, WARP_MAX) })}
              onInc={() => updateText(id, { warpX: clamp(text.warpX + WARP_STEP_PERCENT / 100, WARP_MIN, WARP_MAX) })}
              min={Math.round(WARP_MIN * 100)}
              max={Math.round(WARP_MAX * 100)}
              ariaLabel="Horizontal warp percentage"
              unit="%"
            />
          </span>
          <span className="flex items-center gap-1">
            <span className={fieldLabelClass}>Y</span>
            <NumberStepperField
              draft={warpYDraft}
              onDec={() => updateText(id, { warpY: clamp(text.warpY - WARP_STEP_PERCENT / 100, WARP_MIN, WARP_MAX) })}
              onInc={() => updateText(id, { warpY: clamp(text.warpY + WARP_STEP_PERCENT / 100, WARP_MIN, WARP_MAX) })}
              min={Math.round(WARP_MIN * 100)}
              max={Math.round(WARP_MAX * 100)}
              ariaLabel="Vertical warp percentage"
              unit="%"
            />
          </span>
        </>
      ),
    },
    {
      key: "reset-warp",
      icon: <ResetIcon />,
      label: "Reset Warp",
      disabled: text.warpX === 1 && text.warpY === 1,
      onClick: () => updateText(id, { warpX: 1, warpY: 1 }),
    },
  ];

  const layerSubItems: RingItem[] = [
    { key: "bring-to-front", icon: <BringToFrontIcon />, label: "Bring to Front", onClick: () => bringToFront(id) },
    { key: "bring-forward", icon: <BringForwardIcon />, label: "Bring Forward", onClick: () => bringForward(id) },
    { key: "send-backward", icon: <SendBackwardIcon />, label: "Send Backward", onClick: () => sendBackward(id) },
    { key: "send-to-back", icon: <SendToBackIcon />, label: "Send to Back", onClick: () => sendToBack(id) },
  ];

  // Typography controls grouped one level in behind a "Text" group pill —
  // keeps the root ring's item count (and therefore its radius, see
  // ring-layout.ts) small and fixed regardless of whether Colors happens to
  // be available this session.
  const textSubItems: RingItem[] = [
    {
      key: "font-family",
      icon: <FontIcon />,
      label: text.fontFamily === "sans" ? "Sans" : "Serif",
      onClick: () => updateText(id, { fontFamily: text.fontFamily === "sans" ? "serif" : "sans" }),
    },
    {
      key: "style",
      icon: <BoldIcon />,
      label: "Style",
      active: text.bold || text.italic || text.underline,
      wide: true,
      expandedContent: (
        <span className="flex items-center gap-1">
          {STYLE_TOGGLES.map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => updateText(id, { [key]: !text[key] })}
              aria-label={label}
              aria-pressed={text[key]}
              className={clsx(
                "press-scale flex h-5 w-5 items-center justify-center rounded border transition-colors duration-150",
                text[key] ? "border-accent/70 text-accent" : "border-[rgb(var(--chrome-border)/0.2)] hover:border-accent/50",
              )}
            >
              <Icon />
            </button>
          ))}
        </span>
      ),
    },
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
  ];

  // Always available (not gated on an uploaded image's suggestions existing) —
  // custom swatches and the eyedropper inside ColorPickerPanel work regardless
  // of whether any image-derived suggestions do.
  textSubItems.push({
    key: "colors",
    icon: <PaletteIcon />,
    label: "Colors",
    popoverContent: (
      <ColorPickerPanel
        suggestionGroups={suggestions ? [{ label: "Suggested", suggestions }] : []}
        value={text.color}
        alpha={text.colorAlpha}
        onChange={(color) => updateText(id, { color })}
        onAlphaChange={(colorAlpha) => updateText(id, { colorAlpha })}
      />
    ),
  });

  // Glow: an outer, blurred, colored halo — a group pill (toggle + size +
  // color, same stacked-controls pattern as Dimensions/Warp) rather than a
  // single pill, since it has three independently editable pieces.
  const glowSubItems: RingItem[] = [
    {
      key: "glow-toggle",
      icon: <GlowIcon />,
      label: text.glow ? "Glow: On" : "Glow: Off",
      status: text.glow ? "on" : "off",
      onClick: () => updateText(id, { glow: !text.glow }),
    },
    {
      key: "glow-size",
      icon: <GlowIcon />,
      label: "Glow Size",
      wide: true,
      disabled: !text.glow,
      expandedContent: (
        <NumberStepperField
          draft={glowSizeDraft}
          onDec={() => updateText(id, { glowSize: clamp(text.glowSize - 8, GLOW_SIZE_MIN, GLOW_SIZE_MAX) })}
          onInc={() => updateText(id, { glowSize: clamp(text.glowSize + 8, GLOW_SIZE_MIN, GLOW_SIZE_MAX) })}
          min={GLOW_SIZE_MIN}
          max={GLOW_SIZE_MAX}
          ariaLabel="Glow size in pixels"
        />
      ),
    },
    {
      key: "glow-color",
      icon: <PaletteIcon />,
      label: "Glow Color",
      disabled: !text.glow,
      popoverContent: (
        <ColorPickerPanel
          suggestionGroups={[]}
          value={text.glowColor}
          onChange={(glowColor) => updateText(id, { glowColor })}
        />
      ),
    },
  ];

  textSubItems.push({
    key: "glow",
    icon: <GlowIcon />,
    label: "Glow",
    active: text.glow,
    subItems: glowSubItems,
  });

  // Box/arrangement controls grouped behind a "Layout" group pill — Dimensions
  // and Warp are themselves group pills, so this is a two-deep drill-down
  // (Layout -> Dimensions -> W/H fields), which the ring already supports (see
  // resolveActiveItems's path walk in RadialMenu.tsx).
  const layoutSubItems: RingItem[] = [
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
      key: "dimensions",
      icon: <DimensionsIcon />,
      label: "Dimensions",
      subItems: dimensionsSubItems,
    },
    {
      key: "warp",
      icon: <WarpIcon />,
      label: "Warp",
      active: text.warpX !== 1 || text.warpY !== 1,
      subItems: warpSubItems,
    },
  ];

  // Root ring: a fixed 5 pills regardless of state (Colors/Align availability
  // only ever changes a nested submenu's count, not this one) — see
  // ring-layout.ts for why keeping the root count small and stable keeps the
  // ring close to the tap point instead of ballooning outward.
  return [
    {
      key: "content",
      icon: <PencilIcon />,
      label: "Edit Text",
      // The ring is only a secondary path to editing now — the primary path is
      // double-clicking the text directly, which opens the same inline
      // on-canvas box (see TextElementView's onDoubleClick).
      onClick: () => {
        closeRadialMenu();
        setEditingTextId(id);
      },
    },
    {
      key: "text",
      icon: <FontIcon />,
      label: "Text",
      subItems: textSubItems,
    },
    {
      key: "layout",
      icon: <LayoutIcon />,
      label: "Layout",
      subItems: layoutSubItems,
    },
    {
      key: "layers",
      icon: <LayersIcon />,
      label: "Layers",
      subItems: layerSubItems,
    },
    {
      key: "delete",
      icon: <DeleteIcon />,
      label: "Delete",
      onClick: () => {
        deleteText(id);
        closeRadialMenu();
      },
    },
  ];
}
