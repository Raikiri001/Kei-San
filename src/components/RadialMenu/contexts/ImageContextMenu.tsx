import { useProjectStore } from "@/store/projectStore";
import { useUIStore } from "@/store/uiStore";
import { useDraftNumber } from "@/hooks/useDraftNumber";
import { numberInputClass } from "@/components/RadialMenu/inputStyles";
import {
  BringForwardIcon,
  BringToFrontIcon,
  DeleteIcon,
  EdgeGlowIcon,
  HalftoneIcon,
  LayersIcon,
  SendBackwardIcon,
  SendToBackIcon,
  SizeIcon,
} from "@/components/RadialMenu/icons";
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
  const updateImage = useProjectStore((s) => s.updateImage);
  const deleteImage = useProjectStore((s) => s.deleteImage);
  const bringToFront = useProjectStore((s) => s.bringToFront);
  const bringForward = useProjectStore((s) => s.bringForward);
  const sendBackward = useProjectStore((s) => s.sendBackward);
  const sendToBack = useProjectStore((s) => s.sendToBack);
  const closeRadialMenu = useUIStore((s) => s.closeRadialMenu);

  const sizeDraft = useDraftNumber(image ? Math.round(image.displayWidth) : 0, {
    min: DISPLAY_SIZE_MIN,
    max: DISPLAY_SIZE_MAX,
    onCommit: (displayWidth) => {
      if (!image) return;
      const scale = displayWidth / image.displayWidth;
      updateImage(image.id, {
        displayWidth,
        displayHeight: clamp(image.displayHeight * scale, DISPLAY_SIZE_MIN, DISPLAY_SIZE_MAX),
      });
    },
  });

  if (!image || !targetId) return [];
  const id = targetId;

  const halftoneSubItems: RingItem[] = [
    {
      key: "halftone-toggle",
      icon: <HalftoneIcon />,
      label: image.circleMask ? "Halftone: On" : "Halftone: Off",
      active: image.circleMask,
      onClick: () => updateImage(id, { circleMask: !image.circleMask }),
    },
  ];

  if (image.circleMask) {
    halftoneSubItems.push({
      key: "halftone-mode",
      icon: <HalftoneIcon />,
      label: image.halftoneMode === "color" ? "Mode: Photo" : "Mode: Ink",
      onClick: () => updateImage(id, { halftoneMode: image.halftoneMode === "color" ? "ink" : "color" }),
    });
    halftoneSubItems.push({
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

  const edgeBlendSubItems: RingItem[] = [
    {
      key: "edge-blend-toggle",
      icon: <EdgeGlowIcon />,
      label: image.edgeBlend ? "Edge Blend: On" : "Edge Blend: Off",
      active: image.edgeBlend,
      onClick: () => updateImage(id, { edgeBlend: !image.edgeBlend }),
    },
  ];

  if (image.edgeBlend) {
    edgeBlendSubItems.push({
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
      key: "size",
      icon: <SizeIcon />,
      label: `Size: ${Math.round(image.displayWidth)}px`,
      wide: true,
      expandedContent: (
        <span className="flex items-center gap-1.5">
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
          <input
            type="number"
            min={DISPLAY_SIZE_MIN}
            max={DISPLAY_SIZE_MAX}
            value={sizeDraft.draft}
            onChange={sizeDraft.onChange}
            onFocus={sizeDraft.onFocus}
            onBlur={sizeDraft.onBlur}
            onKeyDown={sizeDraft.onKeyDown}
            className={numberInputClass}
            aria-label="Width in pixels"
          />
        </span>
      ),
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
