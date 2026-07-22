import { createId } from "@/utils/id";
import { createDefaultBlend, createDefaultMask } from "@/canvas/gl/effectDefaults";
import type { EffectLayer, PresetGroupLayer } from "@/store/types";
import type { ImageEffectPreset } from "@/presets/types";

/** Builds a fresh, independently-editable group layer from a preset — every
 * application gets its own group id and its own cloned children (each with a fresh
 * id and fresh default blend/mask of their own), so adding the same preset twice
 * produces two fully independent instances, exactly like adding it once. */
export function instantiatePresetGroup(preset: ImageEffectPreset): PresetGroupLayer {
  const children: EffectLayer[] = preset.entries.map((entry) => ({
    kind: "effect",
    id: createId(),
    blend: createDefaultBlend(),
    mask: createDefaultMask(),
    ...entry,
  }));
  return { kind: "group", id: createId(), presetId: preset.id, name: preset.name, enabled: true, expanded: true, children };
}

/** For a PresetCard's own live thumbnail — the preset's enabled children only, no
 * group wrapper (the GL renderer just wants a flat ordered list). */
export function previewPresetChildren(preset: ImageEffectPreset): EffectLayer[] {
  return preset.entries
    .filter((entry) => entry.enabled)
    .map((entry) => ({ kind: "effect", id: createId(), blend: createDefaultBlend(), mask: createDefaultMask(), ...entry }));
}
