/** Shared −/+ control for numeric radial-menu fields (size, dot pitch, blend
 * margin, font size) — one definition so every stepper in the app presses and
 * eases identically instead of each context menu hand-rolling its own pair. */
export function Stepper({ onDec, onInc }: { onDec: () => void; onInc: () => void }) {
  return (
    <span className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={onDec}
        className="press-scale flex h-5 w-5 items-center justify-center rounded border border-[rgb(var(--chrome-border)/0.2)] transition-colors duration-150 hover:border-accent/60 hover:text-accent"
      >
        −
      </button>
      <button
        type="button"
        onClick={onInc}
        className="press-scale flex h-5 w-5 items-center justify-center rounded border border-[rgb(var(--chrome-border)/0.2)] transition-colors duration-150 hover:border-accent/60 hover:text-accent"
      >
        +
      </button>
    </span>
  );
}
