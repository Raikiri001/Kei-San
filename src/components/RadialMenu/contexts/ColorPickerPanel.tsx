import { ColorSwatchPanel, type SuggestionGroup } from "@/components/RadialMenu/contexts/ColorSwatchPanel";
import { ColorWheelPicker } from "@/components/RadialMenu/contexts/ColorWheelPicker";

interface ColorPickerPanelProps {
  /** Grouped suggestion swatches — empty array renders no swatch section (e.g. a
   * background picker before any image has cached suggestions yet). */
  suggestionGroups: SuggestionGroup[];
  value: string;
  onChange: (hex: string) => void;
}

/** Full color-picking panel: labeled suggestion swatches (if any) + a custom hue/saturation wheel + hex/RGB fields. */
export function ColorPickerPanel({ suggestionGroups, value, onChange }: ColorPickerPanelProps) {
  return (
    <div className="flex w-64 flex-col gap-3 p-1">
      {suggestionGroups.length > 0 && (
        <>
          <ColorSwatchPanel groups={suggestionGroups} onPick={onChange} />
          <div className="h-px bg-[rgb(var(--chrome-border)/0.16)]" />
        </>
      )}
      <ColorWheelPicker value={value} onChange={onChange} />
    </div>
  );
}
