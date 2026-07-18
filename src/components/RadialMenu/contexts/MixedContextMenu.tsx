import { useProjectStore } from "@/store/projectStore";
import { useUIStore } from "@/store/uiStore";
import {
  BringForwardIcon,
  BringToFrontIcon,
  DeleteIcon,
  LayersIcon,
  LockIcon,
  SendBackwardIcon,
  SendToBackIcon,
  UnlockIcon,
} from "@/components/RadialMenu/icons";
import type { RingItem } from "@/components/RadialMenu/RadialMenu";

/**
 * Radial menu content for a selection spanning both images and text — only
 * the tools genuinely shared between the two element kinds (arrange/layer
 * order, lock, delete). Halftone, font, and every other kind-specific
 * control lives only in the image/text menus, never here.
 */
export function useMixedContextItems(targetIds: string[]): RingItem[] {
  // Select the raw (referentially stable) arrays, then filter in plain
  // render-body code — filtering *inside* a zustand selector would return a
  // new array every call, tripping React's "getSnapshot should be cached"
  // infinite-update-loop guard.
  const allImages = useProjectStore((s) => s.project.images);
  const allTexts = useProjectStore((s) => s.project.texts);
  const images = allImages.filter((i) => targetIds.includes(i.id));
  const texts = allTexts.filter((t) => targetIds.includes(t.id));
  const updateManyImages = useProjectStore((s) => s.updateManyImages);
  const updateManyTexts = useProjectStore((s) => s.updateManyTexts);
  const deleteMany = useProjectStore((s) => s.deleteMany);
  const bringToFrontMany = useProjectStore((s) => s.bringToFrontMany);
  const bringForwardMany = useProjectStore((s) => s.bringForwardMany);
  const sendBackwardMany = useProjectStore((s) => s.sendBackwardMany);
  const sendToBackMany = useProjectStore((s) => s.sendToBackMany);
  const closeRadialMenu = useUIStore((s) => s.closeRadialMenu);

  if (images.length === 0 || texts.length === 0) return [];

  const imageIds = images.map((i) => i.id);
  const textIds = texts.map((t) => t.id);
  const allIds = [...imageIds, ...textIds];
  // Anchor element (first image) sources the displayed lock state, same
  // "anchor element" convention the same-kind menus use for multi-edit.
  const locked = images[0].locked;

  const layerSubItems: RingItem[] = [
    { key: "bring-to-front", icon: <BringToFrontIcon />, label: "Bring to Front", onClick: () => bringToFrontMany(allIds) },
    { key: "bring-forward", icon: <BringForwardIcon />, label: "Bring Forward", onClick: () => bringForwardMany(allIds) },
    { key: "send-backward", icon: <SendBackwardIcon />, label: "Send Backward", onClick: () => sendBackwardMany(allIds) },
    { key: "send-to-back", icon: <SendToBackIcon />, label: "Send to Back", onClick: () => sendToBackMany(allIds) },
    {
      key: "lock-toggle",
      icon: locked ? <LockIcon /> : <UnlockIcon />,
      label: locked ? "Lock: On" : "Lock: Off",
      status: locked ? "on" : "off",
      onClick: () => {
        updateManyImages(imageIds, { locked: !locked });
        updateManyTexts(textIds, { locked: !locked });
      },
    },
  ];

  return [
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
      disabled: locked,
      onClick: () => {
        deleteMany(allIds);
        closeRadialMenu();
      },
    },
  ];
}
