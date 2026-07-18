import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useProjectStore } from "@/store/projectStore";
import { useUIStore } from "@/store/uiStore";
import { MAX_ZOOM, MIN_ZOOM } from "@/constants/defaults";
import { hexToRgba } from "@/canvas/colorExtraction";
import { GridOverlay } from "@/components/CanvasWorkspace/GridOverlay";
import { RulerOverlay } from "@/components/CanvasWorkspace/RulerOverlay";
import { ImageElementView } from "@/components/CanvasWorkspace/ImageElementView";
import { TextElementView } from "@/components/CanvasWorkspace/TextElementView";
import { HandIcon, MoonIcon, ResetViewIcon, SunIcon } from "@/components/RadialMenu/icons";
import { useElementShortcuts } from "@/hooks/useElementShortcuts";
import clsx from "clsx";

const TAP_THRESHOLD_PX = 4;
/** How long to wait after the last zoom change before snapping an open radial
 * menu back to its element — see the effect below for why this is a settle-then-
 * jump instead of a live per-tick reposition. */
const ZOOM_SETTLE_MS = 220;

/** True when the given element is a text input/textarea/contentEditable region —
 * Space must keep typing a literal space there instead of engaging temporary pan. */
function isTextEntryElement(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || (el as HTMLElement).isContentEditable;
}

export function CanvasWorkspace() {
  const width = useProjectStore((s) => s.project.width);
  const height = useProjectStore((s) => s.project.height);
  const cols = useProjectStore((s) => s.project.cols);
  const rows = useProjectStore((s) => s.project.rows);
  const backgroundColor = useProjectStore((s) => s.project.backgroundColor);
  const backgroundAlpha = useProjectStore((s) => s.project.backgroundAlpha);
  const images = useProjectStore((s) => s.project.images);
  const texts = useProjectStore((s) => s.project.texts);

  const zoom = useUIStore((s) => s.zoom);
  const setZoom = useUIStore((s) => s.setZoom);
  const zoomBy = useUIStore((s) => s.zoomBy);
  const panX = useUIStore((s) => s.panX);
  const panY = useUIStore((s) => s.panY);
  const panBy = useUIStore((s) => s.panBy);
  const setPan = useUIStore((s) => s.setPan);
  const resetPan = useUIStore((s) => s.resetPan);
  const panToolActive = useUIStore((s) => s.panToolActive);
  const togglePanTool = useUIStore((s) => s.togglePanTool);
  const isSpacePanning = useUIStore((s) => s.isSpacePanning);
  const setSpacePanning = useUIStore((s) => s.setSpacePanning);
  const setSelectedElementId = useUIStore((s) => s.setSelectedElementId);
  const dragPreviewNode = useUIStore((s) => s.dragPreviewNode);
  const radialMenu = useUIStore((s) => s.radialMenu);
  const moveRadialMenu = useUIStore((s) => s.moveRadialMenu);

  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);

  useElementShortcuts();

  const panActive = panToolActive || isSpacePanning;

  const viewportRef = useRef<HTMLDivElement>(null);
  const bgDownRef = useRef<{ x: number; y: number } | null>(null);
  const panDragRef = useRef<{ x: number; y: number; dragging: boolean } | null>(null);
  const didFitRef = useRef(false);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [isPanDragging, setIsPanDragging] = useState(false);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

  // Tracked so the ruler (rendered in untransformed screen-space, outside the
  // pan/zoom transform) can compute where canvas-space (0,0) currently falls within
  // the viewport — the canvas wrapper is centered by flexbox and scales around its
  // own center, so that origin shifts with both viewport size and zoom.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width: vw, height: vh } = entry.contentRect;
      setViewportSize({ width: vw, height: vh });
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  // Holding Space temporarily activates pan (regardless of the persistent pan-tool
  // toggle), matching the hold-to-pan convention in most design tools — but must not
  // steal Space from any active text entry (project name, drafts, on-canvas text edit).
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code !== "Space" || e.repeat) return;
      if (isTextEntryElement(document.activeElement)) return;
      e.preventDefault();
      setSpacePanning(true);
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.code !== "Space") return;
      setSpacePanning(false);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [setSpacePanning]);

  // Shared stacking order across both element types — sorted once per render
  // instead of the old fixed "all images then all texts" passes, so front/back
  // layer-order tools actually change paint order in the live preview too.
  const orderedElements = useMemo(
    () =>
      [
        ...images.map((el) => ({ kind: "image" as const, el })),
        ...texts.map((el) => ({ kind: "text" as const, el })),
      ].sort((a, b) => a.el.zIndex - b.el.zIndex),
    [images, texts],
  );

  // Shared by the initial auto-fit effect below and the "Reset View" button —
  // both want the same "whole canvas visible, comfortably inset" zoom level.
  const computeFitZoom = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return 1;
    const { width: vw, height: vh } = viewport.getBoundingClientRect();
    const fit = Math.min((vw * 0.9) / width, (vh * 0.9) / height, 1);
    return Number.isFinite(fit) && fit > 0 ? fit : 1;
  }, [width, height]);

  // Auto-fit the canvas into the viewport once per canvas dimension change.
  useEffect(() => {
    setZoom(computeFitZoom());
    didFitRef.current = true;
  }, [computeFitZoom, setZoom]);

  function handleResetView() {
    setZoom(computeFitZoom());
    resetPan();
  }

  // Screen px (relative to the viewport box) where canvas-space (0,0) currently
  // sits — the wrapper is flex-centered and scales about its own center, so this
  // depends on viewport size, zoom, and pan together (see the effect above).
  const originX = viewportSize.width / 2 - (width * zoom) / 2 + panX;
  const originY = viewportSize.height / 2 - (height * zoom) / 2 + panY;

  // An open radial menu's x/y is a plain screen position — zooming the canvas
  // moves every element under it without touching that stored position, so the
  // menu would otherwise visibly detach from whatever it was opened on. Rather
  // than recompute it on every zoom tick (which would make it crawl/lag behind
  // a fast zoom gesture instead of tracking cleanly), this captures the canvas-
  // space point it's anchored to once a zoom change starts, then waits for the
  // gesture to settle (ZOOM_SETTLE_MS of no further change) and jumps it there
  // in one step.
  const zoomAnchorRef = useRef<{ x: number; y: number } | null>(null);
  const prevZoomRef = useRef(zoom);
  useEffect(() => {
    if (prevZoomRef.current === zoom) return;
    const oldZoom = prevZoomRef.current;
    prevZoomRef.current = zoom;
    if (!radialMenu?.open) return;

    if (!zoomAnchorRef.current) {
      const oldOriginX = viewportSize.width / 2 - (width * oldZoom) / 2 + panX;
      const oldOriginY = viewportSize.height / 2 - (height * oldZoom) / 2 + panY;
      zoomAnchorRef.current = {
        x: (radialMenu.x - oldOriginX) / oldZoom,
        y: (radialMenu.y - oldOriginY) / oldZoom,
      };
    }

    const timer = setTimeout(() => {
      const anchor = zoomAnchorRef.current;
      zoomAnchorRef.current = null;
      if (!anchor) return;
      moveRadialMenu(anchor.x * zoom + originX, anchor.y * zoom + originY);
    }, ZOOM_SETTLE_MS);
    return () => clearTimeout(timer);
  }, [zoom, radialMenu, viewportSize.width, viewportSize.height, width, height, panX, panY, originX, originY, moveRadialMenu]);

  // Wheel/trackpad-pinch zoom, anchored to the cursor position instead of the
  // canvas's own (flex-centered) middle: the canvas-space point currently
  // under the cursor is held invariant, and pan is re-derived from it so that
  // point stays put under the cursor across the zoom change — same "zoom
  // toward the mouse" convention as Figma/Photoshop. Trackpad pinch gestures
  // are just reported as ordinary wheel events by the browser (no ctrlKey
  // special-casing needed — see CROP_ZOOM_WHEEL_STEP's doc comment for the
  // same convention elsewhere in this codebase).
  //
  // MUST be a real native listener with { passive: false }, not React's
  // onWheel prop — same reasoning as ImageElementView's crop-zoom wheel
  // handler: React registers its synthetic wheel listener as passive, which
  // silently no-ops preventDefault, letting the gesture fall through to the
  // browser's own page-zoom/scroll instead of staying scoped to the canvas.
  // Read via a ref (not the effect's dependency array) so the listener itself
  // never needs to be torn down and re-attached on every zoom/pan tick.
  const wheelStateRef = useRef({ zoom, originX, originY, viewportSize, width, height });
  wheelStateRef.current = { zoom, originX, originY, viewportSize, width, height };

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    function onWheelNative(e: WheelEvent) {
      e.preventDefault();
      const { zoom: curZoom, originX: curOriginX, originY: curOriginY, viewportSize: vs, width: w, height: h } =
        wheelStateRef.current;
      const nextZoom = Math.min(Math.max(curZoom - e.deltaY * 0.001, MIN_ZOOM), MAX_ZOOM);
      if (nextZoom === curZoom) return;
      const rect = viewport!.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const canvasX = (mouseX - curOriginX) / curZoom;
      const canvasY = (mouseY - curOriginY) / curZoom;
      setZoom(nextZoom);
      setPan(
        mouseX - canvasX * nextZoom - vs.width / 2 + (w * nextZoom) / 2,
        mouseY - canvasY * nextZoom - vs.height / 2 + (h * nextZoom) / 2,
      );
    }
    viewport.addEventListener("wheel", onWheelNative, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheelNative);
  }, [setZoom, setPan]);

  function handleBgPointerDown(e: React.PointerEvent) {
    if (panActive) {
      panDragRef.current = { x: e.clientX, y: e.clientY, dragging: false };
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      setIsPanDragging(true);
      return;
    }
    bgDownRef.current = { x: e.clientX, y: e.clientY };
  }

  function handleBgPointerUp(e: React.PointerEvent) {
    if (panActive) {
      panDragRef.current = null;
      setIsPanDragging(false);
      return;
    }
    const down = bgDownRef.current;
    bgDownRef.current = null;
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    if (moved < TAP_THRESHOLD_PX) {
      setSelectedElementId(null);
    }
  }

  function handleCanvasPointerMove(e: React.PointerEvent) {
    const panDrag = panDragRef.current;
    if (panDrag) {
      panBy(e.clientX - panDrag.x, e.clientY - panDrag.y);
      panDragRef.current = { x: e.clientX, y: e.clientY, dragging: true };
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setHoverPos({ x: (e.clientX - rect.left) / zoom, y: (e.clientY - rect.top) / zoom });
  }

  return (
    <div
      ref={viewportRef}
      className={clsx(
        "relative flex h-full w-full items-center justify-center overflow-hidden",
        panActive && (isPanDragging ? "cursor-grabbing" : "cursor-grab"),
      )}
    >
      <RulerOverlay width={width} height={height} zoom={zoom} originX={originX} originY={originY} hoverPos={hoverPos} />

      <div
        style={{ transform: `translate(${panX}px, ${panY}px) scale(${zoom})` }}
        className="relative transition-transform duration-75 ease-out"
      >
        <div
          onPointerDown={handleBgPointerDown}
          onPointerUp={handleBgPointerUp}
          onPointerMove={handleCanvasPointerMove}
          onPointerLeave={() => setHoverPos(null)}
          className="relative touch-none shadow-[0_0_0_1px_rgb(255_255_255/0.14),0_0_60px_-10px_rgb(var(--color-accent-glow)/0.25),0_40px_120px_-20px_rgb(0_0_0/0.6)]"
          style={{ width, height, isolation: "isolate" }}
        >
          {/* Two separate stacked layers, not one element's background-image
              over background-color — a background-image always paints fully
              opaquely over background-color regardless of the color's own
              alpha, so the checker would never actually show through a single
              element's layered background. As two real elements, the color
              layer's own alpha correctly blends over the checker layer
              beneath it. */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{ backgroundImage: "repeating-conic-gradient(#5b5f66 0% 25%, #3a3d42 0% 50%)", backgroundSize: "16px 16px" }}
          />
          <div className="pointer-events-none absolute inset-0" style={{ backgroundColor: hexToRgba(backgroundColor, backgroundAlpha) }} />
          <GridOverlay width={width} height={height} cols={cols} rows={rows} nearestSnapNode={dragPreviewNode} />
          {orderedElements.map((entry) =>
            entry.kind === "image" ? (
              <ImageElementView key={entry.el.id} image={entry.el} />
            ) : (
              <TextElementView key={entry.el.id} text={entry.el} />
            ),
          )}
        </div>
      </div>

      <div className="glass-panel corner-frame absolute bottom-5 right-5 flex items-center gap-1 px-2 py-1.5">
        <span className="corner-tl" />
        <span className="corner-bl" />
        <span className="corner-br" />
        <button
          type="button"
          onClick={toggleTheme}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="press-scale flex h-7 w-7 items-center justify-center rounded opacity-70 transition-[color,opacity] duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:text-accent hover:opacity-100"
        >
          <span className="flex h-4 w-4 items-center justify-center">{theme === "dark" ? <MoonIcon /> : <SunIcon />}</span>
        </button>
        <div className="mx-0.5 h-5 w-px" style={{ background: "rgb(var(--chrome-border) / 0.2)" }} />
        <button
          type="button"
          onClick={togglePanTool}
          title="Pan tool (hold Space)"
          aria-pressed={panToolActive}
          className={clsx(
            "press-scale flex h-7 w-7 items-center justify-center rounded transition-[color,opacity,background-color,border-color] duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
            panToolActive ? "border-accent/70 text-accent bg-[rgb(var(--color-accent-glow)/0.12)]" : "opacity-70 hover:opacity-100",
          )}
        >
          <span className="flex h-4 w-4 items-center justify-center">
            <HandIcon />
          </span>
        </button>
        <div className="mx-0.5 h-5 w-px" style={{ background: "rgb(var(--chrome-border) / 0.2)" }} />
        <button
          type="button"
          onClick={handleResetView}
          title="Reset view (fit to screen)"
          className="press-scale flex h-7 w-7 items-center justify-center rounded opacity-70 transition-[color,opacity] duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:text-accent hover:opacity-100"
        >
          <span className="flex h-4 w-4 items-center justify-center">
            <ResetViewIcon />
          </span>
        </button>
        <div className="mx-0.5 h-5 w-px" style={{ background: "rgb(var(--chrome-border) / 0.2)" }} />
        <button
          type="button"
          onClick={() => zoomBy(-0.1)}
          disabled={zoom <= MIN_ZOOM}
          className="press-scale flex h-7 w-7 items-center justify-center text-sm transition-opacity duration-150 disabled:pointer-events-none disabled:opacity-30"
        >
          −
        </button>
        <span className="w-12 text-center text-[11px] tabular-nums">{Math.round(zoom * 100)}%</span>
        <button
          type="button"
          onClick={() => zoomBy(0.1)}
          disabled={zoom >= MAX_ZOOM}
          className="press-scale flex h-7 w-7 items-center justify-center text-sm transition-opacity duration-150 disabled:pointer-events-none disabled:opacity-30"
        >
          +
        </button>
      </div>
    </div>
  );
}
