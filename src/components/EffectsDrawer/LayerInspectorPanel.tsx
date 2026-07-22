import { LayerSettingsFields } from "@/components/EffectsDrawer/LayerSettingsFields";
import { LayerBlendFields } from "@/components/EffectsDrawer/LayerBlendFields";
import { MaskFields } from "@/components/EffectsDrawer/MaskFields";
import { EFFECT_LABELS } from "@/components/EffectsDrawer/effectLabels";
import { ResetIcon, ShuffleIcon } from "@/components/EffectsDrawer/icons";
import { createDefaultEffectParams, hasRandomizer, randomizeEffectParams } from "@/canvas/gl/effectDefaults";
import type { EffectLayer, LayerBlend, LayerMask, MixLayer } from "@/store/types";

function InspectorSection({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="glass-panel flex flex-col gap-3 p-3">
      <div>
        <h4 className="text-[11px] uppercase tracking-wide opacity-70">{title}</h4>
        <p className="mt-0.5 text-[10px] opacity-45">{hint}</p>
      </div>
      {children}
    </div>
  );
}

interface LayerInspectorPanelProps {
  layer: EffectLayer | MixLayer;
  width: number;
  loadedImg: HTMLImageElement | null;
  onClose: () => void;
  onUpdate: (patch: Record<string, unknown>) => void;
}

/**
 * The slide-in "Properties panel" (Photoshop's own term for exactly this: a
 * secondary panel that shows one selected layer's settings, kept separate from the
 * Layers panel itself) — only rendered while a layer is selected via a row's own
 * onSelect in LayerStackList.tsx. Every effect's own knobs (LayerSettingsFields)
 * plus the two things every layer has regardless of type — how it blends
 * (`LayerBlendFields`) and where it applies (`MaskFields`) — each get their own
 * clearly labeled, explained section instead of being unlabeled inline controls.
 */
export function LayerInspectorPanel({ layer, width, loadedImg, onClose, onUpdate }: LayerInspectorPanelProps) {
  const title = layer.kind === "mix" ? "Layer Mix" : EFFECT_LABELS[layer.type];

  return (
    <div className="thin-scroll glass-panel corner-frame flex h-full flex-col gap-4 overflow-y-auto border-r border-[rgb(var(--chrome-border)/0.2)] p-4" style={{ width }}>
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] uppercase tracking-wide">{title}</h3>
        <div className="flex items-center gap-1.5">
          {layer.kind === "effect" && hasRandomizer(layer.type) && (
            <button
              type="button"
              onClick={() => onUpdate(randomizeEffectParams(layer))}
              aria-label="Randomize settings"
              title="Randomize"
              className="press-scale flex h-7 w-7 items-center justify-center rounded border border-[rgb(var(--chrome-border)/0.3)] opacity-70 hover:opacity-100"
            >
              <ShuffleIcon />
            </button>
          )}
          {layer.kind === "effect" && (
            <button
              type="button"
              onClick={() => {
                const defaults: Record<string, unknown> = { ...createDefaultEffectParams(layer.type) };
                delete defaults.type;
                delete defaults.enabled;
                onUpdate(defaults);
              }}
              aria-label="Reset to defaults"
              title="Reset to defaults"
              className="press-scale flex h-7 w-7 items-center justify-center rounded border border-[rgb(var(--chrome-border)/0.3)] opacity-70 hover:opacity-100"
            >
              <ResetIcon />
            </button>
          )}
          <button type="button" onClick={onClose} aria-label="Close settings" className="press-scale flex h-7 w-7 items-center justify-center rounded border border-[rgb(var(--chrome-border)/0.3)] text-[13px]">
            ×
          </button>
        </div>
      </div>

      {layer.kind === "mix" ? (
        <p className="text-[11px] leading-relaxed opacity-60">
          Layer Mix runs Branch A and Branch B as two independent effect chains, both starting from the same image, then blends their two results together below —
          not a preset, and not a fixed order of effects. Select an effect inside a branch (in the Active Stack) to edit it; the controls here decide how the two
          branches combine.
        </p>
      ) : (
        <InspectorSection title="Settings" hint="This effect's own adjustable parameters.">
          <LayerSettingsFields layer={layer} loadedImg={loadedImg} onUpdate={onUpdate} />
        </InspectorSection>
      )}

      <InspectorSection title="Blending" hint="How this layer's result combines with everything below it in the stack.">
        <LayerBlendFields blend={layer.blend} onUpdate={(patch: Partial<LayerBlend>) => onUpdate({ blend: { ...layer.blend, ...patch } })} />
      </InspectorSection>

      <InspectorSection title="Mask" hint="Restrict this layer to a soft-edged region instead of the whole image.">
        <MaskFields
          mask={layer.mask}
          loadedImg={loadedImg}
          previewLayers={layer.kind === "effect" ? [layer] : []}
          onUpdate={(patch: Partial<LayerMask>) => onUpdate({ mask: { ...layer.mask, ...patch } })}
        />
      </InspectorSection>
    </div>
  );
}
