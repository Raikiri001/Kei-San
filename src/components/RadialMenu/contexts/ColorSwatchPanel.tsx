import type { ColorSuggestions } from "@/canvas/colorExtraction";

function Swatch({ color, onPick }: { color: string; onPick: (hex: string) => void }) {
  return (
    <button
      type="button"
      aria-label={`Apply color ${color}`}
      onClick={() => onPick(color)}
      className="h-5 w-5 shrink-0 rounded-full border border-white/25"
      style={{ background: color }}
    />
  );
}

/** Shared swatch layout for the "Colors" pill, used by both ImageContextMenu (-> background) and TextContextMenu (-> text color). */
export function ColorSwatchPanel({
  suggestions,
  onPick,
}: {
  suggestions: ColorSuggestions;
  onPick: (hex: string) => void;
}) {
  return (
    <span className="flex items-center gap-2.5 pr-1">
      <span className="flex items-center gap-1">
        {suggestions.monochromatic.map((color) => (
          <Swatch key={color} color={color} onPick={onPick} />
        ))}
      </span>
      <span className="flex items-center gap-1">
        <Swatch color={suggestions.complementary} onPick={onPick} />
      </span>
      <span className="flex items-center gap-1">
        {suggestions.analogous.map((color) => (
          <Swatch key={color} color={color} onPick={onPick} />
        ))}
      </span>
    </span>
  );
}
