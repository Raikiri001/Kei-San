import type { ColorSuggestions } from "@/canvas/colorExtraction";
import { PlusIcon } from "@/components/RadialMenu/icons";

function Swatch({ color, onPick }: { color: string; onPick: (hex: string) => void }) {
  return (
    <button
      type="button"
      aria-label={`Apply color ${color}`}
      title={color}
      onClick={() => onPick(color)}
      className="press-scale h-6 w-6 shrink-0 border border-[rgb(var(--chrome-border)/0.25)] transition-[border-color,box-shadow] duration-150 hover:border-accent/60 hover:shadow-[0_0_10px_rgb(var(--color-accent-glow)/0.4)]"
      style={{ background: color }}
    />
  );
}

/** Same base swatch, plus a small always-visible "x" badge to remove it — used
 * only for user-saved custom swatches, never the derived suggestion swatches
 * above (which aren't stored, so there's nothing to remove). */
function RemovableSwatch({ color, onPick, onRemove }: { color: string; onPick: (hex: string) => void; onRemove: (hex: string) => void }) {
  return (
    <span className="group relative shrink-0">
      <Swatch color={color} onPick={onPick} />
      <button
        type="button"
        aria-label={`Remove saved color ${color}`}
        title="Remove"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(color);
        }}
        className="press-scale absolute -right-1 -top-1 flex h-3 w-3 items-center justify-center rounded-full bg-[rgb(var(--chrome-border))] text-[7px] leading-none opacity-0 transition-opacity duration-150 hover:bg-red-500 group-hover:opacity-100"
      >
        ×
      </button>
    </span>
  );
}

/**
 * User-saved custom swatches — a labeled row like Mono/Comp/Analog, but backed
 * by persisted state (see swatchStore.ts) instead of derived per-render from
 * an image, so it also gets a "+" button (save the current color) and a small
 * remove badge on each swatch.
 */
export function CustomSwatchRow({
  colors,
  currentColor,
  onPick,
  onAdd,
  onRemove,
}: {
  colors: string[];
  currentColor: string;
  onPick: (hex: string) => void;
  onAdd: (hex: string) => void;
  onRemove: (hex: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="w-14 shrink-0 text-[9px] uppercase tracking-wide opacity-60">Custom</span>
      <div className="flex flex-1 flex-wrap items-center gap-1.5">
        {colors.map((color) => (
          <RemovableSwatch key={color} color={color} onPick={onPick} onRemove={onRemove} />
        ))}
        <button
          type="button"
          aria-label="Save current color as a custom swatch"
          title="Save current color"
          onClick={() => onAdd(currentColor)}
          className="press-scale flex h-6 w-6 shrink-0 items-center justify-center border border-dashed border-[rgb(var(--chrome-border)/0.4)] opacity-70 hover:border-accent/60 hover:opacity-100"
        >
          <span className="flex h-3 w-3 items-center justify-center">
            <PlusIcon />
          </span>
        </button>
      </div>
    </div>
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
