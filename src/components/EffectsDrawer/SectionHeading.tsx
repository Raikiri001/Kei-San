import { InfoTooltip } from "@/components/InfoTooltip";

/** Bold, high-contrast, accent-marked heading — deliberately much louder than
 * a typical small uppercase label so a panel's sections (and their meaning)
 * are unmistakable at a glance. Shared by every left-docked panel that has
 * more than one section (Image/Text Effects' Active Stack vs. Presets/
 * Effects). */
export function SectionHeading({ children, hint }: { children: string; hint?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="h-3.5 w-1 shrink-0 rounded-full" style={{ background: "rgb(var(--bar-fg))" }} />
      <h3 className="text-[13px] font-semibold tracking-wide">{children}</h3>
      {hint && <InfoTooltip text={hint} label={`About ${children}`} side="bottom" />}
    </div>
  );
}

/** A visible divider (not just a gap) between sections — plain whitespace alone read
 * as "too close together" even at a fairly generous gap size, so each section below
 * also gets a full-width rule to make the boundary unambiguous. */
export function SectionDivider() {
  return <div className="my-2 h-px w-full bg-[rgb(var(--bar-border)/0.15)]" />;
}
