import { useProjectStore } from "@/store/projectStore";
import { useUIStore } from "@/store/uiStore";
import { useDraftNumber } from "@/hooks/useDraftNumber";
import { NumberStepperField } from "@/components/RadialMenu/NumberStepperField";
import { fieldLabelClass } from "@/components/RadialMenu/inputStyles";
import { DISPLAY_SIZE_MAX, DISPLAY_SIZE_MIN, RESCALE_STEP_PX } from "@/constants/defaults";
import {
  BringForwardIcon,
  BringToFrontIcon,
  CropIcon,
  DeleteIcon,
  DimensionsIcon,
  EdgeGlowIcon,
  HalftoneIcon,
  LayersIcon,
  OpacityIcon,
  ResetIcon,
  SendBackwardIcon,
  SendToBackIcon,
} from "@/components/RadialMenu/icons";
import type { RingItem } from "@/components/RadialMenu/RadialMenu";

const DOT_PITCH_MIN = 4;
const DOT_PITCH_MAX = 40;
const DOT_PITCH_STEP = 2;

const BLEND_MARGIN_MIN = 8;
const BLEND_MARGIN_MAX = 400;
const BLEND_MARGIN_STEP = 10;

const OPACITY_PERCENT_MIN = 0;
const OPACITY_PERCENT_MAX = 100;
const OPACITY_PERCENT_STEP = 10;

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function useImageContextItems(targetId: string | null): RingItem[] {
  const image = useProjectStore((s) => s.project.images.find((i) => i.id === targetId));
  const projectWidth = useProjectStore((s) => s.project.width);
  const projectHeight = useProjectStore((s) => s.project.height);
  const updateImage = useProjectStore((s) => s.updateImage);
  const deleteImage = useProjectStore((s) => s.deleteImage);
  const bringToFront = useProjectStore((s) => s.bringToFront);
  const bringForward = useProjectStore((s) => s.bringForward);
  const sendBackward = useProjectStore((s) => s.sendBackward);
  const sendToBack = useProjectStore((s) => s.sendToBack);
  const closeRadialMenu = useUIStore((s) => s.closeRadialMenu);
  const setCroppingImageId = useUIStore((s) => s.setCroppingImageId);
  const setSelectedElementId = useUIStore((s) => s.setSelectedElementId);

  // Width and height are fully independent now (no forced-aspect coupling on
  // these fields) — corner-drag aspect-lock remains the separate, existing
  // mechanism for uniform scaling.
  const widthDraft = useDraftNumber(image ? Math.round(image.displayWidth) : 0, {
    min: DISPLAY_SIZE_MIN,
    max: DISPLAY_SIZE_MAX,
    onCommit: (displayWidth) => {
      if (!image) return;
      updateImage(image.id, { displayWidth });
    },
  });
  const heightDraft = useDraftNumber(image ? Math.round(image.displayHeight) : 0, {
    min: DISPLAY_SIZE_MIN,
    max: DISPLAY_SIZE_MAX,
    onCommit: (displayHeight) => {
      if (!image) return;
      updateImage(image.id, { displayHeight });
    },
  });

  const dotPitchDraft = useDraftNumber(image ? image.halftoneDotPitch : 0, {
    min: DOT_PITCH_MIN,
    max: DOT_PITCH_MAX,
    onCommit: (halftoneDotPitch) => {
      if (!image) return;
      updateImage(image.id, { halftoneDotPitch });
    },
  });

  const blendMarginDraft = useDraftNumber(image ? Math.round(image.edgeBlendMargin) : 0, {
    min: BLEND_MARGIN_MIN,
    max: BLEND_MARGIN_MAX,
    onCommit: (edgeBlendMargin) => {
      if (!image) return;
      updateImage(image.id, { edgeBlendMargin });
    },
  });

  const opacityDraft = useDraftNumber(image ? Math.round(image.opacity * 100) : 100, {
    min: OPACITY_PERCENT_MIN,
    max: OPACITY_PERCENT_MAX,
    onCommit: (percent) => {
      if (!image) return;
      updateImage(image.id, { opacity: clamp(percent / 100, 0, 1) });
    },
  });

  if (!image || !targetId) return [];
  const id = targetId;

  // Mode/intensity sub-items are always present (never conditionally added or
  // removed) so the ring's item count — and therefore every pill's angular
  // position, including the toggle itself — never shifts when the toggle is
  // flipped. They're just visually disabled while their toggle is off.
  const halftoneSubItems: RingItem[] = [
    {
      key: "halftone-toggle",
      icon: <HalftoneIcon />,
      label: image.circleMask ? "Halftone: On" : "Halftone: Off",
      status: image.circleMask ? "on" : "off",
      onClick: () => updateImage(id, { circleMask: !image.circleMask }),
    },
    {
      key: "halftone-mode",
      icon: <HalftoneIcon />,
      label: image.halftoneMode === "color" ? "Mode: Photo" : "Mode: Ink",
      disabled: !image.circleMask,
      onClick: () => updateImage(id, { halftoneMode: image.halftoneMode === "color" ? "ink" : "color" }),
    },
    {
      key: "halftone-intensity",
      icon: <HalftoneIcon />,
      label: "Dot Size",
      wide: true,
      disabled: !image.circleMask,
      expandedContent: (
        <NumberStepperField
          draft={dotPitchDraft}
          onDec={() => updateImage(id, { halftoneDotPitch: clamp(image.halftoneDotPitch - DOT_PITCH_STEP, DOT_PITCH_MIN, DOT_PITCH_MAX) })}
          onInc={() => updateImage(id, { halftoneDotPitch: clamp(image.halftoneDotPitch + DOT_PITCH_STEP, DOT_PITCH_MIN, DOT_PITCH_MAX) })}
          min={DOT_PITCH_MIN}
          max={DOT_PITCH_MAX}
          ariaLabel="Halftone dot size in pixels"
        />
      ),
    },
  ];

  const edgeBlendSubItems: RingItem[] = [
    {
      key: "edge-blend-toggle",
      icon: <EdgeGlowIcon />,
      label: image.edgeBlend ? "Edge Blend: On" : "Edge Blend: Off",
      status: image.edgeBlend ? "on" : "off",
      onClick: () => updateImage(id, { edgeBlend: !image.edgeBlend }),
    },
    {
      key: "edge-blend-size",
      icon: <EdgeGlowIcon />,
      label: "Blend Size",
      wide: true,
      disabled: !image.edgeBlend,
      expandedContent: (
        <NumberStepperField
          draft={blendMarginDraft}
          onDec={() =>
            updateImage(id, { edgeBlendMargin: clamp(image.edgeBlendMargin - BLEND_MARGIN_STEP, BLEND_MARGIN_MIN, BLEND_MARGIN_MAX) })
          }
          onInc={() =>
            updateImage(id, { edgeBlendMargin: clamp(image.edgeBlendMargin + BLEND_MARGIN_STEP, BLEND_MARGIN_MIN, BLEND_MARGIN_MAX) })
          }
          min={BLEND_MARGIN_MIN}
          max={BLEND_MARGIN_MAX}
          ariaLabel="Edge blend size in pixels"
        />
      ),
    },
  ];

  // Width and Height used to be two separate drill-down pills, each expanding
  // into its own long horizontal bar (and sharing the same generic SizeIcon as
  // Font Size elsewhere, which read ambiguously). Combined into one "Dimensions"
  // pill instead: a single square icon button that unfurls into a compact box
  // (both dimensions grow, not just width) with Width stacked above Height —
  // see IconPill's `stack` mode. No drill-down needed for a single control.
  const sizeItems: RingItem[] = [
    {
      key: "dimensions",
      icon: <DimensionsIcon />,
      label: "Dimensions",
      stack: true,
      expandedContent: (
        <>
          <span className="flex items-center gap-1">
            <span className={fieldLabelClass}>W</span>
            <NumberStepperField
              draft={widthDraft}
              onDec={() => updateImage(id, { displayWidth: clamp(image.displayWidth - RESCALE_STEP_PX, DISPLAY_SIZE_MIN, DISPLAY_SIZE_MAX) })}
              onInc={() => updateImage(id, { displayWidth: clamp(image.displayWidth + RESCALE_STEP_PX, DISPLAY_SIZE_MIN, DISPLAY_SIZE_MAX) })}
              min={DISPLAY_SIZE_MIN}
              max={DISPLAY_SIZE_MAX}
              ariaLabel="Width in pixels"
            />
          </span>
          <span className="flex items-center gap-1">
            <span className={fieldLabelClass}>H</span>
            <NumberStepperField
              draft={heightDraft}
              onDec={() => updateImage(id, { displayHeight: clamp(image.displayHeight - RESCALE_STEP_PX, DISPLAY_SIZE_MIN, DISPLAY_SIZE_MAX) })}
              onInc={() => updateImage(id, { displayHeight: clamp(image.displayHeight + RESCALE_STEP_PX, DISPLAY_SIZE_MIN, DISPLAY_SIZE_MAX) })}
              min={DISPLAY_SIZE_MIN}
              max={DISPLAY_SIZE_MAX}
              ariaLabel="Height in pixels"
            />
          </span>
        </>
      ),
    },
    {
      key: "reset-size",
      icon: <ResetIcon />,
      label: "Reset Size",
      onClick: () => {
        const maxDim = Math.min(projectWidth, projectHeight) * 0.6;
        const scale = Math.min(1, maxDim / Math.max(image.naturalWidth, image.naturalHeight));
        updateImage(id, { displayWidth: image.naturalWidth * scale, displayHeight: image.naturalHeight * scale });
      },
    },
    {
      key: "crop",
      icon: <CropIcon />,
      label: "Crop",
      onClick: () => {
        setSelectedElementId(id);
        setCroppingImageId(id);
        closeRadialMenu();
      },
    },
    {
      key: "reset-crop",
      icon: <ResetIcon />,
      label: "Reset Crop",
      disabled: image.cropZoom === 1 && image.cropOffsetX === 0 && image.cropOffsetY === 0,
      onClick: () => updateImage(id, { cropZoom: 1, cropOffsetX: 0, cropOffsetY: 0 }),
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
      key: "halftone",
      icon: <HalftoneIcon />,
      label: "Halftone",
      active: image.circleMask,
      subItems: halftoneSubItems,
    },
    {
      key: "edge-blend",
      icon: <EdgeGlowIcon />,
      label: "Edge Blend",
      active: image.edgeBlend,
      subItems: edgeBlendSubItems,
    },
    {
      key: "opacity",
      icon: <OpacityIcon />,
      label: "Opacity",
      active: image.opacity < 1,
      wide: true,
      expandedContent: (
        <NumberStepperField
          draft={opacityDraft}
          onDec={() => updateImage(id, { opacity: clamp((image.opacity * 100 - OPACITY_PERCENT_STEP) / 100, 0, 1) })}
          onInc={() => updateImage(id, { opacity: clamp((image.opacity * 100 + OPACITY_PERCENT_STEP) / 100, 0, 1) })}
          min={OPACITY_PERCENT_MIN}
          max={OPACITY_PERCENT_MAX}
          ariaLabel="Opacity percentage"
          unit="%"
        />
      ),
    },
    {
      key: "size",
      icon: <DimensionsIcon />,
      label: "Size",
      subItems: sizeItems,
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
        deleteImage(id);
        closeRadialMenu();
      },
    },
  ];

  return items;
}
