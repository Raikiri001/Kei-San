import { SliderField } from "@/components/EffectsDrawer/SliderField";
import type { BlendMode, LayerBlend } from "@/store/types";

const BLEND_MODE_OPTIONS: { value: BlendMode; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "lighten", label: "Lighten" },
  { value: "darken", label: "Darken" },
  { value: "multiply", label: "Multiply" },
  { value: "screen", label: "Screen" },
  { value: "overlay", label: "Overlay" },
  { value: "add", label: "Add" },
  { value: "subtract", label: "Subtract" },
  { value: "difference", label: "Difference" },
  { value: "exclusion", label: "Exclusion" },
];

/** The universal blend-mode + opacity controls every layer carries regardless of
 * effect type — how this layer's own transformed output recomposites over whatever
 * came before it (see LayerBlend's doc comment in store/types.ts). "Normal" + opacity
 * 1 (the default) is a plain replace, same as every effect looked before this existed. */
export function LayerBlendFields({ blend, onUpdate }: { blend: LayerBlend; onUpdate: (patch: Partial<LayerBlend>) => void }) {
  return (
    <div className="flex items-center gap-3">
      <label className="flex items-center gap-2 text-[11px] uppercase tracking-wide opacity-70">
        <span>Blend</span>
        <select
          value={blend.blendMode}
          onChange={(e) => onUpdate({ blendMode: e.target.value as BlendMode })}
          className="rounded border border-[rgb(var(--chrome-border)/0.3)] bg-transparent px-1.5 py-1 text-[11px] uppercase tracking-wide"
        >
          {BLEND_MODE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-black text-white">
              {opt.label}
            </option>
          ))}
        </select>
      </label>
      <div className="flex-1">
        <SliderField label="Opacity" value={blend.opacity} min={0} max={1} step={0.01} decimals={2} onChange={(opacity) => onUpdate({ opacity })} />
      </div>
    </div>
  );
}
