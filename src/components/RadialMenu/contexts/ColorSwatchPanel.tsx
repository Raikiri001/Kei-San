import type { ColorSuggestions } from "@/canvas/colorExtraction";

function Swatch({ color, onPick }: { color: string; onPick: (hex: string) => void }) {
  return (
    <button
      type="button"
      aria-label={`Apply color ${color}`}
      title={color}
      onClick={() => onPick(color)}
      className="h-6 w-6 shrink-0 border border-[rgb(var(--chrome-border)/0.25)]"
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

export interface SuggestionGroup {
  /** e.g. "Img 1" — an uploaded image's own suggestions, or a plain label for a
   * single-source caller (text's own source image). */
  label: string;
  suggestions: ColorSuggestions;
}

/**
 * Grouped, labeled suggestion swatches — used inside ColorPickerPanel for the
 * canvas background (one group per uploaded image) and for text/image "Colors"
 * (a single group). A per-image header is only rendered when there's more than
 * one group, so the common single-source case looks exactly as before.
 */
export function ColorSwatchPanel({
  groups,
  onPick,
}: {
  groups: SuggestionGroup[];
  onPick: (hex: string) => void;
}) {
  const showHeaders = groups.length > 1;
  return (
    <div className="flex flex-col gap-3">
      {groups.map((group, idx) => (
        <div key={group.label + idx} className="flex flex-col gap-2">
          {showHeaders && (
            <span className="text-[9px] font-semibold uppercase tracking-wide opacity-70" style={{ color: "var(--color-accent)" }}>
              {group.label}
            </span>
          )}
          <SwatchGroup label="Mono" colors={group.suggestions.monochromatic} onPick={onPick} />
          <SwatchGroup label="Comp" colors={[group.suggestions.complementary]} onPick={onPick} />
          <SwatchGroup label="Analog" colors={group.suggestions.analogous} onPick={onPick} />
        </div>
      ))}
    </div>
  );
}
