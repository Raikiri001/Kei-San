import { useUIStore } from "@/store/uiStore";

export function DiscardConfirmBar() {
  const pendingDiscardAction = useUIStore((s) => s.pendingDiscardAction);
  const message = useUIStore((s) => s.pendingDiscardMessage);
  const confirmDiscard = useUIStore((s) => s.confirmDiscard);
  const cancelDiscard = useUIStore((s) => s.cancelDiscard);

  if (!pendingDiscardAction) return null;

  return (
    <div className="radial-appear glass-panel corner-frame fixed left-1/2 top-6 z-[60] -translate-x-1/2 px-4 py-2.5">
      <span className="corner-bl" />
      <span className="corner-br" />
      <div className="flex items-center gap-3 text-[12px]">
        <span>{message}</span>
        <button
          type="button"
          onClick={cancelDiscard}
          className="rounded border border-white/20 px-2 py-1 uppercase tracking-wide opacity-80 hover:opacity-100"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={confirmDiscard}
          className="border-accent/60 text-accent rounded border px-2 py-1 uppercase tracking-wide"
        >
          Discard &amp; Continue
        </button>
      </div>
    </div>
  );
}
