import type { ContentLayer, EffectLayer, Layer, MixLayer, PresetGroupLayer } from "@/store/types";

/** Applies `fn` to the effect layer matching `layerId` — whether it's a top-level
 * layer, a child inside a preset group, or a child inside either of a Layer Mix's two
 * branches — callers don't need to know which. */
export function mapEffectLayer(layers: Layer[], layerId: string, fn: (layer: EffectLayer) => EffectLayer): Layer[] {
  return layers.map((layer) => {
    if (layer.kind === "effect") return layer.id === layerId ? fn(layer) : layer;
    if (layer.kind === "group") return { ...layer, children: layer.children.map((child) => (child.id === layerId ? fn(child) : child)) };
    return {
      ...layer,
      branchA: layer.branchA.map((child) => (child.id === layerId ? fn(child) : child)),
      branchB: layer.branchB.map((child) => (child.id === layerId ? fn(child) : child)),
    };
  });
}

/** Applies `fn` to the top-level preset group matching `groupId` — groups themselves
 * are never nested, so unlike mapEffectLayer this only ever looks one level deep. */
export function mapGroupLayer(layers: Layer[], groupId: string, fn: (group: PresetGroupLayer) => PresetGroupLayer): Layer[] {
  return layers.map((layer) => (layer.kind === "group" && layer.id === groupId ? fn(layer) : layer));
}

/** Applies `fn` to the top-level Layer Mix matching `mixId` — same "one level deep"
 * shape as mapGroupLayer, for the mix node's own enabled/expanded/blend/mask fields
 * (not its branch children — see mapEffectLayer/addToBranch/setBranchOrder for those). */
export function mapMixLayer(layers: Layer[], mixId: string, fn: (mix: MixLayer) => MixLayer): Layer[] {
  return layers.map((layer) => (layer.kind === "mix" && layer.id === mixId ? fn(layer) : layer));
}

/** Appends a fresh effect layer to one branch of a top-level Layer Mix. */
export function addToBranch(layers: Layer[], mixId: string, branch: "a" | "b", newLayer: EffectLayer): Layer[] {
  return layers.map((layer) => {
    if (layer.kind !== "mix" || layer.id !== mixId) return layer;
    return branch === "a" ? { ...layer, branchA: [...layer.branchA, newLayer] } : { ...layer, branchB: [...layer.branchB, newLayer] };
  });
}

/** Applies a drag-reordered branch (as shown in a MixLayerRow's own two mini stacks). */
export function setBranchOrder(layers: Layer[], mixId: string, branch: "a" | "b", newOrder: string[]): Layer[] {
  return layers.map((layer) => {
    if (layer.kind !== "mix" || layer.id !== mixId) return layer;
    const source = branch === "a" ? layer.branchA : layer.branchB;
    const byId = new Map(source.map((l) => [l.id, l]));
    const reordered = newOrder.map((id) => byId.get(id)).filter((l): l is EffectLayer => !!l);
    return branch === "a" ? { ...layer, branchA: reordered } : { ...layer, branchB: reordered };
  });
}

/** Removes a layer by id — whether it's a top-level layer/group/mix, a child nested
 * inside a group, or a child nested inside either of a Layer Mix's two branches. */
export function removeLayerById(layers: Layer[], layerId: string): Layer[] {
  return layers
    .filter((layer) => layer.id !== layerId)
    .map((layer) => {
      if (layer.kind === "group") return { ...layer, children: layer.children.filter((child) => child.id !== layerId) };
      if (layer.kind === "mix") {
        return { ...layer, branchA: layer.branchA.filter((c) => c.id !== layerId), branchB: layer.branchB.filter((c) => c.id !== layerId) };
      }
      return layer;
    });
}

/** Flattens the layer stack into the ordered list of every currently-enabled
 * top-level entry ready for the content pipeline: enabled effect layers, enabled
 * children of enabled groups (a group's own toggle acts as a master switch over all
 * its children), and enabled Layer Mix nodes themselves (kept intact, not flattened —
 * see ContentLayer's doc comment; a mix node's own branches are rendered recursively
 * by glRenderer.ts, not flattened into this list) — in stack order. */
export function flattenEnabledEffectLayers(layers: Layer[]): ContentLayer[] {
  const result: ContentLayer[] = [];
  for (const layer of layers) {
    if (layer.kind === "effect" || layer.kind === "mix") {
      if (layer.enabled) result.push(layer);
    } else if (layer.enabled) {
      for (const child of layer.children) if (child.enabled) result.push(child);
    }
  }
  return result;
}

/** The enabled-layers subset that goes through the shared GPU content pipeline —
 * everything except Edge Blend (its own separate pre-pass, see EdgeBlendEffect's doc
 * comment), ASCII Art (its own separate post-process, see AsciiEffect's doc comment
 * in store/types.ts — it needs real glyph rendering, which no fragment shader can do),
 * and Blob Tracker (a decorative generative overlay with no image sampling at all —
 * see BlobTrackerEffect's doc comment). Layer Mix nodes are always included (they
 * have no `type` to exclude by — the `l.kind === "mix" ||` check below narrows `l` to
 * EffectLayer for the rest of the condition). */
export function getEnabledContentLayers(layers: Layer[]): ContentLayer[] {
  return flattenEnabledEffectLayers(layers).filter((l) => l.kind === "mix" || (l.type !== "edgeBlend" && l.type !== "ascii" && l.type !== "blobTracker"));
}

/** Every enabled Edge Blend layer, in stack order — each renders its own glow behind
 * the image; more than one just layers their glows on top of each other. */
export function getEnabledEdgeBlendLayers(layers: Layer[]): Extract<EffectLayer, { type: "edgeBlend" }>[] {
  return flattenEnabledEffectLayers(layers).filter(
    (l): l is Extract<EffectLayer, { type: "edgeBlend" }> => l.kind === "effect" && l.type === "edgeBlend",
  );
}

/** Every enabled ASCII layer, in stack order — only the last one actually matters
 * (each one fully replaces the box's visual content with its own character grid, so
 * stacking more than one is harmless but redundant, same as stacking two Nokia-3310
 * pixelations would be). */
export function getEnabledAsciiLayers(layers: Layer[]): Extract<EffectLayer, { type: "ascii" }>[] {
  return flattenEnabledEffectLayers(layers).filter((l): l is Extract<EffectLayer, { type: "ascii" }> => l.kind === "effect" && l.type === "ascii");
}

/** Every enabled Blob Tracker layer, in stack order — each draws its own independently
 * seeded/positioned set of reticles on top, so unlike ASCII, stacking more than one is
 * meaningful (more/denser tracking marks), not redundant. */
export function getEnabledBlobTrackerLayers(layers: Layer[]): Extract<EffectLayer, { type: "blobTracker" }>[] {
  return flattenEnabledEffectLayers(layers).filter(
    (l): l is Extract<EffectLayer, { type: "blobTracker" }> => l.kind === "effect" && l.type === "blobTracker",
  );
}

/** Resolves a selected layer id to the actual layer it names — a top-level effect, a
 * preset group's child, the Mix node itself, or a child inside either of a Mix's two
 * branches — so the Inspector panel (LayerInspectorPanel.tsx) doesn't need to know
 * which container the selection lives in. Preset groups themselves are never
 * returned (they have no own settings to inspect — only their children do; selecting
 * a group just expands/collapses it via its own row's chevron, handled separately). */
export function findLayerById(layers: Layer[], id: string): EffectLayer | MixLayer | null {
  for (const layer of layers) {
    if (layer.kind === "effect" && layer.id === id) return layer;
    if (layer.kind === "mix") {
      if (layer.id === id) return layer;
      const inBranch = [...layer.branchA, ...layer.branchB].find((c) => c.id === id);
      if (inBranch) return inBranch;
    }
    if (layer.kind === "group") {
      const child = layer.children.find((c) => c.id === id);
      if (child) return child;
    }
  }
  return null;
}
