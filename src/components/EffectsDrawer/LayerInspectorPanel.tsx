import { LayerSettingsFields } from "@/components/EffectsDrawer/LayerSettingsFields";
import { LayerBlendFields } from "@/components/EffectsDrawer/LayerBlendFields";
import { MaskFields } from "@/components/EffectsDrawer/MaskFields";
import { EFFECT_LABELS } from "@/components/EffectsDrawer/effectLabels";
import { CloseIcon, ResetIcon, ShuffleIcon } from "@/components/EffectsDrawer/icons";
import { InfoTooltip } from "@/components/InfoTooltip";
import { createDefaultEffectParams, hasRandomizer, randomizeEffectParams } from "@/canvas/gl/effectDefaults";
import type { EffectLayer, LayerBlend, LayerMask, MixLayer } from "@/store/types";

function InspectorSection({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="bar-card flex flex-col gap-4 rounded-2xl p-4">
      <div className="flex items-center gap-2">
        <h4 className="text-[11px] uppercase tracking-wide opacity-70">{title}</h4>
        <InfoTooltip text={hint} label={`About ${title}`} />
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
    // A fully separate docked panel (see EffectsDrawer.tsx — its own
    // independent open state, docked flush to the screen's own right edge,
    // not adjacent to the stack panel) — flush-right like the stack panel is
    // flush-left, so it drops the all-around border/radius for a single
    // left-edge hairline via .dock-panel-bar-right. Theme-adaptive
    // (.chrome-bar) like every other rail panel now — not .glass-panel.
    <div className="thin-scroll chrome-bar dock-panel-bar-right flex h-full flex-col gap-5 overflow-y-auto p-6" style={{ width }}>
      <div className="flex items-center justify-between gap-3">
        {/* The name of the effect being customized — same bold treatment as
            the stack panel's own section headings, so both panels' headers
            read as one consistent system. */}
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="h-4 w-1 shrink-0 rounded-full" style={{ background: "rgb(var(--bar-fg))" }} />
          <h3 className="truncate text-[16px] font-bold tracking-wide">{title}</h3>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {layer.kind === "effect" && hasRandomizer(layer.type) && (
            <button
              type="button"
              onClick={() => onUpdate(randomizeEffectParams(layer))}
              aria-label="Randomize settings"
              title="Randomize"
              className="bar-glow-hover press-scale flex h-8 w-8 items-center justify-center rounded-full border border-[rgb(var(--bar-border)/0.3)] opacity-70 hover:opacity-100"
            >
              <span className="flex h-3.5 w-3.5 items-center justify-center">
                <ShuffleIcon />
              </span>
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
              className="bar-glow-hover press-scale flex h-8 w-8 items-center justify-center rounded-full border border-[rgb(var(--bar-border)/0.3)] opacity-70 hover:opacity-100"
            >
              <span className="flex h-3.5 w-3.5 items-center justify-center">
                <ResetIcon />
              </span>
            </button>
          )}
          {/* Same circular close control as the stack panel's header (see
              PanelCloseButton in EffectsDrawer.tsx) for visual consistency
              between the two panels. */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="bar-glow-hover press-scale flex h-8 w-8 items-center justify-center rounded-full border border-[rgb(var(--bar-border)/0.3)] opacity-70 hover:opacity-100"
          >
            <span className="flex h-3.5 w-3.5 items-center justify-center">
              <CloseIcon />
            </span>
          </button>
        </div>
      </div>

      {layer.kind === "mix" ? (
        <div className="flex items-start gap-2">
          <p className="text-[11px] leading-relaxed opacity-60">
            Runs Branch A and Branch B as two independent effect chains, then blends the results below.
          </p>
          <InfoTooltip
            text="Both branches start from the same image, not a preset or fixed order of effects. Select an effect inside a branch (in the Active Stack) to edit it; the controls here decide how the two branches combine."
            label="About Layer Mix"
          />
        </div>
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
