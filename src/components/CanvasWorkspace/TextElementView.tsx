import { useCallback, useEffect, useRef, useState } from "react";
import { useProjectStore } from "@/store/projectStore";
import { useUIStore } from "@/store/uiStore";
import { useDrag } from "@/hooks/useDrag";
import { snapToNearestNode } from "@/utils/grid";
import { FONT_STACKS } from "@/constants/fonts";
import { TEXT_SCALE_MAX, TEXT_SCALE_MIN } from "@/constants/defaults";
import { PencilIcon } from "@/components/RadialMenu/icons";
import { ResizeHandles } from "@/components/CanvasWorkspace/ResizeHandles";
import type { TextElement } from "@/store/types";

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

const ALIGN_CLASS: Record<TextElement["align"], string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
  justify: "text-justify",
};

export function TextElementView({ text }: { text: TextElement }) {
  const width = useProjectStore((s) => s.project.width);
  const height = useProjectStore((s) => s.project.height);
  const cols = useProjectStore((s) => s.project.cols);
  const rows = useProjectStore((s) => s.project.rows);
  const updateText = useProjectStore((s) => s.updateText);
  const zoom = useUIStore((s) => s.zoom);
  const openRadialMenu = useUIStore((s) => s.openRadialMenu);
  const moveRadialMenu = useUIStore((s) => s.moveRadialMenu);
  const radialMenu = useUIStore((s) => s.radialMenu);
  const selectedElementId = useUIStore((s) => s.selectedElementId);
  const setSelectedElementId = useUIStore((s) => s.setSelectedElementId);
  const editingTextId = useUIStore((s) => s.editingTextId);
  const setEditingTextId = useUIStore((s) => s.setEditingTextId);
  const setDragPreviewNode = useUIStore((s) => s.setDragPreviewNode);
  const setTextBaseSize = useUIStore((s) => s.setTextBaseSize);

  const [preview, setPreview] = useState<{ x: number; y: number } | null>(null);
  const [sizePreview, setSizePreview] = useState<{ x: number; y: number; scaleX: number; scaleY: number } | null>(
    null,
  );
  const [rotationPreview, setRotationPreview] = useState<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  // Set once per resize drag (inside getResizeBox, called at drag-start) so the
  // preview/commit callbacks can convert the resized px box back into scaleX/scaleY
  // multipliers using the same base size the drag started from.
  const baseSizeRef = useRef({ w: 1, h: 1 });

  const isSelected = selectedElementId === text.id;
  const isEditing = editingTextId === text.id;

  // Pulses the pencil button's corner brackets once when this text becomes
  // newly selected — same "materializing" confirmation cue as the toolbar/
  // radial pills' expand pulse, just triggered by selection instead of hover.
  const [pencilPulsing, setPencilPulsing] = useState(false);
  const wasSelectedRef = useRef(false);
  useEffect(() => {
    if (isSelected && !wasSelectedRef.current) {
      setPencilPulsing(true);
      const t = setTimeout(() => setPencilPulsing(false), 380);
      wasSelectedRef.current = true;
      return () => clearTimeout(t);
    }
    wasSelectedRef.current = isSelected;
  }, [isSelected]);

  const getPosition = useCallback(() => ({ x: text.x, y: text.y }), [text.x, text.y]);
  const onPreview = useCallback(
    (x: number, y: number) => {
      setPreview({ x, y });
      setDragPreviewNode(snapToNearestNode(x, y, width, height, cols, rows));
    },
    [width, height, cols, rows, setDragPreviewNode],
  );

  const onCommit = useCallback(
    (x: number, y: number) => {
      const snapped = snapToNearestNode(x, y, width, height, cols, rows);
      updateText(text.id, { x: snapped.x, y: snapped.y });
      setPreview(null);
      setDragPreviewNode(null);
    },
    [width, height, cols, rows, updateText, text.id, setDragPreviewNode],
  );

  // Tapping text is the primary way to edit it now — it opens the inline
  // on-canvas box directly instead of the radial ring (which used to pop over
  // the toolbar). The ring is still reachable, but only via the pencil handle.
  const onTap = useCallback(() => {
    setSelectedElementId(text.id);
    setEditingTextId(text.id);
  }, [setSelectedElementId, setEditingTextId, text.id]);

  const onDragMove = useCallback(
    (screenX: number, screenY: number) => {
      if (radialMenu?.open && radialMenu.targetId === text.id) moveRadialMenu(screenX, screenY);
    },
    [radialMenu, moveRadialMenu, text.id],
  );

  // offsetWidth/Height measure the wrapper's own layout box, which — unlike
  // getBoundingClientRect — is unaffected by the wrapper's own CSS transform (or any
  // ancestor's), so this gives the text's true canvas-px size at scaleX/scaleY=1,
  // regardless of the current zoom or stretch factor.
  const getResizeBox = useCallback(() => {
    const el = wrapperRef.current;
    const baseW = el?.offsetWidth || 1;
    const baseH = el?.offsetHeight || 1;
    baseSizeRef.current = { w: baseW, h: baseH };
    return { x: text.x, y: text.y, w: baseW * text.scaleX, h: baseH * text.scaleY };
  }, [text.x, text.y, text.scaleX, text.scaleY]);

  const onResizePreview = useCallback((box: { x: number; y: number; w: number; h: number }) => {
    const { w: baseW, h: baseH } = baseSizeRef.current;
    setSizePreview({
      x: box.x,
      y: box.y,
      scaleX: clamp(box.w / baseW, TEXT_SCALE_MIN, TEXT_SCALE_MAX),
      scaleY: clamp(box.h / baseH, TEXT_SCALE_MIN, TEXT_SCALE_MAX),
    });
  }, []);

  const onResizeCommit = useCallback(
    (box: { x: number; y: number; w: number; h: number }) => {
      const { w: baseW, h: baseH } = baseSizeRef.current;
      const scaleX = clamp(box.w / baseW, TEXT_SCALE_MIN, TEXT_SCALE_MAX);
      const scaleY = clamp(box.h / baseH, TEXT_SCALE_MIN, TEXT_SCALE_MAX);
      updateText(text.id, { x: box.x, y: box.y, scaleX, scaleY });
      setSizePreview(null);
    },
    [updateText, text.id],
  );

  const getScreenCenter = useCallback(() => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    return rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : { x: 0, y: 0 };
  }, []);
  const onRotatePreview = useCallback((rotationDeg: number) => setRotationPreview(rotationDeg), []);
  const onRotateCommit = useCallback(
    (rotationDeg: number) => {
      updateText(text.id, { rotation: rotationDeg });
      setRotationPreview(null);
    },
    [updateText, text.id],
  );

  // Publishes this text's own unscaled (scaleX/scaleY=1) rendered box so the
  // radial menu's Width/Height fields — which have no DOM access — can convert
  // to/from scaleX/scaleY without re-implementing text measurement. ResizeObserver
  // reports the layout/border box, unaffected by this element's own CSS `scale()`
  // transform (same principle offsetWidth/Height already rely on elsewhere in
  // this file), so it won't loop from the element's own stretch changing.
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const report = () => setTextBaseSize(text.id, el.offsetWidth, el.offsetHeight);
    report();
    const observer = new ResizeObserver(report);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text.id, setTextBaseSize, text.fontSize, text.fontFamily, text.content, text.orientation]);

  const { onPointerDown, onPointerMove, onPointerUp } = useDrag({
    getPosition,
    zoom,
    onPreview,
    onCommit,
    onTap,
    onDragMove,
  });

  // Seed the editable box's DOM text once when edit mode begins, and place the
  // caret at the end — deliberately not kept as React-controlled children (see
  // below) so an unrelated re-render mid-edit can't clobber in-progress typing.
  useEffect(() => {
    const el = contentRef.current;
    if (!isEditing || !el) return;
    el.textContent = text.content;
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    // Only re-seed when entering edit mode, not on every content/text change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]);

  function handleBlur() {
    const el = contentRef.current;
    if (el) {
      const nextContent = el.innerText;
      if (nextContent !== text.content) updateText(text.id, { content: nextContent });
    }
    setEditingTextId(null);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") e.currentTarget.blur();
  }

  function handlePencilClick(e: React.MouseEvent) {
    e.stopPropagation();
    openRadialMenu(e.clientX, e.clientY, "text", text.id);
  }

  const panActive = useUIStore((s) => s.panToolActive || s.isSpacePanning);

  const pos = sizePreview ?? preview ?? { x: text.x, y: text.y };
  const scaleX = sizePreview?.scaleX ?? text.scaleX;
  const scaleY = sizePreview?.scaleY ?? text.scaleY;
  const rotation = rotationPreview ?? text.rotation;
  // Resize handles/pencil button are children of this scaled wrapper (so their
  // *position* naturally follows the stretched corners via the ambient transform),
  // but each counter-scales its own size by 1/scaleX,1/scaleY below so they stay a
  // consistent, undistorted size regardless of how much the text has been stretched.
  const inverseScaleX = 1 / (scaleX || 1);
  const inverseScaleY = 1 / (scaleY || 1);
  // While pan mode is active, the element must not intercept the drag — letting
  // pointerdown bubble to the canvas background lets the same gesture pan the
  // view even when it starts on top of a text element.
  const dragHandlers = isEditing || panActive ? {} : { onPointerDown, onPointerMove, onPointerUp };

  return (
    <div
      ref={wrapperRef}
      data-radial-context="text"
      {...dragHandlers}
      className={`absolute max-w-[80vw] touch-none whitespace-pre-wrap ${ALIGN_CLASS[text.align]}`}
      style={{
        left: 0,
        top: 0,
        // Order matters here beyond the obvious "apply right-to-left" reading:
        // CSS transform-origin (default 50%/50%, i.e. this box's own center)
        // wraps the *entire* composed transform as one unit — it does not
        // nest per-function, re-centering on whatever point the previous
        // function happened to shift to. So a translate(-50%,-50%) placed
        // *between* rotate and the origin behaves differently than one placed
        // *before* rotate: with the recenter first, rotate/scale (both linear,
        // fixed at the local origin) end up pivoting exactly on the box's own
        // center regardless of angle; with rotate first (the previous, buggy
        // order), the pivot silently drifts away from center as rotation
        // increases, which is exactly the "rotates around a corner"-looking
        // bug this order fixes. Verified empirically: rotating a test element
        // to 120° previously moved its screen-space center by ~170px; with
        // this order the center stays fixed for any angle.
        transform: `translate(${pos.x}px, ${pos.y}px) translate(-50%, -50%) rotate(${rotation}deg) scale(${scaleX}, ${scaleY})`,
        fontFamily: FONT_STACKS[text.fontFamily],
        fontSize: text.fontSize,
        color: text.color,
        writingMode: text.orientation === "vertical" ? "vertical-rl" : "horizontal-tb",
        outline: isSelected ? "1.5px solid rgb(var(--color-accent-glow) / 0.8)" : "none",
        outlineOffset: 4,
        cursor: isEditing ? "text" : panActive ? "inherit" : "grab",
        minWidth: isEditing ? "1em" : undefined,
        minHeight: isEditing ? "1em" : undefined,
      }}
    >
      {isEditing ? (
        <div
          ref={contentRef}
          contentEditable
          suppressContentEditableWarning
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="outline-none"
        />
      ) : (
        text.content
      )}

      {isSelected && (
        <button
          type="button"
          onClick={handlePencilClick}
          onPointerDown={(e) => e.stopPropagation()}
          data-pulse={pencilPulsing ? "true" : undefined}
          className="glass-panel corner-frame accent-glow-hover absolute left-full top-0 z-10 flex h-11 w-11 items-center justify-center"
          style={{
            writingMode: "horizontal-tb",
            // Diagonally beyond the NE corner — the rotate handle now occupies
            // top-center (Illustrator/Photoshop convention), so the pencil button
            // moved here to stay clear of it. Counter-scales against the ambient
            // canvas zoom in addition to the text's own stretch (inverseScaleX/Y
            // alone only undid the latter), so this stays a fixed, comfortable hit
            // target on screen instead of shrinking to a near-unclickable speck when
            // zoomed out. scale() is placed before the offset translate so that
            // offset is corrected by the same factor as the button's own size —
            // the offset (rightmost) applies first, then scale, then the
            // self-centering translate — keeping the button a constant offset from
            // the corner too, not just a constant size.
            transform: `translate(-50%, -50%) scale(${inverseScaleX / zoom}, ${inverseScaleY / zoom}) translate(1.75rem, -1.75rem)`,
          }}
          aria-label="Open text tools"
        >
          <span className="corner-tl" />
          <span className="corner-bl" />
          <span className="corner-br" />
          <span className="flex h-5 w-5 items-center justify-center">
            <PencilIcon />
          </span>
        </button>
      )}

      {isSelected && !isEditing && !panActive && (
        <ResizeHandles
          getBox={getResizeBox}
          rotation={rotation}
          zoom={zoom}
          minW={0}
          maxW={Infinity}
          minH={0}
          maxH={Infinity}
          onPreview={onResizePreview}
          onCommit={onResizeCommit}
          onRotatePreview={onRotatePreview}
          onRotateCommit={onRotateCommit}
          getScreenCenter={getScreenCenter}
          counterScaleX={inverseScaleX}
          counterScaleY={inverseScaleY}
        />
      )}
    </div>
  );
}
