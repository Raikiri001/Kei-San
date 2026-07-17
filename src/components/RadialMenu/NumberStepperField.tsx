import { numberInputClass } from "@/components/RadialMenu/inputStyles";
import { Stepper } from "@/components/RadialMenu/Stepper";
import type { useDraftNumber } from "@/hooks/useDraftNumber";

interface NumberStepperFieldProps {
  draft: ReturnType<typeof useDraftNumber>;
  onDec: () => void;
  onInc: () => void;
  min: number;
  max: number;
  ariaLabel: string;
  /** Unit suffix shown after the input — "px" for sizes, "%" for percentage-based
   * fields like Warp. Defaults to "px". */
  unit?: string;
}

/**
 * Stepper + a single editable number input sharing one value — replaces the
 * old pattern of a static "Size: 1200px" label plus a separate input showing
 * the same number twice. Now there's exactly one place the value appears, and
 * it's directly editable there.
 */
export function NumberStepperField({ draft, onDec, onInc, min, max, ariaLabel, unit = "px" }: NumberStepperFieldProps) {
  return (
    <span className="flex items-center gap-1">
      <Stepper onDec={onDec} onInc={onInc} />
      <input
        type="number"
        min={min}
        max={max}
        value={draft.draft}
        onChange={draft.onChange}
        onFocus={draft.onFocus}
        onBlur={draft.onBlur}
        onKeyDown={draft.onKeyDown}
        className={numberInputClass}
        aria-label={ariaLabel}
      />
      <span className="shrink-0 text-[9px] uppercase tracking-wide opacity-50">{unit}</span>
    </span>
  );
}
