import { useProjectStore } from "@/store/projectStore";
import { PaletteIcon } from "@/components/RadialMenu/icons";
import { ColorPickerPanel } from "@/components/RadialMenu/contexts/ColorPickerPanel";
import type { RingItem } from "@/components/RadialMenu/RadialMenu";

export function useCanvasContextItems(): RingItem[] {
  const backgroundColor = useProjectStore((s) => s.project.backgroundColor);
  const setBackgroundColor = useProjectStore((s) => s.setBackgroundColor);

  return [
    {
      key: "background",
      icon: <PaletteIcon />,
      label: "Background",
      popoverContent: <ColorPickerPanel suggestions={null} value={backgroundColor} onChange={setBackgroundColor} />,
    },
  ];
}
