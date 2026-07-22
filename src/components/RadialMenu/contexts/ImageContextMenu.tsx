import { useProjectStore } from "@/store/projectStore";
import { useUIStore } from "@/store/uiStore";
import { useDraftNumber } from "@/hooks/useDraftNumber";
import { flattenEnabledEffectLayers } from "@/store/imageEffects";
import { NumberStepperField } from "@/components/RadialMenu/NumberStepperField";
import { fieldLabelClass } from "@/components/RadialMenu/inputStyles";
import { DISPLAY_SIZE_MAX, DISPLAY_SIZE_MIN, RESCALE_STEP_PX } from "@/constants/defaults";
import {
  BringForwardIcon,
  BringToFrontIcon,
  CropIcon,
  DeleteIcon,
  DimensionsIcon,
  ImageEffectsIcon,
  LayersIcon,
  LockIcon,
  OpacityIcon,
  ResetIcon,
  SendBackwardIcon,
  SendToBackIcon,
  UnlockIcon,
} from "@/components/RadialMenu/icons";
import type { RingItem } from "@/components/RadialMenu/RadialMenu";

const OPACITY_PERCENT_MIN = 0;
const OPACITY_PERCENT_MAX = 100;
const OPACITY_PERCENT_STEP = 10;

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function useImageContextItems(targetIds: string[]): RingItem[] {
  // Select the raw (referentially stable) array from the store, then filter
  // in plain render-body code — filtering *inside* a zustand selector would
  // return a new array every call, which trips React's "getSnapshot should be
  // cached" infinite-update-loop guard.
  const allImages = useProjectStore((s) => s.project.images);
  const images = allImages.filter((i) => targetIds.includes(i.id));
  const projectWidth = useProjectStore((s) => s.project.width);
  const projectHeight = useProjectStore((s) => s.project.height);
  const updateManyImages = useProjectStore((s) => s.updateManyImages);
  const deleteMany = useProjectStore((s) => s.deleteMany);
  const bringToFrontMany = useProjectStore((s) => s.bringToFrontMany);
  const bringForwardMany = useProjectStore((s) => s.bringForwardMany);
  const sendBackwardMany = useProjectStore((s) => s.sendBackwardMany);
  const sendToBackMany = useProjectStore((s) => s.sendToBackMany);
  const closeRadialMenu = useUIStore((s) => s.closeRadialMenu);
  const openEffectsDrawer = useUIStore((s) => s.openEffectsDrawer);
  const setCroppingImageId = useUIStore((s) => s.setCroppingImageId);
  const setSelectedElementId = useUIStore((s) => s.setSelectedElementId);
  const aspectLocked = useUIStore((s) => s.aspectLocked);
  const toggleAspectLocked = useUIStore((s) => s.toggleAspectLocked);

  // Displayed values (opacity %, current dimensions, halftone on/off, etc.)
  // read from the first selected image — the standard "anchor element"
  // convention for multi-edit; every mutation below applies to the whole
  // `ids` set via updateManyImages, not just the anchor.
  const image = images[0];
  const ids = targetIds;

  // Width and height are fully independent now (no forced-aspect coupling on
  // these fields) — corner-drag aspect-lock remains the separate, existing
  // mechanism for uniform scaling.
  const widthDraft = useDraftNumber(image ? Math.round(image.displayWidth) : 0, {
    min: DISPLAY_SIZE_MIN,
    max: DISPLAY_SIZE_MAX,
    onCommit: (displayWidth) => updateManyImages(ids, { displayWidth }),
  });
  const heightDraft = useDraftNumber(image ? Math.round(image.displayHeight) : 0, {
    min: DISPLAY_SIZE_MIN,
    max: DISPLAY_SIZE_MAX,
    onCommit: (displayHeight) => updateManyImages(ids, { displayHeight }),
  });

  const opacityDraft = useDraftNumber(image ? Math.round(image.opacity * 100) : 100, {
    min: OPACITY_PERCENT_MIN,
    max: OPACITY_PERCENT_MAX,
    onCommit: (percent) => updateManyImages(ids, { opacity: clamp(percent / 100, 0, 1) }),
  });

  if (!image) return [];
  const id = image.id;

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
              onDec={() => updateManyImages(ids, { displayWidth: clamp(image.displayWidth - RESCALE_STEP_PX, DISPLAY_SIZE_MIN, DISPLAY_SIZE_MAX) })}
              onInc={() => updateManyImages(ids, { displayWidth: clamp(image.displayWidth + RESCALE_STEP_PX, DISPLAY_SIZE_MIN, DISPLAY_SIZE_MAX) })}
              min={DISPLAY_SIZE_MIN}
              max={DISPLAY_SIZE_MAX}
              ariaLabel="Width in pixels"
            />
          </span>
          <span className="flex items-center gap-1">
            <span className={fieldLabelClass}>H</span>
            <NumberStepperField
              draft={heightDraft}
              onDec={() => updateManyImages(ids, { displayHeight: clamp(image.displayHeight - RESCALE_STEP_PX, DISPLAY_SIZE_MIN, DISPLAY_SIZE_MAX) })}
              onInc={() => updateManyImages(ids, { displayHeight: clamp(image.displayHeight + RESCALE_STEP_PX, DISPLAY_SIZE_MIN, DISPLAY_SIZE_MAX) })}
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
      disabled: image.locked,
      onClick: () => {
        const maxDim = Math.min(projectWidth, projectHeight) * 0.6;
        const scale = Math.min(1, maxDim / Math.max(image.naturalWidth, image.naturalHeight));
        updateManyImages(ids, { displayWidth: image.naturalWidth * scale, displayHeight: image.naturalHeight * scale });
      },
    },
    {
      key: "uniform-scale-toggle",
      icon: aspectLocked ? <LockIcon /> : <UnlockIcon />,
      label: aspectLocked ? "Uniform Scale: On" : "Uniform Scale: Off",
      status: aspectLocked ? "on" : "off",
      onClick: toggleAspectLocked,
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
      onClick: () => updateManyImages(ids, { cropZoom: 1, cropOffsetX: 0, cropOffsetY: 0 }),
    },
  ];

  const layerSubItems: RingItem[] = [
    { key: "bring-to-front", icon: <BringToFrontIcon />, label: "Bring to Front", onClick: () => bringToFrontMany(ids) },
    { key: "bring-forward", icon: <BringForwardIcon />, label: "Bring Forward", onClick: () => bringForwardMany(ids) },
    { key: "send-backward", icon: <SendBackwardIcon />, label: "Send Backward", onClick: () => sendBackwardMany(ids) },
    { key: "send-to-back", icon: <SendToBackIcon />, label: "Send to Back", onClick: () => sendToBackMany(ids) },
    {
      key: "lock-toggle",
      icon: image.locked ? <LockIcon /> : <UnlockIcon />,
      label: image.locked ? "Lock: On" : "Lock: Off",
      status: image.locked ? "on" : "off",
      onClick: () => updateManyImages(ids, { locked: !image.locked }),
    },
  ];

  const items: RingItem[] = [
    {
      key: "image-effects",
      icon: <ImageEffectsIcon />,
      label: "Image Effects",
      active: flattenEnabledEffectLayers(image.layers).length > 0,
      onClick: () => {
        openEffectsDrawer(ids);
        closeRadialMenu();
      },
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
          onDec={() => updateManyImages(ids, { opacity: clamp((image.opacity * 100 - OPACITY_PERCENT_STEP) / 100, 0, 1) })}
          onInc={() => updateManyImages(ids, { opacity: clamp((image.opacity * 100 + OPACITY_PERCENT_STEP) / 100, 0, 1) })}
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
      disabled: image.locked,
      onClick: () => {
        deleteMany(ids);
        closeRadialMenu();
      },
    },
  ];

  return items;
}
