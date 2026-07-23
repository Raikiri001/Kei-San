/** Minimal geometric line icons matching the HUD aesthetic (see RadialMenu/icons.tsx)
 * — kept in the drawer's own file since these are inspector-header controls, not
 * radial-menu actions. */

export function ShuffleIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path
        d="M3 6h2.8L14 14.2h2.2M14 6h2.2M16.2 6l-2.5-2.5M16.2 6l-2.5 2.5M3 14h2.8L10 10M16.2 14l-2.5-2.5M16.2 14l-2.5 2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ResetIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M15.8 7A6.5 6.5 0 1 0 17 11" strokeLinecap="round" />
      <path d="M15.5 3.2v4h-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Shared close glyph for both drawer panels (stack + inspector) — same icon,
 * same circular button treatment, so the two panels' headers read as one
 * consistent system rather than two independently designed ones. */
export function CloseIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
    </svg>
  );
}

export function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="8.5" cy="8.5" r="5.5" />
      <path d="M16 16l-3.8-3.8" strokeLinecap="round" />
    </svg>
  );
}
