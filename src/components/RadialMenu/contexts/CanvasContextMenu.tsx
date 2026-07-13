import { useProjectStore } from "@/store/projectStore";
import { PaletteIcon } from "@/components/RadialMenu/icons";
import type { RingItem } from "@/components/RadialMenu/RadialMenu";

const PRESET_SWATCHES = ["#121212", "#0b1220", "#1a1024", "#f5f2ea", "#0e2a2c"];

export function useCanvasContextItems(): RingItem[] {
  const backgroundColor = useProjectStore((s) => s.project.backgroundColor);
  const setBackgroundColor = useProjectStore((s) => s.setBackgroundColor);

  return [
    {
      key: "background",
      icon: <PaletteIcon />,
      label: "Background",
      expandedContent: (
        <span className="flex items-center gap-1.5 pr-1">
          {PRESET_SWATCHES.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={`Set background ${color}`}
              onClick={() => setBackgroundColor(color)}
              className="h-5 w-5 rounded-full border border-white/25"
              style={{ background: color }}
            />
          ))}
          <input
            type="color"
            value={backgroundColor}
            onChange={(e) => setBackgroundColor(e.target.value)}
            className="h-5 w-6 cursor-pointer border-0 bg-transparent p-0"
          />
        </span>
      ),
    },
  ];
}
