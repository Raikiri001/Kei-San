import type { ColorSuggestions } from "@/canvas/colorExtraction";
import { ColorSwatchPanel } from "@/components/RadialMenu/contexts/ColorSwatchPanel";
import { ColorWheelPicker } from "@/components/RadialMenu/contexts/ColorWheelPicker";

interface ColorPickerPanelProps {
  /** Grouped suggestion swatches — omitted entirely (no section rendered) for the canvas background picker. */
  suggestions: ColorSuggestions | null;
  value: string;
  onChange: (hex: string) => void;
}

/** Full color-picking panel: labeled suggestion swatches (if any) + a custom hue/saturation wheel + hex/RGB fields. */
export function ColorPickerPanel({ suggestions, value, onChange }: ColorPickerPanelProps) {
  return (
    <div className="flex w-64 flex-col gap-3 p-1">
      {suggestions && (
        <>
          <ColorSwatchPanel suggestions={suggestions} onPick={onChange} />
          <div className="h-px bg-white/10" />
        </>
      )}
      <ColorWheelPicker value={value} onChange={onChange} />
    </div>
  );
}
