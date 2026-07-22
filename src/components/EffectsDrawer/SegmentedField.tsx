import clsx from "clsx";

interface SegmentedFieldProps<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}

/** A labeled row of named options (not a bare icon/abbreviation) for a small closed
 * set of choices — e.g. Halftone's fill mode or dot style — clearer than a single
 * cycle-through button since every option is visible and named at once. */
export function SegmentedField<T extends string>({ label, value, options, onChange }: SegmentedFieldProps<T>) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] uppercase tracking-wide opacity-70">{label}</span>
      <div className="flex overflow-hidden rounded border border-[rgb(var(--chrome-border)/0.3)]">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={clsx(
              "flex-1 px-2 py-1.5 text-[11px] uppercase tracking-wide transition-colors",
              option.value === value ? "bg-accent/20 text-accent" : "opacity-60 hover:opacity-90",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
