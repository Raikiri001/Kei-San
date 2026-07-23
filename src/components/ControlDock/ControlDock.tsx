import { useLayoutEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useProjectStore } from "@/store/projectStore";
import { useUIStore } from "@/store/uiStore";
import { downloadCanvas, renderProjectToCanvas } from "@/canvas/exportEngine";
import { saveCurrentProject } from "@/store/persistence";
import { CanvasSettingsPopover } from "@/components/ControlDock/CanvasSettingsPopover";
import { BackgroundColorPopover } from "@/components/ControlDock/BackgroundColorPopover";
import { ToolbarIconButton } from "@/components/ControlDock/ToolbarIconButton";
import {
  DownloadIcon,
  FolderIcon,
  GridLayoutIcon,
  NewDesignIcon,
  SaveIcon,
  TextContentIcon,
  UploadIcon,
} from "@/components/RadialMenu/icons";

/** How long the pointer/focus can be away before the dock recedes to its
 * idle pill. Generous enough that a user glancing at the canvas mid-edit
 * doesn't get the toolbar yanked away from under them. */
const IDLE_COLLAPSE_MS = 1300;
/** Pointer coming within this many px of the top edge pre-emptively expands
 * the dock, so reaching for it doesn't require hitting the (possibly tiny,
 * collapsed) pill exactly. */
const TOP_EDGE_PX = 90;
/** Idle width: just enough to show the brand mark plus its own padding. */
const COLLAPSED_W = 128;
/** Matches the container's own px-7 (28px each side). */
const CONTAINER_PADDING_X = 56;

// Critically damped (damping ratio ~1.0): the dock's shape-morph is precise
// and fast-settling, never a bounce. This animates ONLY the outer width —
// the full toolbar is always mounted in normal flow and simply gets clipped
// by the container's own overflow-hidden while collapsed, rather than
// swapping between two different content trees (which is what made the
// previous version feel uncoordinated: a layout-FLIP and a content
// cross-fade fighting for the same moment).
const DOCK_SPRING = { type: "spring" as const, stiffness: 260, damping: 30, mass: 1 };

/** Vertical rule between control groups — fixed at the row's own h-9 so it never
 * makes the toolbar taller than its shortest control, unlike the old per-section
 * dividers that were hand-tuned to whatever neighbor happened to be tallest. */
function DockDivider() {
  return <div className="h-9 w-px shrink-0" style={{ background: "rgb(var(--chrome-border) / 0.16)" }} />;
}

/**
 * The main toolbar, styled as an "Adaptive Liquid Dock": idle, it recedes to
 * a small brand pill; hovering, focusing anything inside it, approaching the
 * top edge, or having a child popover open expands it back to the full
 * toolbar. The full toolbar is always rendered — only the container's own
 * `width` animates, so collapsing never touches layout/content mounting,
 * just how much of the (otherwise normal, unanimated) row is visible.
 */
export function ControlDock() {
  const project = useProjectStore((s) => s.project);
  const setName = useProjectStore((s) => s.setName);
  const addText = useProjectStore((s) => s.addText);
  const resetToNewDesign = useProjectStore((s) => s.resetToNewDesign);
  const autoLayoutImages = useProjectStore((s) => s.autoLayoutImages);

  const guardDirty = useUIStore((s) => s.guardDirty);
  const markClean = useUIStore((s) => s.markClean);
  const setDesignsDrawerOpen = useUIStore((s) => s.setDesignsDrawerOpen);
  const setUploadDialogOpen = useUIStore((s) => s.setUploadDialogOpen);
  const setSelectedElementId = useUIStore((s) => s.setSelectedElementId);
  const setEditingTextId = useUIStore((s) => s.setEditingTextId);

  const prefersReducedMotion = useReducedMotion();
  const [expanded, setExpanded] = useState(true);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [fullWidth, setFullWidth] = useState<number | null>(null);
  const collapseTimerRef = useRef<number | null>(null);
  // Ref, not state: read at collapse-timer fire time, which can be well after
  // the render that started the save/export — a plain state closure captured
  // in the timeout callback would see a stale value.
  const busyRef = useRef(false);

  // The full row's natural width is deterministic (every button is its own
  // collapsed 36px glyph unless a specific one is individually hovered, and
  // that only happens once the dock itself is already expanded) — so this
  // only needs to measure once, not track every child's own hover-expand.
  useLayoutEffect(() => {
    if (contentRef.current) setFullWidth(contentRef.current.scrollWidth + CONTAINER_PADDING_X);
  }, []);

  function clearCollapseTimer() {
    if (collapseTimerRef.current !== null) {
      window.clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }
  }

  function scheduleCollapse() {
    clearCollapseTimer();
    collapseTimerRef.current = window.setTimeout(() => {
      const el = wrapperRef.current;
      if (!el || busyRef.current) return;
      // Never collapse out from under an open child popover (Canvas Settings,
      // Background Color both mark their trigger aria-expanded) or while
      // keyboard focus is still inside (the project name field, a popover's
      // own inputs).
      if (el.contains(document.activeElement)) return;
      if (el.querySelector('[aria-expanded="true"]')) return;
      setExpanded(false);
    }, IDLE_COLLAPSE_MS);
  }

  function expandNow() {
    clearCollapseTimer();
    setExpanded(true);
  }

  useLayoutEffect(() => {
    scheduleCollapse();
    return clearCollapseTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    function onPointerMove(e: PointerEvent) {
      if (e.clientY < TOP_EDGE_PX) expandNow();
    }
    window.addEventListener("pointermove", onPointerMove);
    return () => window.removeEventListener("pointermove", onPointerMove);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleAddText() {
    const id = addText();
    setSelectedElementId(id);
    setEditingTextId(id);
  }

  async function handleExport() {
    busyRef.current = true;
    expandNow();
    try {
      const canvas = await renderProjectToCanvas(project);
      await downloadCanvas(canvas, project.name);
      await saveCurrentProject(project, canvas);
    } finally {
      busyRef.current = false;
      scheduleCollapse();
    }
  }

  async function handleSave() {
    busyRef.current = true;
    expandNow();
    try {
      await saveCurrentProject(project);
      markClean();
    } finally {
      busyRef.current = false;
      scheduleCollapse();
    }
  }

  function handleNewDesign() {
    guardDirty(() => resetToNewDesign(), "Discard unsaved changes and start a new design?");
  }

  const targetWidth = expanded ? fullWidth : COLLAPSED_W;

  return (
    <motion.div
      ref={wrapperRef}
      initial={false}
      // Only animates once fullWidth is known (a layout effect away, so
      // effectively before the user ever perceives it) — before that, the
      // element is simply unconstrained and sizes to its natural content
      // width, which happens to already equal fullWidth, so there's nothing
      // to visibly animate into place on first mount.
      animate={targetWidth !== null ? { width: targetWidth } : undefined}
      transition={prefersReducedMotion ? { duration: 0 } : DOCK_SPRING}
      onMouseEnter={expandNow}
      onMouseLeave={scheduleCollapse}
      onFocus={expandNow}
      onBlur={(e) => {
        if (!wrapperRef.current?.contains(e.relatedTarget as Node)) scheduleCollapse();
      }}
      className="glass-panel pointer-events-auto relative flex items-center overflow-hidden rounded-full py-4 pl-7"
    >
      {/* w-max + shrink-0: this is a flex item of the animated-width, overflow-hidden
          parent above — without both, the browser's flexbox algorithm would shrink
          (or, with flex-wrap, reflow onto multiple rows) this row to fit the
          shrinking parent instead of holding its natural full width and simply
          getting clipped by the parent's own overflow-hidden, which is what a
          "collapse to reveal just the brand mark" effect actually needs. */}
      <div ref={contentRef} className="flex w-max shrink-0 items-center gap-4 pr-7">
        <div className="flex h-9 items-center gap-1.5">
          <span
            className="text-[22px] font-black leading-none"
            style={{
              fontFamily: '"Noto Sans JP", sans-serif',
              color: "var(--color-accent)",
              textShadow: "0 0 16px rgb(var(--color-accent-glow) / 0.5)",
            }}
          >
            景
          </span>
          <span
            className="text-[22px] font-black leading-none"
            style={{
              fontFamily: '"Noto Sans JP", sans-serif',
              color: "var(--color-accent)",
              textShadow: "0 0 16px rgb(var(--color-accent-glow) / 0.5)",
            }}
          >
            さん
          </span>
        </div>

        <DockDivider />

        {/* Project group: name, save, and export all act on the current project,
            so they live together — save persists it, export renders it out. */}
        <div className="flex items-center gap-3">
          <input
            value={project.name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => saveCurrentProject(project)}
            placeholder="Untitled Project"
            className="glass-panel h-9 w-40 rounded-full px-3.5 text-[12px] outline-none focus:border-accent/60"
          />
          <ToolbarIconButton onClick={handleSave} icon={<SaveIcon />} label="Save" />
          <ToolbarIconButton onClick={handleExport} icon={<DownloadIcon />} label="Export Wallpaper" />
        </div>

        <DockDivider />

        {/* File group: create a new design or jump back into a saved one. */}
        <div className="flex items-center gap-3">
          <ToolbarIconButton onClick={handleNewDesign} icon={<NewDesignIcon />} label="New Design" />
          <ToolbarIconButton onClick={() => setDesignsDrawerOpen(true)} icon={<FolderIcon />} label="My Designs" />
        </div>

        <DockDivider />

        {/* Canvas group: canvas-level configuration (size, grid, background). */}
        <div className="flex items-center gap-3">
          <CanvasSettingsPopover />
          <BackgroundColorPopover />
        </div>

        <DockDivider />

        {/* Content group: tools that add elements to the canvas. Upload Image and
            Auto-Fill Layout stay adjacent — both act on the image workflow
            (bring images in, then auto-arrange them), unlike Add Text. */}
        <div className="flex items-center gap-3">
          <ToolbarIconButton onClick={() => setUploadDialogOpen(true)} icon={<UploadIcon />} label="Upload Image" />
          <ToolbarIconButton onClick={autoLayoutImages} icon={<GridLayoutIcon />} label="Auto-Fill Layout" />
          <ToolbarIconButton onClick={handleAddText} icon={<TextContentIcon />} label="Add Text" />
        </div>
      </div>
    </motion.div>
  );
}
