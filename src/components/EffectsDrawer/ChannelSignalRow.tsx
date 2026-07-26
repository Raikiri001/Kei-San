import clsx from "clsx";

interface ChannelSignalRowProps {
  label: string;
  /** Swatch color for the row's own label, so red/green/blue read at a glance instead
   * of needing to parse the text. */
  color: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

/** One row of a per-channel on/off switch — matching effect.app's own plain
 * Modulation channel toggles (no per-channel phase to hand-tune) rather than exposing
 * a control users have to manually spread apart just to avoid an accidentally-flat
 * monochrome result. Generic beyond Modulation — any later effect with its own
 * per-channel enable switches can reuse this. */
export function ChannelSignalRow({ label, color, enabled, onToggle }: ChannelSignalRowProps) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={`${label} channel`}
        onClick={() => onToggle(!enabled)}
        className={clsx(
          "press-scale relative h-4 w-7 shrink-0 rounded-full border transition-colors",
          enabled
            ? "border-[rgb(var(--bar-fg)/0.7)] bg-[rgb(var(--bar-fg)/0.3)]"
            : "border-[rgb(var(--bar-border)/0.3)] bg-[rgb(var(--bar-fg)/0.05)]",
        )}
      >
        <span
          className={clsx(
            "absolute top-0.5 h-3 w-3 rounded-full transition-transform",
            enabled ? "translate-x-3.5 bg-[rgb(var(--bar-fg))]" : "translate-x-0.5 bg-[rgb(var(--bar-fg)/0.6)]",
          )}
        />
      </button>
      <span className="text-[11px] uppercase tracking-wide" style={{ color, opacity: enabled ? 1 : 0.4 }}>
        {label}
      </span>
      <span className="ml-auto text-[10px] uppercase tracking-wide opacity-50">{enabled ? "On" : "Off"}</span>
    </div>
  );
}
