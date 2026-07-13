import type { ColorSuggestions } from "@/canvas/colorExtraction";

function Swatch({ color, onPick }: { color: string; onPick: (hex: string) => void }) {
  return (
    <button
      type="button"
      aria-label={`Apply color ${color}`}
      title={color}
      onClick={() => onPick(color)}
      className="h-6 w-6 shrink-0 rounded-full border border-white/25"
      style={{ background: color }}
    />
  );
}

function SwatchGroup({
  label,
  colors,
  onPick,
}: {
  label: string;
  colors: string[];
  onPick: (hex: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="w-14 shrink-0 text-[9px] uppercase tracking-wide opacity-60">{label}</span>
      <div className="flex flex-1 items-center gap-1.5">
        {colors.map((color) => (
          <Swatch key={color} color={color} onPick={onPick} />
        ))}
      </div>
    </div>
  );
}

/** Grouped, labeled suggestion swatches — used inside ColorPickerPanel for both image/text "Colors". */
export function ColorSwatchPanel({
  suggestions,
  onPick,
}: {
  suggestions: ColorSuggestions;
  onPick: (hex: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <SwatchGroup label="Mono" colors={suggestions.monochromatic} onPick={onPick} />
      <SwatchGroup label="Comp" colors={[suggestions.complementary]} onPick={onPick} />
      <SwatchGroup label="Analog" colors={suggestions.analogous} onPick={onPick} />
    </div>
  );
}
