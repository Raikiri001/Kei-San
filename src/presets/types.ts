import type { StackableEffect } from "@/store/types";

/**
 * A named, curated bundle of effect layers added together in one click — instantiated
 * as a `PresetGroupLayer` (see instantiatePreset.ts), never applied by replacing
 * anything: clicking a preset card always ADDS a new, independent group to the
 * image's layer stack, so presets and individual effects (and multiple instances of
 * the same preset) freely stack on top of each other rather than one replacing another.
 */
export interface ImageEffectPreset {
  id: string;
  name: string;
  /** Child effect templates this preset bundles (Edge Blend included, same as any other
   * type) — params only; a fresh `id` is minted per child every time this preset gets
   * instantiated, so two applications of the same preset never share state. */
  entries: StackableEffect[];
}
