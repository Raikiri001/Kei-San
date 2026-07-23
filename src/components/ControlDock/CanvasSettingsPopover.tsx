import { useRef, useState } from "react";
import { useProjectStore } from "@/store/projectStore";
import { useUIStore } from "@/store/uiStore";
import { useDraftNumber } from "@/hooks/useDraftNumber";
import { useClickOutside } from "@/hooks/useClickOutside";
import { saveCurrentProject } from "@/store/persistence";
import { GRID_PRESETS, RESOLUTION_PRESETS } from "@/constants/defaults";
import { CanvasSettingsIcon } from "@/components/RadialMenu/icons";
import { ToolbarIconButton } from "@/components/ControlDock/ToolbarIconButton";
import { InfoTooltip } from "@/components/InfoTooltip";

const inputClass = "glass-panel h-8 w-16 shrink-0 rounded-full px-2.5 text-[12px] tabular-nums outline-none focus:border-accent/60";
// w-full + min-w-0 stop the <select> from sizing itself to its widest <option>
// text (e.g. "Mobile Portrait (1080×1920)") and blowing out past the popover's
// own fixed width; truncate ellipsizes the closed-state label instead.
const selectClass = "glass-panel h-8 w-full min-w-0 truncate rounded-xl px-2 text-[11px] outline-none focus:border-accent/60";

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`flex flex-col gap-1${className ? ` ${className}` : ""}`}>
      <span className="text-[10px] uppercase tracking-wide opacity-70">{label}</span>
      {children}
    </label>
  );
}

/**
 * Collapses Width/Height/Resolution + Cols/Rows/Grid — previously two always-visible
 * nested panels in the toolbar — into a single trigger button + popover, freeing up
 * toolbar space and removing the double-bordered nested-panel look those two groups
 * had next to the flat top-level buttons.
 */
export function CanvasSettingsPopover() {
  const project = useProjectStore((s) => s.project);
  const setDimensions = useProjectStore((s) => s.setDimensions);
  const setGrid = useProjectStore((s) => s.setGrid);
  const showAnchors = useUIStore((s) => s.showAnchors);
  const toggleShowAnchors = useUIStore((s) => s.toggleShowAnchors);

  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useClickOutside(rootRef, () => setOpen(false), open);

  const widthDraft = useDraftNumber(project.width, {
    min: 64,
    max: 7680,
    onCommit: (width) => {
      setDimensions(width, project.height);
      saveCurrentProject(project);
    },
  });
  const heightDraft = useDraftNumber(project.height, {
    min: 64,
    max: 7680,
    onCommit: (height) => {
      setDimensions(project.width, height);
      saveCurrentProject(project);
    },
  });
  const colsDraft = useDraftNumber(project.cols, {
    min: 1,
    max: 24,
    onCommit: (cols) => {
      setGrid(cols, project.rows);
      saveCurrentProject(project);
    },
  });
  const rowsDraft = useDraftNumber(project.rows, {
    min: 1,
    max: 24,
    onCommit: (rows) => {
      setGrid(project.cols, rows);
      saveCurrentProject(project);
    },
  });

  function handleResolutionPreset(e: React.ChangeEvent<HTMLSelectElement>) {
    const preset = RESOLUTION_PRESETS[Number(e.target.value)];
    if (!preset) return;
    setDimensions(preset.width, preset.height);
    saveCurrentProject(project);
  }

  function handleGridPreset(e: React.ChangeEvent<HTMLSelectElement>) {
    const preset = GRID_PRESETS[Number(e.target.value)];
    if (!preset) return;
    setGrid(preset.cols, preset.rows);
    saveCurrentProject(project);
  }

  // Presets are derived, not stored: the select always reflects whatever the
  // current width/height (or cols/rows) actually are, so hand-editing either
  // field while a preset is active automatically flips the dropdown to "Custom"
  // with no extra state to track.
  const resolutionMatchIdx = RESOLUTION_PRESETS.findIndex(
    (p) => p.width === project.width && p.height === project.height,
  );
  const gridMatchIdx = GRID_PRESETS.findIndex((p) => p.cols === project.cols && p.rows === project.rows);

  return (
    <div ref={rootRef} className="relative">
      <ToolbarIconButton
        onClick={() => setOpen((o) => !o)}
        icon={<CanvasSettingsIcon />}
        label="Canvas Settings"
        ariaExpanded={open}
        active={open}
        forceExpanded={open}
      />

      {open && (
        <div className="glass-panel radial-appear absolute left-0 top-full z-40 mt-3 w-80 rounded-3xl p-6">
          <div className="flex flex-col gap-5">
            <div>
              <div className="mb-2 text-[10px] uppercase tracking-wide opacity-60">Canvas Size</div>
              <div className="flex items-end gap-3">
                <Field label="Width">
                  <input
                    type="number"
                    value={widthDraft.draft}
                    onChange={widthDraft.onChange}
                    onFocus={widthDraft.onFocus}
                    onBlur={widthDraft.onBlur}
                    onKeyDown={widthDraft.onKeyDown}
                    className={inputClass}
                  />
                </Field>
                <Field label="Height">
                  <input
                    type="number"
                    value={heightDraft.draft}
                    onChange={heightDraft.onChange}
                    onFocus={heightDraft.onFocus}
                    onBlur={heightDraft.onBlur}
                    onKeyDown={heightDraft.onKeyDown}
                    className={inputClass}
                  />
                </Field>
                <Field label="Resolution" className="min-w-0 flex-1">
                  <select
                    value={resolutionMatchIdx === -1 ? "custom" : String(resolutionMatchIdx)}
                    onChange={handleResolutionPreset}
                    className={selectClass}
                  >
                    {resolutionMatchIdx === -1 && (
                      <option value="custom" disabled>
                        Custom
                      </option>
                    )}
                    {RESOLUTION_PRESETS.map((preset, idx) => (
                      <option key={preset.label} value={idx}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>

            <div>
              <div className="mb-2 text-[10px] uppercase tracking-wide opacity-60">Grid</div>
              <div className="flex items-end gap-3">
                <Field label="Cols">
                  <input
                    type="number"
                    value={colsDraft.draft}
                    onChange={colsDraft.onChange}
                    onFocus={colsDraft.onFocus}
                    onBlur={colsDraft.onBlur}
                    onKeyDown={colsDraft.onKeyDown}
                    className={inputClass}
                  />
                </Field>
                <Field label="Rows">
                  <input
                    type="number"
                    value={rowsDraft.draft}
                    onChange={rowsDraft.onChange}
                    onFocus={rowsDraft.onFocus}
                    onBlur={rowsDraft.onBlur}
                    onKeyDown={rowsDraft.onKeyDown}
                    className={inputClass}
                  />
                </Field>
                <Field label="Grid" className="min-w-0 flex-1">
                  <select
                    value={gridMatchIdx === -1 ? "custom" : String(gridMatchIdx)}
                    onChange={handleGridPreset}
                    className={selectClass}
                  >
                    {gridMatchIdx === -1 && (
                      <option value="custom" disabled>
                        Custom
                      </option>
                    )}
                    {GRID_PRESETS.map((preset, idx) => (
                      <option key={preset.label} value={idx}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="mt-3 flex items-center gap-2 text-[11px]">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showAnchors}
                    onChange={toggleShowAnchors}
                    className="h-3.5 w-3.5 accent-[var(--color-accent)]"
                  />
                  Anchor Toggle
                </label>
                <InfoTooltip text="Off: free move, resize still snaps to rows/cols/edges." label="About Anchor Toggle" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
