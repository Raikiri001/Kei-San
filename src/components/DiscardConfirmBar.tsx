import { useUIStore } from "@/store/uiStore";

export function DiscardConfirmBar() {
  const pendingDiscardAction = useUIStore((s) => s.pendingDiscardAction);
  const message = useUIStore((s) => s.pendingDiscardMessage);
  const confirmDiscard = useUIStore((s) => s.confirmDiscard);
  const cancelDiscard = useUIStore((s) => s.cancelDiscard);

  if (!pendingDiscardAction) return null;

  return (
    <div className="radial-appear glass-panel fixed left-1/2 top-10 z-[60] -translate-x-1/2 rounded-full px-4 py-2.5">
      <div className="flex items-center gap-3 text-[12px]">
        <span>{message}</span>
        <button
          type="button"
          onClick={cancelDiscard}
          className="press-scale rounded-full border border-[rgb(var(--chrome-border)/0.25)] px-2.5 py-1 uppercase tracking-wide opacity-80 transition-opacity duration-150 hover:opacity-100"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={confirmDiscard}
          className="press-scale border-accent/60 text-accent rounded-full border px-2.5 py-1 uppercase tracking-wide"
        >
          Discard &amp; Continue
        </button>
      </div>
    </div>
  );
}
