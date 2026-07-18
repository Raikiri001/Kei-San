import { useSwatchStore } from "@/store/swatchStore";
import { ColorSwatchPanel, CustomSwatchRow, type SuggestionGroup } from "@/components/RadialMenu/contexts/ColorSwatchPanel";
import { ColorBoardPicker } from "@/components/RadialMenu/contexts/ColorBoardPicker";

interface ColorPickerPanelProps {
  /** Grouped suggestion swatches — empty array renders no swatch section (e.g. a
   * background picker before any image has cached suggestions yet). */
  suggestionGroups: SuggestionGroup[];
  value: string;
  /** Alpha (0-1) of `value`, edited via the picker's own alpha bar — omit for a
   * color with no meaningful transparency of its own (e.g. a glow tint). */
  alpha?: number;
  onChange: (hex: string) => void;
  onAlphaChange?: (alpha: number) => void;
}

/** Full color-picking panel: labeled suggestion swatches (if any) + saved
 * custom swatches + a saturation/value board with hue and alpha bars + hex/RGB
 * fields + an eyedropper. */
export function ColorPickerPanel({ suggestionGroups, value, alpha, onChange, onAlphaChange }: ColorPickerPanelProps) {
  const swatches = useSwatchStore((s) => s.swatches);
  const addSwatch = useSwatchStore((s) => s.addSwatch);
  const removeSwatch = useSwatchStore((s) => s.removeSwatch);

  return (
    <div className="flex w-64 flex-col gap-3 p-1">
      {suggestionGroups.length > 0 && (
        <>
          <ColorSwatchPanel groups={suggestionGroups} onPick={onChange} />
          <div className="h-px bg-[rgb(var(--chrome-border)/0.16)]" />
        </>
      )}
      <CustomSwatchRow colors={swatches} currentColor={value} onPick={onChange} onAdd={addSwatch} onRemove={removeSwatch} />
      <div className="h-px bg-[rgb(var(--chrome-border)/0.16)]" />
      <ColorBoardPicker value={value} alpha={alpha} onChange={onChange} onAlphaChange={onAlphaChange} />
    </div>
  );
}
