import { useCallback, useRef, useState } from "react";
import { ColorPickerButton } from "@/components/ColorPickerButton";
import { SliderField } from "@/components/EffectsDrawer/SliderField";
import { SegmentedField } from "@/components/EffectsDrawer/SegmentedField";
import { DirectionPad } from "@/components/EffectsDrawer/DirectionPad";
import { XYPad } from "@/components/EffectsDrawer/XYPad";
import { CurveField } from "@/components/EffectsDrawer/CurveField";
import { ColorWheelPad } from "@/components/EffectsDrawer/ColorWheelPad";
import { GradientStopEditor } from "@/components/EffectsDrawer/GradientStopEditor";
import { EffectPreviewStage } from "@/components/EffectsDrawer/EffectPreviewStage";
import { CircleRegionEditor } from "@/components/EffectsDrawer/CircleRegionEditor";
import { QuadCornerEditor } from "@/components/EffectsDrawer/QuadCornerEditor";
import { MeshWarpEditor } from "@/components/EffectsDrawer/MeshWarpEditor";
import { TransformBoxEditor } from "@/components/EffectsDrawer/TransformBoxEditor";
import { ChannelSignalRow } from "@/components/EffectsDrawer/ChannelSignalRow";
import { ShuffleIcon } from "@/components/EffectsDrawer/icons";
import { InfoTooltip } from "@/components/InfoTooltip";
import type { ColorBalanceEffect, ColorGradingEffect, CurvesEffect, EffectLayer, HueCurvesEffect } from "@/store/types";

const DOT_PITCH_MIN = 4;
const DOT_PITCH_MAX = 40;

const SHIFT_DISTANCE_MIN = 0;
const SHIFT_DISTANCE_MAX = 100;

const SHIFT_AMOUNT_MIN = -2;
const SHIFT_AMOUNT_MAX = 2;

const SHIFT_EDGE_FALLOFF_MIN = 0;
const SHIFT_EDGE_FALLOFF_MAX = 1;

const EDGE_BLEND_MARGIN_MIN = 8;
const EDGE_BLEND_MARGIN_MAX = 400;

const BLUR_RADIUS_MIN = 0;
const BLUR_RADIUS_MAX = 40;

const MOTION_BLUR_DISTANCE_MIN = 0;
const MOTION_BLUR_DISTANCE_MAX = 150;

const CAMERA_SHAKE_INTENSITY_MIN = 0;
const CAMERA_SHAKE_INTENSITY_MAX = 40;

const GLOW_THRESHOLD_MIN = 0;
const GLOW_THRESHOLD_MAX = 1;

const GLOW_INTENSITY_MIN = 0;
const GLOW_INTENSITY_MAX = 3;

const STREAK_LENGTH_MIN = 0;
const STREAK_LENGTH_MAX = 300;

const DITHER_LEVELS_MIN = 2;
const DITHER_LEVELS_MAX = 16;

const XEROX_THRESHOLD_MIN = 0;
const XEROX_THRESHOLD_MAX = 1;

const XEROX_CONTRAST_MIN = 0.5;
const XEROX_CONTRAST_MAX = 10;

const RAY_COUNT_MIN = 1;
const RAY_COUNT_MAX = 8;

const PIXEL_SIZE_MIN = 2;
const PIXEL_SIZE_MAX = 60;

const ASCII_CELL_SIZE_MIN = 4;
const ASCII_CELL_SIZE_MAX = 32;

const GLITCH_BAND_COUNT_MIN = 2;
const GLITCH_BAND_COUNT_MAX = 60;

const GLITCH_INTENSITY_MIN = 0;
const GLITCH_INTENSITY_MAX = 100;

const GLITCH_COLOR_SHIFT_MIN = 0;
const GLITCH_COLOR_SHIFT_MAX = 30;

const GLITCH_DENSITY_MIN = 0;
const GLITCH_DENSITY_MAX = 1;

const GLITCH_BAND_JITTER_MIN = 0;
const GLITCH_BAND_JITTER_MAX = 1;

const GLITCH_SEED_MIN = 0;
const GLITCH_SEED_MAX = 9999;

const VHS_SCANLINE_MIN = 0;
const VHS_SCANLINE_MAX = 1;

const VHS_BLEED_MIN = 0;
const VHS_BLEED_MAX = 15;

const VHS_NOISE_MIN = 0;
const VHS_NOISE_MAX = 0.5;

const NTSC_BLEED_MIN = 0;
const NTSC_BLEED_MAX = 30;

const NTSC_INTERLACE_MIN = 0;
const NTSC_INTERLACE_MAX = 1;

// A wide max is what makes a genuinely flat-reading baseline reachable on large
// canvases (a period has to span a large fraction of the image before it stops
// visibly curving within the frame) — see modulation.ts.
const MOD_WAVE_SCALE_MIN = 4;
const MOD_WAVE_SCALE_MAX = 2000;

const MOD_FM_SENSITIVITY_MIN = 0;
const MOD_FM_SENSITIVITY_MAX = 1;

const MOD_WAVE_AMPLITUDE_MIN = 0;
const MOD_WAVE_AMPLITUDE_MAX = 100;

// No longer bounded by a search-window ceiling (see modulation.ts's doc comment on
// why an earlier version of this effect plateaued around 20px) — free to go large.
const MOD_SIGNAL_STRENGTH_MIN = 0;
const MOD_SIGNAL_STRENGTH_MAX = 400;

const MOD_LINE_SPACING_MIN = 1;
const MOD_LINE_SPACING_MAX = 60;

const MOD_LINE_WIDTH_MIN = 0.25;
const MOD_LINE_WIDTH_MAX = 8;

// 0-100, 50 neutral — matches the reference line-scan tool's own convention for all
// four of its tone controls.
const MOD_TONE_MIN = 0;
const MOD_TONE_MAX = 100;

const MOD_BLUR_MIN = 0;
const MOD_BLUR_MAX = 40;

const LED_CELL_SIZE_MIN = 4;
const LED_CELL_SIZE_MAX = 40;

const GRAIN_AMOUNT_MIN = 0;
const GRAIN_AMOUNT_MAX = 1;

const VIGNETTE_MIN = 0;
const VIGNETTE_MAX = 1;

const BLOB_DENSITY_MIN = 1;
const BLOB_DENSITY_MAX = 20;

const BLOB_SENSITIVITY_MIN = 0;
const BLOB_SENSITIVITY_MAX = 1;

const TRAILS_KNEE_MIN = 0;
const TRAILS_KNEE_MAX = 1;

const TRAILS_PREBLUR_MIN = 0;
const TRAILS_PREBLUR_MAX = 20;

const TRAILS_DIMMING_MIN = 0;
const TRAILS_DIMMING_MAX = 1;

const TRAILS_SHAKE_MIN = 0;
const TRAILS_SHAKE_MAX = 1;

const TRAILS_SHAKE_SPEED_MIN = 0;
const TRAILS_SHAKE_SPEED_MAX = 20;

const TRAILS_INTENSITY_MIN = 0;
const TRAILS_INTENSITY_MAX = 5;

const TRAILS_SOURCE_DIM_MIN = 0;
const TRAILS_SOURCE_DIM_MAX = 1;

const LEVELS_POINT_MIN = 0;
const LEVELS_POINT_MAX = 255;

const LEVELS_GAMMA_MIN = 0.1;
const LEVELS_GAMMA_MAX = 9.99;

const EXPOSURE_STOPS_MIN = -20;
const EXPOSURE_STOPS_MAX = 20;

const EXPOSURE_OFFSET_MIN = -0.5;
const EXPOSURE_OFFSET_MAX = 0.5;

const EXPOSURE_GAMMA_MIN = 0.01;
const EXPOSURE_GAMMA_MAX = 9.99;

const BRIGHTNESS_MIN = -100;
const BRIGHTNESS_MAX = 100;

const CONTRAST_MIN = -100;
const CONTRAST_MAX = 100;

const TEMPERATURE_MIN = 2000;
const TEMPERATURE_MAX = 12000;

const TINT_MIN = -100;
const TINT_MAX = 100;

const HUE_MIN = -180;
const HUE_MAX = 180;

const SATURATION_MIN = -100;
const SATURATION_MAX = 100;

const LIGHTNESS_MIN = -100;
const LIGHTNESS_MAX = 100;

const COLOR_BALANCE_MIN = -100;
const COLOR_BALANCE_MAX = 100;

const GAIN_MIN = 0;
const GAIN_MAX = 4;

const MONO_WEIGHT_MIN = 0;
const MONO_WEIGHT_MAX = 200;

const THERMAL_POINT_MIN = 0;
const THERMAL_POINT_MAX = 1;

const MATRIX_CELL_MIN = -2;
const MATRIX_CELL_MAX = 2;

const MATRIX_OFFSET_MIN = -1;
const MATRIX_OFFSET_MAX = 1;

const GRADING_LUMINANCE_MIN = -100;
const GRADING_LUMINANCE_MAX = 100;

const CIRCULAR_BLUR_RADIUS_MIN = 0;
const CIRCULAR_BLUR_RADIUS_MAX = 40;

const SPIN_ANGLE_MIN = 0;
const SPIN_ANGLE_MAX = 45;

const ZOOM_STRENGTH_MIN = 0;
const ZOOM_STRENGTH_MAX = 100;

const BLUR_SHARP_AMOUNT_MIN = -100;
const BLUR_SHARP_AMOUNT_MAX = 100;

const DOF_FOCUS_SIZE_MIN = 0;
const DOF_FOCUS_SIZE_MAX = 1;

const DOF_FEATHER_MIN = 0;
const DOF_FEATHER_MAX = 1;

const DOF_BLUR_RADIUS_MIN = 0;
const DOF_BLUR_RADIUS_MAX = 40;

const DISTORT_RADIUS_MIN = 1;
const DISTORT_RADIUS_MAX = 600;

const SWIRL_ANGLE_MIN = -720;
const SWIRL_ANGLE_MAX = 720;

const PINCH_STRENGTH_MIN = -100;
const PINCH_STRENGTH_MAX = 100;

const RIPPLE_AMPLITUDE_MIN = 0;
const RIPPLE_AMPLITUDE_MAX = 50;

const RIPPLE_WAVELENGTH_MIN = 10;
const RIPPLE_WAVELENGTH_MAX = 200;

const EMBOSS_HEIGHT_MIN = 1;
const EMBOSS_HEIGHT_MAX = 10;

const EMBOSS_AMOUNT_MIN = 0;
const EMBOSS_AMOUNT_MAX = 100;

const POLAR_ROTATION_MIN = 0;
const POLAR_ROTATION_MAX = 360;

const VIGNETTE_FEATHER_MIN = 0;
const VIGNETTE_FEATHER_MAX = 1;

const VIGNETTE_AMOUNT_MIN = -1;
const VIGNETTE_AMOUNT_MAX = 1;

const THRESHOLD_VALUE_MIN = 0;
const THRESHOLD_VALUE_MAX = 1;

const THRESHOLD_SOFTNESS_MIN = 0;
const THRESHOLD_SOFTNESS_MAX = 1;

const REEDED_GLASS_RIB_WIDTH_MIN = 4;
const REEDED_GLASS_RIB_WIDTH_MAX = 100;

const REEDED_GLASS_STRENGTH_MIN = 0;
const REEDED_GLASS_STRENGTH_MAX = 30;

const CUBIFY_CELL_SIZE_MIN = 4;
const CUBIFY_CELL_SIZE_MAX = 80;

const CUBIFY_JITTER_MIN = 0;
const CUBIFY_JITTER_MAX = 1;

const TRANSFORM_SKEW_MIN = -60;
const TRANSFORM_SKEW_MAX = 60;

const RISOGRAPH_SPLIT_MIN = 0;
const RISOGRAPH_SPLIT_MAX = 1;

const RISOGRAPH_OVERLAP_MIN = 0.01;
const RISOGRAPH_OVERLAP_MAX = 0.5;

const RISOGRAPH_DOT_PITCH_MIN = 4;
const RISOGRAPH_DOT_PITCH_MAX = 30;

const RISOGRAPH_MISREGISTER_MIN = 0;
const RISOGRAPH_MISREGISTER_MAX = 10;

const STRIPE_BAND_WIDTH_MIN = 2;
const STRIPE_BAND_WIDTH_MAX = 30;

const STRIPE_INTENSITY_MIN = 0;
const STRIPE_INTENSITY_MAX = 1;

const STRIPE_IRREGULARITY_MIN = 0;
const STRIPE_IRREGULARITY_MAX = 1;

const NOISE_AMOUNT_MIN = 0;
const NOISE_AMOUNT_MAX = 1;

const FRAME_DROP_BLOCK_SIZE_MIN = 4;
const FRAME_DROP_BLOCK_SIZE_MAX = 48;

const FRAME_DROP_INTENSITY_MIN = 0;
const FRAME_DROP_INTENSITY_MAX = 1;

const FRAME_DROP_COLOR_SHIFT_MIN = 0;
const FRAME_DROP_COLOR_SHIFT_MAX = 20;

const CRT_CURVATURE_MIN = 0;
const CRT_CURVATURE_MAX = 1;

const CRT_CELL_SIZE_MIN = 2;
const CRT_CELL_SIZE_MAX = 20;

const CRT_PHOSPHOR_MIN = 0;
const CRT_PHOSPHOR_MAX = 1;

const CRT_SCANLINE_MIN = 0;
const CRT_SCANLINE_MAX = 1;

const INK_BLEED_THRESHOLD_MIN = 0;
const INK_BLEED_THRESHOLD_MAX = 1;

const INK_BLEED_AMOUNT_MIN = 0;
const INK_BLEED_AMOUNT_MAX = 10;

const INK_BLEED_SOFTNESS_MIN = 0;
const INK_BLEED_SOFTNESS_MAX = 1;

const VINTAGE_FILM_SCRATCH_DENSITY_MIN = 0;
const VINTAGE_FILM_SCRATCH_DENSITY_MAX = 1;

const VINTAGE_FILM_SCRATCH_INTENSITY_MIN = 0;
const VINTAGE_FILM_SCRATCH_INTENSITY_MAX = 1;

const DISPLACEMENT_AMOUNT_MIN = 0;
const DISPLACEMENT_AMOUNT_MAX = 15;

const DISPLACEMENT_SCALE_MIN = 1;
const DISPLACEMENT_SCALE_MAX = 20;

const FILM_GRAIN_AMOUNT_MIN = 0;
const FILM_GRAIN_AMOUNT_MAX = 1;

const FILM_GRAIN_SIZE_MIN = 1;
const FILM_GRAIN_SIZE_MAX = 8;

const HALATION_THRESHOLD_MIN = 0;
const HALATION_THRESHOLD_MAX = 1;

const HALATION_RADIUS_MIN = 1;
const HALATION_RADIUS_MAX = 40;

const HALATION_INTENSITY_MIN = 0;
const HALATION_INTENSITY_MAX = 3;

/** Each channel's curve is drawn in that channel's own color (master stays neutral)
 * so the curve itself reads as "this is the red/green/blue channel" at a glance.
 * Master uses bar-fg (not the fixed --color-accent-glow) since CurveField's own
 * graph background is now theme-adaptive too — a fixed near-white line would
 * nearly vanish against a light-mode graph. */
const CURVE_CHANNEL_COLORS: Record<"master" | "red" | "green" | "blue", string> = {
  master: "rgb(var(--bar-fg))",
  red: "#ef4444",
  green: "#22c55e",
  blue: "#3b82f6",
};

/** Channel tabs for the Curves effect — local UI state, not persisted (same
 * "resets to a sensible default each time you reopen" pattern as MaskFields' own
 * `expanded` toggle), so which tab you last had open doesn't need to round-trip
 * through the store. */
function CurvesFields({ layer, onUpdate }: { layer: CurvesEffect; onUpdate: (patch: Record<string, unknown>) => void }) {
  const [channel, setChannel] = useState<"master" | "red" | "green" | "blue">("master");
  return (
    <div className="flex flex-col gap-3">
      <SegmentedField
        label="Channel"
        value={channel}
        options={[
          { value: "master", label: "Master" },
          { value: "red", label: "Red" },
          { value: "green", label: "Green" },
          { value: "blue", label: "Blue" },
        ]}
        onChange={setChannel}
      />
      <CurveField
        label={`${channel[0].toUpperCase()}${channel.slice(1)} Curve`}
        points={layer[channel]}
        onChange={(points) => onUpdate({ [channel]: points })}
        color={CURVE_CHANNEL_COLORS[channel]}
      />
    </div>
  );
}

type ToneZone = "shadow" | "midtone" | "highlight";
const TONE_ZONE_OPTIONS: { value: ToneZone; label: string }[] = [
  { value: "shadow", label: "Shadows" },
  { value: "midtone", label: "Midtones" },
  { value: "highlight", label: "Highlights" },
];

const COLOR_BALANCE_ZONE_FIELDS: Record<ToneZone, { cyanRed: keyof ColorBalanceEffect; magentaGreen: keyof ColorBalanceEffect; yellowBlue: keyof ColorBalanceEffect }> = {
  shadow: { cyanRed: "shadowCyanRed", magentaGreen: "shadowMagentaGreen", yellowBlue: "shadowYellowBlue" },
  midtone: { cyanRed: "midtoneCyanRed", magentaGreen: "midtoneMagentaGreen", yellowBlue: "midtoneYellowBlue" },
  highlight: { cyanRed: "highlightCyanRed", magentaGreen: "highlightMagentaGreen", yellowBlue: "highlightYellowBlue" },
};

/** Tone-range tabs for Color Balance — same local-tab pattern as CurvesFields' own
 * Master/R/G/B tabs, just over Shadows/Midtones/Highlights instead. */
function ColorBalanceFields({ layer, onUpdate }: { layer: ColorBalanceEffect; onUpdate: (patch: Record<string, unknown>) => void }) {
  const [zone, setZone] = useState<ToneZone>("shadow");
  const fields = COLOR_BALANCE_ZONE_FIELDS[zone];
  return (
    <div className="flex flex-col gap-3">
      <SegmentedField label="Tone Range" value={zone} options={TONE_ZONE_OPTIONS} onChange={setZone} />
      <SliderField
        label="Cyan-Red"
        value={layer[fields.cyanRed] as number}
        min={COLOR_BALANCE_MIN}
        max={COLOR_BALANCE_MAX}
        step={1}
        decimals={0}
        onChange={(v) => onUpdate({ [fields.cyanRed]: v })}
      />
      <SliderField
        label="Magenta-Green"
        value={layer[fields.magentaGreen] as number}
        min={COLOR_BALANCE_MIN}
        max={COLOR_BALANCE_MAX}
        step={1}
        decimals={0}
        onChange={(v) => onUpdate({ [fields.magentaGreen]: v })}
      />
      <SliderField
        label="Yellow-Blue"
        value={layer[fields.yellowBlue] as number}
        min={COLOR_BALANCE_MIN}
        max={COLOR_BALANCE_MAX}
        step={1}
        decimals={0}
        onChange={(v) => onUpdate({ [fields.yellowBlue]: v })}
      />
    </div>
  );
}

const COLOR_GRADING_ZONE_FIELDS: Record<ToneZone, { hue: keyof ColorGradingEffect; saturation: keyof ColorGradingEffect; luminance: keyof ColorGradingEffect }> = {
  shadow: { hue: "shadowHue", saturation: "shadowSaturation", luminance: "shadowLuminance" },
  midtone: { hue: "midtoneHue", saturation: "midtoneSaturation", luminance: "midtoneLuminance" },
  highlight: { hue: "highlightHue", saturation: "highlightSaturation", luminance: "highlightLuminance" },
};

/** Tone-range tabs for Color Grading's 3-way wheels — same tab pattern as Color
 * Balance, just a hue/saturation wheel + luminance slider per zone instead of 3
 * CMY-axis sliders. */
function ColorGradingFields({ layer, onUpdate }: { layer: ColorGradingEffect; onUpdate: (patch: Record<string, unknown>) => void }) {
  const [zone, setZone] = useState<ToneZone>("shadow");
  const fields = COLOR_GRADING_ZONE_FIELDS[zone];
  return (
    <div className="flex flex-col gap-3">
      <SegmentedField label="Tone Range" value={zone} options={TONE_ZONE_OPTIONS} onChange={setZone} />
      <ColorWheelPad
        label="Hue / Saturation"
        hue={layer[fields.hue] as number}
        saturation={layer[fields.saturation] as number}
        onChange={(hue, saturation) => onUpdate({ [fields.hue]: hue, [fields.saturation]: saturation })}
      />
      <SliderField
        label="Luminance"
        value={layer[fields.luminance] as number}
        min={GRADING_LUMINANCE_MIN}
        max={GRADING_LUMINANCE_MAX}
        step={1}
        decimals={0}
        onChange={(v) => onUpdate({ [fields.luminance]: v })}
      />
    </div>
  );
}

type HueCurveTab = "hue" | "saturation" | "lightness";
const HUE_CURVE_FIELDS: Record<HueCurveTab, "hueToHue" | "hueToSaturation" | "hueToLightness"> = {
  hue: "hueToHue",
  saturation: "hueToSaturation",
  lightness: "hueToLightness",
};

/** Adjustment tabs for Hue Curves — each curve's horizontal axis is the pixel's own
 * hue (not tone), so a short explainer replaces CurvesFields' per-channel coloring
 * (there's no single "this channel's color" to tint the line with here). */
function HueCurvesFields({ layer, onUpdate }: { layer: HueCurvesEffect; onUpdate: (patch: Record<string, unknown>) => void }) {
  const [tab, setTab] = useState<HueCurveTab>("hue");
  const field = HUE_CURVE_FIELDS[tab];
  return (
    <div className="flex flex-col gap-3">
      <SegmentedField
        label="Adjust"
        value={tab}
        options={[
          { value: "hue", label: "Hue" },
          { value: "saturation", label: "Saturation" },
          { value: "lightness", label: "Lightness" },
        ]}
        hint="Horizontal axis is the pixel's own hue (red, yellow, green, cyan, blue, magenta); vertical is how much to shift it."
        onChange={setTab}
      />
      <CurveField label="Vs. Hue" points={layer[field]} onChange={(points) => onUpdate({ [field]: points })} />
    </div>
  );
}

const POINT_STAGE_W = 280;
const POINT_STAGE_H = 210;

/** A plain draggable center point on a live preview — small enough to inline here
 * rather than its own file (see this phase's plan). Used wherever a param only needs
 * a position, not a region/shape (Radial Blur/Zoom Blur's center, Depth of Field's
 * Tilt-Shift center). */
function CenterPointEditor({
  label,
  loadedImg,
  previewLayers,
  centerX,
  centerY,
  onChange,
}: {
  label: string;
  loadedImg: HTMLImageElement | null;
  previewLayers: EffectLayer[];
  centerX: number;
  centerY: number;
  onChange: (centerX: number, centerY: number) => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const updateFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const rect = stageRef.current?.getBoundingClientRect();
      if (!rect) return;
      const fracX = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      const fracY = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
      onChange(fracX, fracY);
    },
    [onChange],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGCircleElement>) => {
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      dragging.current = true;
      updateFromPointer(e.clientX, e.clientY);
    },
    [updateFromPointer],
  );
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGCircleElement>) => {
      if (dragging.current) updateFromPointer(e.clientX, e.clientY);
    },
    [updateFromPointer],
  );
  const handlePointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] uppercase tracking-wide opacity-70">{label}</span>
        <InfoTooltip text="Drag to reposition the center." label={`About ${label}`} />
      </div>
      <div ref={stageRef}>
        <EffectPreviewStage loadedImg={loadedImg} layers={previewLayers} width={POINT_STAGE_W} height={POINT_STAGE_H}>
          <circle
            cx={centerX * POINT_STAGE_W}
            cy={centerY * POINT_STAGE_H}
            r={7}
            fill="rgb(var(--color-accent-glow))"
            stroke="black"
            strokeWidth={1}
            className="cursor-move"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          />
        </EffectPreviewStage>
      </div>
    </div>
  );
}

/** Renders the settings fields specific to one effect layer's own type — the
 * per-type switch every future effect adds one case to, matching this app's existing
 * "each effect hand-writes its own controls" convention. */
export function LayerSettingsFields({
  layer,
  loadedImg,
  onUpdate,
}: {
  layer: EffectLayer;
  loadedImg: HTMLImageElement | null;
  onUpdate: (patch: Record<string, unknown>) => void;
}) {
  switch (layer.type) {
    case "halftone":
      return (
        <div className="flex flex-col gap-3">
          {layer.style !== "hatch" && (
            <SegmentedField
              label="Fill"
              value={layer.mode}
              options={[
                { value: "color", label: "Photo Colors" },
                { value: "ink", label: "Ink Color" },
              ]}
              onChange={(mode) => onUpdate({ mode })}
            />
          )}
          <SegmentedField
            label="Screen Style"
            value={layer.style}
            options={[
              { value: "circle", label: "Dot Circles" },
              { value: "line", label: "Line Screen" },
              { value: "hatch", label: "CMYK Hatch" },
            ]}
            onChange={(style) => onUpdate({ style })}
          />
          <SliderField
            label={layer.style === "hatch" ? "Line Spacing" : "Dot Size"}
            value={layer.dotPitch}
            min={DOT_PITCH_MIN}
            max={DOT_PITCH_MAX}
            unit="px"
            onChange={(dotPitch) => onUpdate({ dotPitch })}
          />
          {layer.style !== "hatch" && layer.mode === "ink" && (
            <label className="flex items-center justify-between text-[11px] uppercase tracking-wide opacity-70">
              <span>Ink Color</span>
              <ColorPickerButton value={layer.inkColor} onChange={(hex) => onUpdate({ inkColor: hex })} label="Ink Color" />
            </label>
          )}
        </div>
      );
    case "rgbShift":
      return (
        <div className="flex flex-col gap-3">
          <SegmentedField
            label="Mode"
            value={layer.mode}
            options={[
              { value: "linear", label: "Linear" },
              { value: "radial", label: "Radial (Lens)" },
            ]}
            onChange={(mode) => onUpdate({ mode })}
          />
          <SliderField
            label="Distance"
            value={layer.distance}
            min={SHIFT_DISTANCE_MIN}
            max={SHIFT_DISTANCE_MAX}
            unit="px"
            onChange={(distance) => onUpdate({ distance })}
          />
          {layer.mode === "linear" ? (
            <DirectionPad label="Shift Direction" angle={layer.angle} onChange={(angle) => onUpdate({ angle })} />
          ) : (
            <>
              <CenterPointEditor
                label="Center"
                loadedImg={loadedImg}
                previewLayers={[layer]}
                centerX={layer.centerX}
                centerY={layer.centerY}
                onChange={(centerX, centerY) => onUpdate({ centerX, centerY })}
              />
              <SliderField
                label="Edge Falloff"
                value={layer.edgeFalloff}
                min={SHIFT_EDGE_FALLOFF_MIN}
                max={SHIFT_EDGE_FALLOFF_MAX}
                step={0.01}
                decimals={2}
                onChange={(edgeFalloff) => onUpdate({ edgeFalloff })}
              />
            </>
          )}
          <SliderField
            label="Red Amount"
            value={layer.redAmount}
            min={SHIFT_AMOUNT_MIN}
            max={SHIFT_AMOUNT_MAX}
            step={0.05}
            decimals={2}
            onChange={(redAmount) => onUpdate({ redAmount })}
          />
          <SliderField
            label="Green Amount"
            value={layer.greenAmount}
            min={SHIFT_AMOUNT_MIN}
            max={SHIFT_AMOUNT_MAX}
            step={0.05}
            decimals={2}
            onChange={(greenAmount) => onUpdate({ greenAmount })}
          />
          <SliderField
            label="Blue Amount"
            value={layer.blueAmount}
            min={SHIFT_AMOUNT_MIN}
            max={SHIFT_AMOUNT_MAX}
            step={0.05}
            decimals={2}
            onChange={(blueAmount) => onUpdate({ blueAmount })}
          />
        </div>
      );
    case "edgeBlend":
      return (
        <SliderField
          label="Glow Size"
          value={layer.margin}
          min={EDGE_BLEND_MARGIN_MIN}
          max={EDGE_BLEND_MARGIN_MAX}
          unit="px"
          onChange={(margin) => onUpdate({ margin })}
        />
      );
    case "gaussianBlur":
      return (
        <SliderField label="Radius" value={layer.radius} min={BLUR_RADIUS_MIN} max={BLUR_RADIUS_MAX} unit="px" onChange={(radius) => onUpdate({ radius })} />
      );
    case "motionBlur":
      return (
        <div className="flex flex-col gap-3">
          <SliderField
            label="Distance"
            value={layer.distance}
            min={MOTION_BLUR_DISTANCE_MIN}
            max={MOTION_BLUR_DISTANCE_MAX}
            unit="px"
            onChange={(distance) => onUpdate({ distance })}
          />
          <DirectionPad label="Blur Direction" angle={layer.angle} onChange={(angle) => onUpdate({ angle })} />
        </div>
      );
    case "cameraShake":
      return (
        <SliderField
          label="Intensity"
          value={layer.intensity}
          min={CAMERA_SHAKE_INTENSITY_MIN}
          max={CAMERA_SHAKE_INTENSITY_MAX}
          unit="px"
          onChange={(intensity) => onUpdate({ intensity })}
        />
      );
    case "bloom":
      return (
        <div className="flex flex-col gap-3">
          <SliderField
            label="Threshold"
            value={layer.threshold}
            min={GLOW_THRESHOLD_MIN}
            max={GLOW_THRESHOLD_MAX}
            step={0.01}
            decimals={2}
            onChange={(threshold) => onUpdate({ threshold })}
          />
          <SliderField
            label="Intensity"
            value={layer.intensity}
            min={GLOW_INTENSITY_MIN}
            max={GLOW_INTENSITY_MAX}
            step={0.05}
            decimals={2}
            onChange={(intensity) => onUpdate({ intensity })}
          />
        </div>
      );
    case "starGlow":
      return (
        <div className="flex flex-col gap-3">
          <SliderField
            label="Threshold"
            value={layer.threshold}
            min={GLOW_THRESHOLD_MIN}
            max={GLOW_THRESHOLD_MAX}
            step={0.01}
            decimals={2}
            onChange={(threshold) => onUpdate({ threshold })}
          />
          <DirectionPad label="Base Ray Direction" angle={layer.angle} onChange={(angle) => onUpdate({ angle })} />
          <SliderField label="Ray Count" value={layer.rayCount} min={RAY_COUNT_MIN} max={RAY_COUNT_MAX} step={1} onChange={(rayCount) => onUpdate({ rayCount })} />
          <SliderField label="Length" value={layer.length} min={STREAK_LENGTH_MIN} max={STREAK_LENGTH_MAX} unit="px" onChange={(length) => onUpdate({ length })} />
          <SliderField
            label="Intensity"
            value={layer.intensity}
            min={GLOW_INTENSITY_MIN}
            max={GLOW_INTENSITY_MAX}
            step={0.05}
            decimals={2}
            onChange={(intensity) => onUpdate({ intensity })}
          />
        </div>
      );
    case "dither":
      return (
        <SliderField label="Levels" value={layer.levels} min={DITHER_LEVELS_MIN} max={DITHER_LEVELS_MAX} step={1} onChange={(levels) => onUpdate({ levels })} />
      );
    case "xerox":
      return (
        <div className="flex flex-col gap-3">
          <SliderField
            label="Threshold"
            value={layer.threshold}
            min={XEROX_THRESHOLD_MIN}
            max={XEROX_THRESHOLD_MAX}
            step={0.01}
            decimals={2}
            onChange={(threshold) => onUpdate({ threshold })}
          />
          <SliderField
            label="Contrast"
            value={layer.contrast}
            min={XEROX_CONTRAST_MIN}
            max={XEROX_CONTRAST_MAX}
            step={0.1}
            decimals={1}
            onChange={(contrast) => onUpdate({ contrast })}
          />
        </div>
      );
    case "pixelate":
      return (
        <div className="flex flex-col gap-3">
          <SliderField
            label="Pixel Size"
            value={layer.pixelSize}
            min={PIXEL_SIZE_MIN}
            max={PIXEL_SIZE_MAX}
            unit="px"
            onChange={(pixelSize) => onUpdate({ pixelSize })}
          />
          <SegmentedField
            label="Tint"
            value={layer.monochrome ? "mono" : "color"}
            options={[
              { value: "mono", label: "LCD Green" },
              { value: "color", label: "Full Color" },
            ]}
            onChange={(v) => onUpdate({ monochrome: v === "mono" })}
          />
        </div>
      );
    case "ascii":
      return (
        <div className="flex flex-col gap-3">
          <SliderField
            label="Cell Size"
            value={layer.cellSize}
            min={ASCII_CELL_SIZE_MIN}
            max={ASCII_CELL_SIZE_MAX}
            unit="px"
            onChange={(cellSize) => onUpdate({ cellSize })}
          />
          <SegmentedField
            label="Color"
            value={layer.colorMode}
            options={[
              { value: "mono", label: "White on Black" },
              { value: "color", label: "Sampled Color" },
            ]}
            onChange={(colorMode) => onUpdate({ colorMode })}
          />
        </div>
      );
    case "glitch":
      return (
        <div className="flex flex-col gap-3">
          <SliderField
            label="Band Count"
            value={layer.bandCount}
            min={GLITCH_BAND_COUNT_MIN}
            max={GLITCH_BAND_COUNT_MAX}
            step={1}
            onChange={(bandCount) => onUpdate({ bandCount })}
          />
          <SliderField
            label="Intensity"
            value={layer.intensity}
            min={GLITCH_INTENSITY_MIN}
            max={GLITCH_INTENSITY_MAX}
            unit="px"
            onChange={(intensity) => onUpdate({ intensity })}
          />
          <SliderField
            label="Color Shift"
            value={layer.colorShift}
            min={GLITCH_COLOR_SHIFT_MIN}
            max={GLITCH_COLOR_SHIFT_MAX}
            unit="px"
            onChange={(colorShift) => onUpdate({ colorShift })}
          />
          <SliderField
            label="Density"
            value={layer.density}
            min={GLITCH_DENSITY_MIN}
            max={GLITCH_DENSITY_MAX}
            step={0.01}
            decimals={2}
            onChange={(density) => onUpdate({ density })}
          />
          <SliderField
            label="Band Jitter"
            value={layer.bandJitter}
            min={GLITCH_BAND_JITTER_MIN}
            max={GLITCH_BAND_JITTER_MAX}
            step={0.01}
            decimals={2}
            onChange={(bandJitter) => onUpdate({ bandJitter })}
          />
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <SliderField label="Seed" value={layer.seed} min={GLITCH_SEED_MIN} max={GLITCH_SEED_MAX} step={1} onChange={(seed) => onUpdate({ seed })} />
            </div>
            <button
              type="button"
              onClick={() => onUpdate({ seed: Math.floor(Math.random() * (GLITCH_SEED_MAX + 1)) })}
              aria-label="Reroll seed"
              title="Reroll seed"
              className="press-scale mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded border border-[rgb(var(--bar-border)/0.3)] opacity-70 hover:opacity-100"
            >
              <ShuffleIcon />
            </button>
          </div>
        </div>
      );
    case "vhs":
      return (
        <div className="flex flex-col gap-3">
          <SliderField
            label="Scanlines"
            value={layer.scanlineIntensity}
            min={VHS_SCANLINE_MIN}
            max={VHS_SCANLINE_MAX}
            step={0.01}
            decimals={2}
            onChange={(scanlineIntensity) => onUpdate({ scanlineIntensity })}
          />
          <SliderField
            label="Color Bleed"
            value={layer.colorBleed}
            min={VHS_BLEED_MIN}
            max={VHS_BLEED_MAX}
            unit="px"
            onChange={(colorBleed) => onUpdate({ colorBleed })}
          />
          <SliderField
            label="Grain"
            value={layer.noise}
            min={VHS_NOISE_MIN}
            max={VHS_NOISE_MAX}
            step={0.01}
            decimals={2}
            onChange={(noise) => onUpdate({ noise })}
          />
        </div>
      );
    case "ntsc":
      return (
        <div className="flex flex-col gap-3">
          <SliderField
            label="Color Bleed"
            value={layer.colorBleed}
            min={NTSC_BLEED_MIN}
            max={NTSC_BLEED_MAX}
            unit="px"
            onChange={(colorBleed) => onUpdate({ colorBleed })}
          />
          <SliderField
            label="Interlace"
            value={layer.interlace}
            min={NTSC_INTERLACE_MIN}
            max={NTSC_INTERLACE_MAX}
            step={0.01}
            decimals={2}
            onChange={(interlace) => onUpdate({ interlace })}
          />
        </div>
      );
    case "modulation":
      return (
        <div className="flex flex-col gap-3">
          <SegmentedField
            label="Direction"
            value={layer.direction}
            options={[
              { value: "up", label: "Up" },
              { value: "down", label: "Down" },
              { value: "left", label: "Left" },
              { value: "right", label: "Right" },
            ]}
            onChange={(direction) => onUpdate({ direction })}
          />
          <SliderField
            label="Wave Scale"
            value={layer.waveScale}
            min={MOD_WAVE_SCALE_MIN}
            max={MOD_WAVE_SCALE_MAX}
            unit="px"
            onChange={(waveScale) => onUpdate({ waveScale })}
          />
          <SliderField
            label="FM Sensitivity"
            value={layer.fmSensitivity}
            min={MOD_FM_SENSITIVITY_MIN}
            max={MOD_FM_SENSITIVITY_MAX}
            step={0.01}
            decimals={2}
            onChange={(fmSensitivity) => onUpdate({ fmSensitivity })}
          />
          <SliderField
            label="Wave Amplitude"
            value={layer.waveAmplitude}
            min={MOD_WAVE_AMPLITUDE_MIN}
            max={MOD_WAVE_AMPLITUDE_MAX}
            step={0.5}
            decimals={1}
            unit="px"
            onChange={(waveAmplitude) => onUpdate({ waveAmplitude })}
          />
          <SliderField
            label="Signal Strength"
            value={layer.signalStrength}
            min={MOD_SIGNAL_STRENGTH_MIN}
            max={MOD_SIGNAL_STRENGTH_MAX}
            step={1}
            decimals={0}
            unit="px"
            onChange={(signalStrength) => onUpdate({ signalStrength })}
          />
          <SliderField
            label="Line Spacing"
            value={layer.lineSpacing}
            min={MOD_LINE_SPACING_MIN}
            max={MOD_LINE_SPACING_MAX}
            step={0.5}
            decimals={1}
            unit="px"
            onChange={(lineSpacing) => onUpdate({ lineSpacing })}
          />
          <SliderField
            label="Line Width"
            value={layer.lineWidth}
            min={MOD_LINE_WIDTH_MIN}
            max={MOD_LINE_WIDTH_MAX}
            step={0.05}
            decimals={2}
            unit="px"
            onChange={(lineWidth) => onUpdate({ lineWidth })}
          />
          <SliderField
            label="Contrast"
            value={layer.contrast}
            min={MOD_TONE_MIN}
            max={MOD_TONE_MAX}
            onChange={(contrast) => onUpdate({ contrast })}
          />
          <SliderField
            label="Midtones"
            value={layer.midtones}
            min={MOD_TONE_MIN}
            max={MOD_TONE_MAX}
            onChange={(midtones) => onUpdate({ midtones })}
          />
          <SliderField
            label="Highlights"
            value={layer.highlights}
            min={MOD_TONE_MIN}
            max={MOD_TONE_MAX}
            onChange={(highlights) => onUpdate({ highlights })}
          />
          <SliderField
            label="Luminance Threshold"
            value={layer.luminanceThreshold}
            min={MOD_TONE_MIN}
            max={MOD_TONE_MAX}
            onChange={(luminanceThreshold) => onUpdate({ luminanceThreshold })}
          />
          <SliderField label="Blur" value={layer.blur} min={MOD_BLUR_MIN} max={MOD_BLUR_MAX} step={0.1} decimals={1} unit="px" onChange={(blur) => onUpdate({ blur })} />
          <label className="flex items-center gap-2 text-[11px] uppercase tracking-wide opacity-70">
            <input type="checkbox" checked={layer.invert} onChange={(e) => onUpdate({ invert: e.target.checked })} />
            Invert
          </label>
          <div className="flex flex-col gap-2">
            <span className="text-[11px] uppercase tracking-wide opacity-70">Channel Signal</span>
            <ChannelSignalRow label="Red" color="#ff5c5c" enabled={layer.redChannel} onToggle={(redChannel) => onUpdate({ redChannel })} />
            <ChannelSignalRow label="Green" color="#5cff8a" enabled={layer.greenChannel} onToggle={(greenChannel) => onUpdate({ greenChannel })} />
            <ChannelSignalRow label="Blue" color="#5c9cff" enabled={layer.blueChannel} onToggle={(blueChannel) => onUpdate({ blueChannel })} />
          </div>
        </div>
      );
    case "ledScreen":
      return (
        <SliderField
          label="Cell Size"
          value={layer.cellSize}
          min={LED_CELL_SIZE_MIN}
          max={LED_CELL_SIZE_MAX}
          unit="px"
          onChange={(cellSize) => onUpdate({ cellSize })}
        />
      );
    case "grunge":
    case "vintagePrint":
    case "mixedMedia":
    case "thinPaper":
    case "wetPaper":
    case "teleshopping":
    case "paperScan":
    case "blackAndWhite":
    case "classicFilm":
      return (
        <div className="flex flex-col gap-3">
          <SliderField
            label="Grain"
            value={layer.grainAmount}
            min={GRAIN_AMOUNT_MIN}
            max={GRAIN_AMOUNT_MAX}
            step={0.01}
            decimals={2}
            onChange={(grainAmount) => onUpdate({ grainAmount })}
          />
          <SliderField
            label="Vignette"
            value={layer.vignette}
            min={VIGNETTE_MIN}
            max={VIGNETTE_MAX}
            step={0.01}
            decimals={2}
            onChange={(vignette) => onUpdate({ vignette })}
          />
        </div>
      );
    case "blobTracker":
      return (
        <div className="flex flex-col gap-3">
          <SliderField
            label="Density"
            value={layer.density}
            min={BLOB_DENSITY_MIN}
            max={BLOB_DENSITY_MAX}
            step={1}
            onChange={(density) => onUpdate({ density })}
          />
          <SliderField
            label="Sensitivity"
            value={layer.sensitivity}
            min={BLOB_SENSITIVITY_MIN}
            max={BLOB_SENSITIVITY_MAX}
            step={0.01}
            decimals={2}
            onChange={(sensitivity) => onUpdate({ sensitivity })}
          />
          <SegmentedField
            label="Box Color"
            value={layer.colorMode}
            options={[
              { value: "single", label: "Single Color" },
              { value: "random", label: "Random Per Box" },
            ]}
            onChange={(colorMode) => onUpdate({ colorMode })}
          />
          {layer.colorMode === "single" && (
            <label className="flex items-center justify-between text-[11px] uppercase tracking-wide opacity-70">
              <span>Color</span>
              <ColorPickerButton value={layer.color} onChange={(hex) => onUpdate({ color: hex })} label="Color" />
            </label>
          )}
        </div>
      );
    case "motionTrails":
      return (
        <div className="flex flex-col gap-3">
          <SliderField label="Threshold" value={layer.threshold} min={GLOW_THRESHOLD_MIN} max={GLOW_THRESHOLD_MAX} step={0.01} decimals={2} onChange={(threshold) => onUpdate({ threshold })} />
          <SliderField label="Knee" value={layer.knee} min={TRAILS_KNEE_MIN} max={TRAILS_KNEE_MAX} step={0.01} decimals={2} onChange={(knee) => onUpdate({ knee })} />
          <SliderField
            label="Pre-Blur"
            value={layer.preBlur}
            min={TRAILS_PREBLUR_MIN}
            max={TRAILS_PREBLUR_MAX}
            step={0.5}
            decimals={1}
            onChange={(preBlur) => onUpdate({ preBlur })}
          />
          <SliderField
            label="Dimming"
            value={layer.dimming}
            min={TRAILS_DIMMING_MIN}
            max={TRAILS_DIMMING_MAX}
            step={0.01}
            decimals={2}
            onChange={(dimming) => onUpdate({ dimming })}
          />
          <XYPad
            label="Direction"
            x={layer.directionX}
            y={layer.directionY}
            xRange={[-5, 5]}
            yRange={[-5, 5]}
            onChange={(directionX, directionY) => onUpdate({ directionX, directionY })}
          />
          <SliderField label="Shake" value={layer.shake} min={TRAILS_SHAKE_MIN} max={TRAILS_SHAKE_MAX} step={0.01} decimals={2} onChange={(shake) => onUpdate({ shake })} />
          <SliderField
            label="Shake Speed"
            value={layer.shakeSpeed}
            min={TRAILS_SHAKE_SPEED_MIN}
            max={TRAILS_SHAKE_SPEED_MAX}
            step={0.1}
            decimals={2}
            onChange={(shakeSpeed) => onUpdate({ shakeSpeed })}
          />
          <SliderField
            label="Intensity"
            value={layer.intensity}
            min={TRAILS_INTENSITY_MIN}
            max={TRAILS_INTENSITY_MAX}
            step={0.05}
            decimals={2}
            onChange={(intensity) => onUpdate({ intensity })}
          />
          <SliderField
            label="Source Dim"
            value={layer.sourceDim}
            min={TRAILS_SOURCE_DIM_MIN}
            max={TRAILS_SOURCE_DIM_MAX}
            step={0.01}
            decimals={2}
            onChange={(sourceDim) => onUpdate({ sourceDim })}
          />
        </div>
      );
    case "curves":
      return <CurvesFields layer={layer} onUpdate={onUpdate} />;
    case "levels":
      return (
        <div className="flex flex-col gap-3">
          <SliderField
            label="Input Black"
            value={layer.inputBlack}
            min={LEVELS_POINT_MIN}
            max={LEVELS_POINT_MAX}
            step={1}
            decimals={0}
            onChange={(inputBlack) => onUpdate({ inputBlack })}
          />
          <SliderField
            label="Input White"
            value={layer.inputWhite}
            min={LEVELS_POINT_MIN}
            max={LEVELS_POINT_MAX}
            step={1}
            decimals={0}
            onChange={(inputWhite) => onUpdate({ inputWhite })}
          />
          <SliderField label="Gamma" value={layer.gamma} min={LEVELS_GAMMA_MIN} max={LEVELS_GAMMA_MAX} step={0.01} decimals={2} onChange={(gamma) => onUpdate({ gamma })} />
          <SliderField
            label="Output Black"
            value={layer.outputBlack}
            min={LEVELS_POINT_MIN}
            max={LEVELS_POINT_MAX}
            step={1}
            decimals={0}
            onChange={(outputBlack) => onUpdate({ outputBlack })}
          />
          <SliderField
            label="Output White"
            value={layer.outputWhite}
            min={LEVELS_POINT_MIN}
            max={LEVELS_POINT_MAX}
            step={1}
            decimals={0}
            onChange={(outputWhite) => onUpdate({ outputWhite })}
          />
        </div>
      );
    case "exposure":
      return (
        <div className="flex flex-col gap-3">
          <SliderField
            label="Exposure"
            value={layer.exposure}
            min={EXPOSURE_STOPS_MIN}
            max={EXPOSURE_STOPS_MAX}
            step={0.05}
            decimals={2}
            onChange={(exposure) => onUpdate({ exposure })}
          />
          <SliderField
            label="Offset"
            value={layer.offset}
            min={EXPOSURE_OFFSET_MIN}
            max={EXPOSURE_OFFSET_MAX}
            step={0.001}
            decimals={3}
            onChange={(offset) => onUpdate({ offset })}
          />
          <SliderField
            label="Gamma Correction"
            value={layer.gammaCorrection}
            min={EXPOSURE_GAMMA_MIN}
            max={EXPOSURE_GAMMA_MAX}
            step={0.01}
            decimals={2}
            onChange={(gammaCorrection) => onUpdate({ gammaCorrection })}
          />
        </div>
      );
    case "contrast":
      return (
        <div className="flex flex-col gap-3">
          <SliderField
            label="Brightness"
            value={layer.brightness}
            min={BRIGHTNESS_MIN}
            max={BRIGHTNESS_MAX}
            step={1}
            decimals={0}
            onChange={(brightness) => onUpdate({ brightness })}
          />
          <SliderField label="Contrast" value={layer.contrast} min={CONTRAST_MIN} max={CONTRAST_MAX} step={1} decimals={0} onChange={(contrast) => onUpdate({ contrast })} />
        </div>
      );
    case "whiteBalance":
      return (
        <div className="flex flex-col gap-3">
          <SliderField
            label="Temperature"
            value={layer.temperature}
            min={TEMPERATURE_MIN}
            max={TEMPERATURE_MAX}
            step={50}
            decimals={0}
            onChange={(temperature) => onUpdate({ temperature })}
          />
          <SliderField label="Tint" value={layer.tint} min={TINT_MIN} max={TINT_MAX} step={1} decimals={0} onChange={(tint) => onUpdate({ tint })} />
        </div>
      );
    case "hueSaturation":
      return (
        <div className="flex flex-col gap-3">
          <SliderField label="Hue" value={layer.hue} min={HUE_MIN} max={HUE_MAX} step={1} decimals={0} onChange={(hue) => onUpdate({ hue })} />
          <SliderField
            label="Saturation"
            value={layer.saturation}
            min={SATURATION_MIN}
            max={SATURATION_MAX}
            step={1}
            decimals={0}
            onChange={(saturation) => onUpdate({ saturation })}
          />
          <SliderField
            label="Lightness"
            value={layer.lightness}
            min={LIGHTNESS_MIN}
            max={LIGHTNESS_MAX}
            step={1}
            decimals={0}
            onChange={(lightness) => onUpdate({ lightness })}
          />
        </div>
      );
    case "colorBalance":
      return <ColorBalanceFields layer={layer} onUpdate={onUpdate} />;
    case "gradientMap":
      return (
        <div className="flex flex-col gap-3">
          <GradientStopEditor label="Gradient" stops={layer.stops} onChange={(stops) => onUpdate({ stops })} />
        </div>
      );
    case "duotone":
      return (
        <div className="flex flex-col gap-3">
          <label className="flex items-center justify-between text-[11px] uppercase tracking-wide opacity-70">
            <span>Shadow Color</span>
            <ColorPickerButton value={layer.shadowColor} onChange={(hex) => onUpdate({ shadowColor: hex })} label="Shadow Color" />
          </label>
          <label className="flex items-center justify-between text-[11px] uppercase tracking-wide opacity-70">
            <span>Highlight Color</span>
            <ColorPickerButton value={layer.highlightColor} onChange={(hex) => onUpdate({ highlightColor: hex })} label="Highlight Color" />
          </label>
        </div>
      );
    case "monochrome":
      return (
        <div className="flex flex-col gap-3">
          <SliderField
            label="Red Weight"
            value={layer.redWeight}
            min={MONO_WEIGHT_MIN}
            max={MONO_WEIGHT_MAX}
            step={1}
            decimals={0}
            onChange={(redWeight) => onUpdate({ redWeight })}
          />
          <SliderField
            label="Green Weight"
            value={layer.greenWeight}
            min={MONO_WEIGHT_MIN}
            max={MONO_WEIGHT_MAX}
            step={1}
            decimals={0}
            onChange={(greenWeight) => onUpdate({ greenWeight })}
          />
          <SliderField
            label="Blue Weight"
            value={layer.blueWeight}
            min={MONO_WEIGHT_MIN}
            max={MONO_WEIGHT_MAX}
            step={1}
            decimals={0}
            onChange={(blueWeight) => onUpdate({ blueWeight })}
          />
          <label className="flex items-center justify-between text-[11px] uppercase tracking-wide opacity-70">
            <span>Tint</span>
            <ColorPickerButton value={layer.tint} onChange={(hex) => onUpdate({ tint: hex })} label="Tint" />
          </label>
        </div>
      );
    case "thermal":
      return (
        <div className="flex flex-col gap-3">
          <SliderField
            label="Black Point"
            value={layer.blackPoint}
            min={THERMAL_POINT_MIN}
            max={THERMAL_POINT_MAX}
            step={0.01}
            decimals={2}
            onChange={(blackPoint) => onUpdate({ blackPoint })}
          />
          <SliderField
            label="White Point"
            value={layer.whitePoint}
            min={THERMAL_POINT_MIN}
            max={THERMAL_POINT_MAX}
            step={0.01}
            decimals={2}
            onChange={(whitePoint) => onUpdate({ whitePoint })}
          />
        </div>
      );
    case "colorMatrix":
      return (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wide opacity-45">Matrix</span>
            <InfoTooltip text="Each output channel = its row's weighted mix of input Red/Green/Blue, plus its offset." label="About Matrix" />
          </div>
          {(["m00", "m01", "m02"] as const).map((key) => (
            <SliderField key={key} label={key.toUpperCase()} value={layer[key]} min={MATRIX_CELL_MIN} max={MATRIX_CELL_MAX} step={0.01} decimals={2} onChange={(v) => onUpdate({ [key]: v })} />
          ))}
          <SliderField label="Offset R" value={layer.offsetR} min={MATRIX_OFFSET_MIN} max={MATRIX_OFFSET_MAX} step={0.01} decimals={2} onChange={(offsetR) => onUpdate({ offsetR })} />
          {(["m10", "m11", "m12"] as const).map((key) => (
            <SliderField key={key} label={key.toUpperCase()} value={layer[key]} min={MATRIX_CELL_MIN} max={MATRIX_CELL_MAX} step={0.01} decimals={2} onChange={(v) => onUpdate({ [key]: v })} />
          ))}
          <SliderField label="Offset G" value={layer.offsetG} min={MATRIX_OFFSET_MIN} max={MATRIX_OFFSET_MAX} step={0.01} decimals={2} onChange={(offsetG) => onUpdate({ offsetG })} />
          {(["m20", "m21", "m22"] as const).map((key) => (
            <SliderField key={key} label={key.toUpperCase()} value={layer[key]} min={MATRIX_CELL_MIN} max={MATRIX_CELL_MAX} step={0.01} decimals={2} onChange={(v) => onUpdate({ [key]: v })} />
          ))}
          <SliderField label="Offset B" value={layer.offsetB} min={MATRIX_OFFSET_MIN} max={MATRIX_OFFSET_MAX} step={0.01} decimals={2} onChange={(offsetB) => onUpdate({ offsetB })} />
        </div>
      );
    case "rgbGain":
      return (
        <div className="flex flex-col gap-3">
          <SliderField label="Red Gain" value={layer.gainR} min={GAIN_MIN} max={GAIN_MAX} step={0.01} decimals={2} onChange={(gainR) => onUpdate({ gainR })} />
          <SliderField label="Green Gain" value={layer.gainG} min={GAIN_MIN} max={GAIN_MAX} step={0.01} decimals={2} onChange={(gainG) => onUpdate({ gainG })} />
          <SliderField label="Blue Gain" value={layer.gainB} min={GAIN_MIN} max={GAIN_MAX} step={0.01} decimals={2} onChange={(gainB) => onUpdate({ gainB })} />
        </div>
      );
    case "hueCurves":
      return <HueCurvesFields layer={layer} onUpdate={onUpdate} />;
    case "colorGrading":
      return <ColorGradingFields layer={layer} onUpdate={onUpdate} />;
    case "circularBlur":
      return (
        <div className="flex flex-col gap-3">
          <SliderField
            label="Radius"
            value={layer.radius}
            min={CIRCULAR_BLUR_RADIUS_MIN}
            max={CIRCULAR_BLUR_RADIUS_MAX}
            step={1}
            decimals={0}
            onChange={(radius) => onUpdate({ radius })}
          />
        </div>
      );
    case "radialBlur":
      return (
        <div className="flex flex-col gap-3">
          <CenterPointEditor
            label="Center"
            loadedImg={loadedImg}
            previewLayers={[layer]}
            centerX={layer.centerX}
            centerY={layer.centerY}
            onChange={(centerX, centerY) => onUpdate({ centerX, centerY })}
          />
          <SliderField label="Spin Angle" value={layer.angle} min={SPIN_ANGLE_MIN} max={SPIN_ANGLE_MAX} step={0.5} decimals={1} onChange={(angle) => onUpdate({ angle })} />
        </div>
      );
    case "zoomBlur":
      return (
        <div className="flex flex-col gap-3">
          <CenterPointEditor
            label="Center"
            loadedImg={loadedImg}
            previewLayers={[layer]}
            centerX={layer.centerX}
            centerY={layer.centerY}
            onChange={(centerX, centerY) => onUpdate({ centerX, centerY })}
          />
          <SliderField
            label="Strength"
            value={layer.strength}
            min={ZOOM_STRENGTH_MIN}
            max={ZOOM_STRENGTH_MAX}
            step={1}
            decimals={0}
            onChange={(strength) => onUpdate({ strength })}
          />
        </div>
      );
    case "blurSharp":
      return (
        <div className="flex flex-col gap-3">
          <SliderField
            label="Blur / Sharpen"
            value={layer.amount}
            min={BLUR_SHARP_AMOUNT_MIN}
            max={BLUR_SHARP_AMOUNT_MAX}
            step={1}
            decimals={0}
            hint="Negative sharpens (unsharp mask), positive blurs (gaussian)."
            onChange={(amount) => onUpdate({ amount })}
          />
        </div>
      );
    case "depthOfField":
      return (
        <div className="flex flex-col gap-3">
          <SegmentedField
            label="Focus Shape"
            value={layer.shape}
            options={[
              { value: "iris", label: "Iris" },
              { value: "tiltShift", label: "Tilt-Shift" },
            ]}
            onChange={(shape) => onUpdate({ shape })}
          />
          {layer.shape === "iris" ? (
            <CircleRegionEditor
              label="Focus Region"
              loadedImg={loadedImg}
              previewLayers={[layer]}
              centerX={layer.centerX}
              centerY={layer.centerY}
              radiusX={layer.focusSize}
              radiusY={layer.focusSize}
              showRotation={false}
              onChange={(patch) => onUpdate({ centerX: patch.centerX ?? layer.centerX, centerY: patch.centerY ?? layer.centerY, focusSize: patch.radiusX ?? patch.radiusY ?? layer.focusSize })}
            />
          ) : (
            <CenterPointEditor
              label="Center"
              loadedImg={loadedImg}
              previewLayers={[layer]}
              centerX={layer.centerX}
              centerY={layer.centerY}
              onChange={(centerX, centerY) => onUpdate({ centerX, centerY })}
            />
          )}
          {layer.shape === "iris" && (
            <SliderField
              label="Focus Size"
              value={layer.focusSize}
              min={DOF_FOCUS_SIZE_MIN}
              max={DOF_FOCUS_SIZE_MAX}
              step={0.01}
              decimals={2}
              onChange={(focusSize) => onUpdate({ focusSize })}
            />
          )}
          <SliderField label="Feather" value={layer.feather} min={DOF_FEATHER_MIN} max={DOF_FEATHER_MAX} step={0.01} decimals={2} onChange={(feather) => onUpdate({ feather })} />
          {layer.shape === "tiltShift" && <DirectionPad label="Band Angle" angle={layer.angle} onChange={(angle) => onUpdate({ angle })} />}
          <SliderField
            label="Blur Radius"
            value={layer.blurRadius}
            min={DOF_BLUR_RADIUS_MIN}
            max={DOF_BLUR_RADIUS_MAX}
            step={1}
            decimals={0}
            onChange={(blurRadius) => onUpdate({ blurRadius })}
          />
        </div>
      );
    case "swirl":
      return (
        <div className="flex flex-col gap-3">
          <CircleRegionEditor
            label="Region"
            loadedImg={loadedImg}
            previewLayers={[layer]}
            centerX={layer.centerX}
            centerY={layer.centerY}
            radiusX={layer.radius / DISTORT_RADIUS_MAX}
            radiusY={layer.radius / DISTORT_RADIUS_MAX}
            showRotation={false}
            onChange={(patch) =>
              onUpdate({
                centerX: patch.centerX ?? layer.centerX,
                centerY: patch.centerY ?? layer.centerY,
                radius: (patch.radiusX ?? patch.radiusY ?? layer.radius / DISTORT_RADIUS_MAX) * DISTORT_RADIUS_MAX,
              })
            }
          />
          <SliderField
            label="Radius"
            value={layer.radius}
            min={DISTORT_RADIUS_MIN}
            max={DISTORT_RADIUS_MAX}
            step={1}
            decimals={0}
            onChange={(radius) => onUpdate({ radius })}
          />
          <SliderField label="Angle" value={layer.angle} min={SWIRL_ANGLE_MIN} max={SWIRL_ANGLE_MAX} step={1} decimals={0} onChange={(angle) => onUpdate({ angle })} />
        </div>
      );
    case "pinch":
      return (
        <div className="flex flex-col gap-3">
          <CircleRegionEditor
            label="Region"
            loadedImg={loadedImg}
            previewLayers={[layer]}
            centerX={layer.centerX}
            centerY={layer.centerY}
            radiusX={layer.radius / DISTORT_RADIUS_MAX}
            radiusY={layer.radius / DISTORT_RADIUS_MAX}
            showRotation={false}
            onChange={(patch) =>
              onUpdate({
                centerX: patch.centerX ?? layer.centerX,
                centerY: patch.centerY ?? layer.centerY,
                radius: (patch.radiusX ?? patch.radiusY ?? layer.radius / DISTORT_RADIUS_MAX) * DISTORT_RADIUS_MAX,
              })
            }
          />
          <SliderField
            label="Radius"
            value={layer.radius}
            min={DISTORT_RADIUS_MIN}
            max={DISTORT_RADIUS_MAX}
            step={1}
            decimals={0}
            onChange={(radius) => onUpdate({ radius })}
          />
          <SliderField
            label="Strength"
            value={layer.strength}
            min={PINCH_STRENGTH_MIN}
            max={PINCH_STRENGTH_MAX}
            step={1}
            decimals={0}
            hint="Positive pinches inward, negative bulges outward."
            onChange={(strength) => onUpdate({ strength })}
          />
        </div>
      );
    case "perspective":
      return (
        <div className="flex flex-col gap-3">
          <QuadCornerEditor label="Corners" loadedImg={loadedImg} previewLayers={[layer]} corners={layer.corners} onChange={(corners) => onUpdate({ corners })} />
        </div>
      );
    case "ripple":
      return (
        <div className="flex flex-col gap-3">
          <CenterPointEditor
            label="Center"
            loadedImg={loadedImg}
            previewLayers={[layer]}
            centerX={layer.centerX}
            centerY={layer.centerY}
            onChange={(centerX, centerY) => onUpdate({ centerX, centerY })}
          />
          <SliderField
            label="Amplitude"
            value={layer.amplitude}
            min={RIPPLE_AMPLITUDE_MIN}
            max={RIPPLE_AMPLITUDE_MAX}
            step={1}
            decimals={0}
            onChange={(amplitude) => onUpdate({ amplitude })}
          />
          <SliderField
            label="Wavelength"
            value={layer.wavelength}
            min={RIPPLE_WAVELENGTH_MIN}
            max={RIPPLE_WAVELENGTH_MAX}
            step={1}
            decimals={0}
            onChange={(wavelength) => onUpdate({ wavelength })}
          />
        </div>
      );
    case "emboss":
      return (
        <div className="flex flex-col gap-3">
          <DirectionPad label="Light Angle" angle={layer.angle} onChange={(angle) => onUpdate({ angle })} />
          <SliderField
            label="Height"
            value={layer.height}
            min={EMBOSS_HEIGHT_MIN}
            max={EMBOSS_HEIGHT_MAX}
            step={0.5}
            decimals={1}
            onChange={(height) => onUpdate({ height })}
          />
          <SliderField
            label="Amount"
            value={layer.amount}
            min={EMBOSS_AMOUNT_MIN}
            max={EMBOSS_AMOUNT_MAX}
            step={1}
            decimals={0}
            onChange={(amount) => onUpdate({ amount })}
          />
        </div>
      );
    case "polarCoords":
      return (
        <div className="flex flex-col gap-3">
          <SegmentedField
            label="Mode"
            value={layer.mode}
            options={[
              { value: "rectToPolar", label: "Rect → Polar" },
              { value: "polarToRect", label: "Polar → Rect" },
            ]}
            onChange={(mode) => onUpdate({ mode })}
          />
          <CenterPointEditor
            label="Center"
            loadedImg={loadedImg}
            previewLayers={[layer]}
            centerX={layer.centerX}
            centerY={layer.centerY}
            onChange={(centerX, centerY) => onUpdate({ centerX, centerY })}
          />
          <SliderField
            label="Seam Rotation"
            value={layer.rotation}
            min={POLAR_ROTATION_MIN}
            max={POLAR_ROTATION_MAX}
            step={1}
            decimals={0}
            onChange={(rotation) => onUpdate({ rotation })}
          />
        </div>
      );
    case "elasticGrid":
      return (
        <div className="flex flex-col gap-3">
          <MeshWarpEditor label="Mesh" loadedImg={loadedImg} previewLayers={[layer]} points={layer.points} onChange={(points) => onUpdate({ points })} />
        </div>
      );
    case "vignette":
      return (
        <div className="flex flex-col gap-3">
          <CircleRegionEditor
            label="Region"
            loadedImg={loadedImg}
            previewLayers={[layer]}
            centerX={layer.centerX}
            centerY={layer.centerY}
            radiusX={layer.radiusX}
            radiusY={layer.radiusY}
            rotation={layer.rotation}
            onChange={(patch) =>
              onUpdate({
                centerX: patch.centerX ?? layer.centerX,
                centerY: patch.centerY ?? layer.centerY,
                radiusX: patch.radiusX ?? layer.radiusX,
                radiusY: patch.radiusY ?? layer.radiusY,
                rotation: patch.rotation ?? layer.rotation,
              })
            }
          />
          <SliderField label="Feather" value={layer.feather} min={VIGNETTE_FEATHER_MIN} max={VIGNETTE_FEATHER_MAX} step={0.01} decimals={2} onChange={(feather) => onUpdate({ feather })} />
          <SliderField label="Amount" value={layer.amount} min={VIGNETTE_AMOUNT_MIN} max={VIGNETTE_AMOUNT_MAX} step={0.01} decimals={2} onChange={(amount) => onUpdate({ amount })} />
        </div>
      );
    case "threshold":
      return (
        <div className="flex flex-col gap-3">
          <SliderField
            label="Threshold"
            value={layer.threshold}
            min={THRESHOLD_VALUE_MIN}
            max={THRESHOLD_VALUE_MAX}
            step={0.01}
            decimals={2}
            onChange={(threshold) => onUpdate({ threshold })}
          />
          <SliderField
            label="Softness"
            value={layer.softness}
            min={THRESHOLD_SOFTNESS_MIN}
            max={THRESHOLD_SOFTNESS_MAX}
            step={0.01}
            decimals={2}
            onChange={(softness) => onUpdate({ softness })}
          />
        </div>
      );
    case "reededGlass":
      return (
        <div className="flex flex-col gap-3">
          <DirectionPad label="Rib Angle" angle={layer.angle} onChange={(angle) => onUpdate({ angle })} />
          <SliderField
            label="Rib Width"
            value={layer.ribWidth}
            min={REEDED_GLASS_RIB_WIDTH_MIN}
            max={REEDED_GLASS_RIB_WIDTH_MAX}
            step={1}
            decimals={0}
            onChange={(ribWidth) => onUpdate({ ribWidth })}
          />
          <SliderField
            label="Strength"
            value={layer.strength}
            min={REEDED_GLASS_STRENGTH_MIN}
            max={REEDED_GLASS_STRENGTH_MAX}
            step={0.5}
            decimals={1}
            onChange={(strength) => onUpdate({ strength })}
          />
        </div>
      );
    case "cubify":
      return (
        <div className="flex flex-col gap-3">
          <SliderField
            label="Cell Size"
            value={layer.cellSize}
            min={CUBIFY_CELL_SIZE_MIN}
            max={CUBIFY_CELL_SIZE_MAX}
            step={1}
            decimals={0}
            onChange={(cellSize) => onUpdate({ cellSize })}
          />
          <SliderField label="Jitter" value={layer.jitter} min={CUBIFY_JITTER_MIN} max={CUBIFY_JITTER_MAX} step={0.01} decimals={2} onChange={(jitter) => onUpdate({ jitter })} />
        </div>
      );
    case "transform":
      return (
        <div className="flex flex-col gap-3">
          <TransformBoxEditor
            label="Box"
            loadedImg={loadedImg}
            previewLayers={[layer]}
            translateX={layer.translateX}
            translateY={layer.translateY}
            scaleX={layer.scaleX}
            scaleY={layer.scaleY}
            rotation={layer.rotation}
            onChange={(patch) =>
              onUpdate({
                translateX: patch.translateX ?? layer.translateX,
                translateY: patch.translateY ?? layer.translateY,
                scaleX: patch.scaleX ?? layer.scaleX,
                scaleY: patch.scaleY ?? layer.scaleY,
                rotation: patch.rotation ?? layer.rotation,
              })
            }
          />
          <SliderField label="Skew X" value={layer.skewX} min={TRANSFORM_SKEW_MIN} max={TRANSFORM_SKEW_MAX} step={1} decimals={0} onChange={(skewX) => onUpdate({ skewX })} />
          <SliderField label="Skew Y" value={layer.skewY} min={TRANSFORM_SKEW_MIN} max={TRANSFORM_SKEW_MAX} step={1} decimals={0} onChange={(skewY) => onUpdate({ skewY })} />
        </div>
      );
    case "risograph":
      return (
        <div className="flex flex-col gap-3">
          <label className="flex items-center justify-between text-[11px] uppercase tracking-wide opacity-70">
            <span>Ink Color A</span>
            <ColorPickerButton value={layer.inkColorA} onChange={(hex) => onUpdate({ inkColorA: hex })} label="Ink Color A" />
          </label>
          <label className="flex items-center justify-between text-[11px] uppercase tracking-wide opacity-70">
            <span>Ink Color B</span>
            <ColorPickerButton value={layer.inkColorB} onChange={(hex) => onUpdate({ inkColorB: hex })} label="Ink Color B" />
          </label>
          <SliderField
            label="Split Point"
            value={layer.splitPoint}
            min={RISOGRAPH_SPLIT_MIN}
            max={RISOGRAPH_SPLIT_MAX}
            step={0.01}
            decimals={2}
            onChange={(splitPoint) => onUpdate({ splitPoint })}
          />
          <SliderField label="Overlap" value={layer.overlap} min={RISOGRAPH_OVERLAP_MIN} max={RISOGRAPH_OVERLAP_MAX} step={0.01} decimals={2} onChange={(overlap) => onUpdate({ overlap })} />
          <SliderField
            label="Dot Pitch"
            value={layer.dotPitch}
            min={RISOGRAPH_DOT_PITCH_MIN}
            max={RISOGRAPH_DOT_PITCH_MAX}
            step={1}
            decimals={0}
            onChange={(dotPitch) => onUpdate({ dotPitch })}
          />
          <SliderField
            label="Misregister"
            value={layer.misregister}
            min={RISOGRAPH_MISREGISTER_MIN}
            max={RISOGRAPH_MISREGISTER_MAX}
            step={0.1}
            decimals={1}
            onChange={(misregister) => onUpdate({ misregister })}
          />
          <SliderField label="Grain" value={layer.grain} min={GRAIN_AMOUNT_MIN} max={GRAIN_AMOUNT_MAX} step={0.01} decimals={2} onChange={(grain) => onUpdate({ grain })} />
        </div>
      );
    case "stripe":
      return (
        <div className="flex flex-col gap-3">
          <SliderField
            label="Band Width"
            value={layer.bandWidth}
            min={STRIPE_BAND_WIDTH_MIN}
            max={STRIPE_BAND_WIDTH_MAX}
            step={1}
            decimals={0}
            onChange={(bandWidth) => onUpdate({ bandWidth })}
          />
          <SliderField
            label="Intensity"
            value={layer.intensity}
            min={STRIPE_INTENSITY_MIN}
            max={STRIPE_INTENSITY_MAX}
            step={0.01}
            decimals={2}
            onChange={(intensity) => onUpdate({ intensity })}
          />
          <SliderField
            label="Irregularity"
            value={layer.irregularity}
            min={STRIPE_IRREGULARITY_MIN}
            max={STRIPE_IRREGULARITY_MAX}
            step={0.01}
            decimals={2}
            onChange={(irregularity) => onUpdate({ irregularity })}
          />
        </div>
      );
    case "noise":
      return (
        <div className="flex flex-col gap-3">
          <SliderField label="Amount" value={layer.amount} min={NOISE_AMOUNT_MIN} max={NOISE_AMOUNT_MAX} step={0.01} decimals={2} onChange={(amount) => onUpdate({ amount })} />
          <label className="flex items-center gap-2 text-[11px] uppercase tracking-wide opacity-70">
            <input type="checkbox" checked={layer.colored} onChange={(e) => onUpdate({ colored: e.target.checked })} />
            Colored
          </label>
        </div>
      );
    case "frameDrop":
      return (
        <div className="flex flex-col gap-3">
          <SliderField
            label="Block Size"
            value={layer.blockSize}
            min={FRAME_DROP_BLOCK_SIZE_MIN}
            max={FRAME_DROP_BLOCK_SIZE_MAX}
            step={1}
            decimals={0}
            onChange={(blockSize) => onUpdate({ blockSize })}
          />
          <SliderField
            label="Intensity"
            value={layer.intensity}
            min={FRAME_DROP_INTENSITY_MIN}
            max={FRAME_DROP_INTENSITY_MAX}
            step={0.01}
            decimals={2}
            onChange={(intensity) => onUpdate({ intensity })}
          />
          <SliderField
            label="Color Shift"
            value={layer.colorShift}
            min={FRAME_DROP_COLOR_SHIFT_MIN}
            max={FRAME_DROP_COLOR_SHIFT_MAX}
            step={0.5}
            decimals={1}
            onChange={(colorShift) => onUpdate({ colorShift })}
          />
        </div>
      );
    case "crtScreen":
      return (
        <div className="flex flex-col gap-3">
          <SliderField
            label="Curvature"
            value={layer.curvature}
            min={CRT_CURVATURE_MIN}
            max={CRT_CURVATURE_MAX}
            step={0.01}
            decimals={2}
            onChange={(curvature) => onUpdate({ curvature })}
          />
          <SliderField
            label="Cell Size"
            value={layer.cellSize}
            min={CRT_CELL_SIZE_MIN}
            max={CRT_CELL_SIZE_MAX}
            step={1}
            decimals={0}
            onChange={(cellSize) => onUpdate({ cellSize })}
          />
          <SliderField
            label="Phosphor Intensity"
            value={layer.phosphorIntensity}
            min={CRT_PHOSPHOR_MIN}
            max={CRT_PHOSPHOR_MAX}
            step={0.01}
            decimals={2}
            onChange={(phosphorIntensity) => onUpdate({ phosphorIntensity })}
          />
          <SliderField
            label="Scanline Intensity"
            value={layer.scanlineIntensity}
            min={CRT_SCANLINE_MIN}
            max={CRT_SCANLINE_MAX}
            step={0.01}
            decimals={2}
            onChange={(scanlineIntensity) => onUpdate({ scanlineIntensity })}
          />
        </div>
      );
    case "inkBleed":
      return (
        <div className="flex flex-col gap-3">
          <SliderField
            label="Threshold"
            value={layer.threshold}
            min={INK_BLEED_THRESHOLD_MIN}
            max={INK_BLEED_THRESHOLD_MAX}
            step={0.01}
            decimals={2}
            onChange={(threshold) => onUpdate({ threshold })}
          />
          <SliderField
            label="Amount"
            value={layer.amount}
            min={INK_BLEED_AMOUNT_MIN}
            max={INK_BLEED_AMOUNT_MAX}
            step={0.1}
            decimals={1}
            onChange={(amount) => onUpdate({ amount })}
          />
          <SliderField
            label="Softness"
            value={layer.softness}
            min={INK_BLEED_SOFTNESS_MIN}
            max={INK_BLEED_SOFTNESS_MAX}
            step={0.01}
            decimals={2}
            onChange={(softness) => onUpdate({ softness })}
          />
        </div>
      );
    case "vintageFilm":
      return (
        <div className="flex flex-col gap-3">
          <SliderField label="Grain" value={layer.grainAmount} min={GRAIN_AMOUNT_MIN} max={GRAIN_AMOUNT_MAX} step={0.01} decimals={2} onChange={(grainAmount) => onUpdate({ grainAmount })} />
          <SliderField label="Vignette" value={layer.vignette} min={VIGNETTE_MIN} max={VIGNETTE_MAX} step={0.01} decimals={2} onChange={(vignette) => onUpdate({ vignette })} />
          <SliderField
            label="Scratch Density"
            value={layer.scratchDensity}
            min={VINTAGE_FILM_SCRATCH_DENSITY_MIN}
            max={VINTAGE_FILM_SCRATCH_DENSITY_MAX}
            step={0.01}
            decimals={2}
            onChange={(scratchDensity) => onUpdate({ scratchDensity })}
          />
          <SliderField
            label="Scratch Intensity"
            value={layer.scratchIntensity}
            min={VINTAGE_FILM_SCRATCH_INTENSITY_MIN}
            max={VINTAGE_FILM_SCRATCH_INTENSITY_MAX}
            step={0.01}
            decimals={2}
            onChange={(scratchIntensity) => onUpdate({ scratchIntensity })}
          />
        </div>
      );
    case "displacement":
      return (
        <div className="flex flex-col gap-3">
          <SliderField
            label="Amount"
            value={layer.amount}
            min={DISPLACEMENT_AMOUNT_MIN}
            max={DISPLACEMENT_AMOUNT_MAX}
            step={0.1}
            decimals={1}
            onChange={(amount) => onUpdate({ amount })}
          />
          <SliderField
            label="Scale"
            value={layer.scale}
            min={DISPLACEMENT_SCALE_MIN}
            max={DISPLACEMENT_SCALE_MAX}
            step={0.5}
            decimals={1}
            onChange={(scale) => onUpdate({ scale })}
          />
        </div>
      );
    case "filmGrain":
      return (
        <div className="flex flex-col gap-3">
          <SliderField
            label="Amount"
            value={layer.amount}
            min={FILM_GRAIN_AMOUNT_MIN}
            max={FILM_GRAIN_AMOUNT_MAX}
            step={0.01}
            decimals={2}
            onChange={(amount) => onUpdate({ amount })}
          />
          <SliderField label="Size" value={layer.size} min={FILM_GRAIN_SIZE_MIN} max={FILM_GRAIN_SIZE_MAX} step={0.5} decimals={1} onChange={(size) => onUpdate({ size })} />
        </div>
      );
    case "halation":
      return (
        <div className="flex flex-col gap-3">
          <SliderField
            label="Threshold"
            value={layer.threshold}
            min={HALATION_THRESHOLD_MIN}
            max={HALATION_THRESHOLD_MAX}
            step={0.01}
            decimals={2}
            onChange={(threshold) => onUpdate({ threshold })}
          />
          <SliderField
            label="Radius"
            value={layer.radius}
            min={HALATION_RADIUS_MIN}
            max={HALATION_RADIUS_MAX}
            step={1}
            decimals={0}
            onChange={(radius) => onUpdate({ radius })}
          />
          <label className="flex items-center justify-between text-[11px] uppercase tracking-wide opacity-70">
            <span>Tint Color</span>
            <ColorPickerButton value={layer.tintColor} onChange={(hex) => onUpdate({ tintColor: hex })} label="Tint Color" />
          </label>
          <SliderField
            label="Intensity"
            value={layer.intensity}
            min={HALATION_INTENSITY_MIN}
            max={HALATION_INTENSITY_MAX}
            step={0.05}
            decimals={2}
            onChange={(intensity) => onUpdate({ intensity })}
          />
        </div>
      );
  }
}
