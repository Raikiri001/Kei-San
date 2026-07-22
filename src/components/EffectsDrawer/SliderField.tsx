interface SliderFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  /** Decimal places shown in the value readout — e.g. 2 for a 0..1 ratio-style param. */
  decimals?: number;
  onChange: (value: number) => void;
}

/** A labeled full-width range slider (thin flat track, small tick thumb — see the
 * `.hud-slider` CSS) with a live numeric readout — the descriptive, spacious
 * alternative to the stepper+textbox pattern for continuous/bounded effect params. */
export function SliderField({ label, value, min, max, step = 1, unit = "", decimals = 0, onChange }: SliderFieldProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center justify-between text-[11px] uppercase tracking-wide opacity-70">
        <span>{label}</span>
        <span className="tabular-nums opacity-100">
          {value.toFixed(decimals)}
          {unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="hud-slider"
        aria-label={label}
      />
    </label>
  );
}
