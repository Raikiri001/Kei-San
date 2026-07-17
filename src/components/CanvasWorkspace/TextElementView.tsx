import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { useProjectStore } from "@/store/projectStore";
import { useUIStore } from "@/store/uiStore";
import { useDrag } from "@/hooks/useDrag";
import { snapToNearestNode } from "@/utils/grid";
import { FONT_STACKS } from "@/constants/fonts";
import { DISPLAY_SIZE_MAX, DISPLAY_SIZE_MIN } from "@/constants/defaults";
import { PencilIcon } from "@/components/RadialMenu/icons";
import { ResizeHandles } from "@/components/CanvasWorkspace/ResizeHandles";
import type { TextElement } from "@/store/types";

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

  const [preview, setPreview] = useState<{ x: number; y: number } | null>(null);
  const [sizePreview, setSizePreview] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [rotationPreview, setRotationPreview] = useState<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

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

  // Same box-resize pattern as ImageElementView: boxWidth/boxHeight are real,
  // explicit dimensions now (not derived from a DOM measurement + scale
  // factor), so there's no more measuring involved at all.
  const getResizeBox = useCallback(
    () => ({ x: text.x, y: text.y, w: text.boxWidth, h: text.boxHeight }),
    [text.x, text.y, text.boxWidth, text.boxHeight],
  );
  const onResizePreview = useCallback((box: { x: number; y: number; w: number; h: number }) => setSizePreview(box), []);
  const onResizeCommit = useCallback(
    (box: { x: number; y: number; w: number; h: number }) => {
      updateText(text.id, { x: box.x, y: box.y, boxWidth: box.w, boxHeight: box.h });
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
  const box = sizePreview ?? { x: pos.x, y: pos.y, w: text.boxWidth, h: text.boxHeight };
  const rotation = rotationPreview ?? text.rotation;
  // While pan mode is active, the element must not intercept the drag — letting
  // pointerdown bubble to the canvas background lets the same gesture pan the
  // view even when it starts on top of a text element.
  const dragHandlers = isEditing || panActive ? {} : { onPointerDown, onPointerMove, onPointerUp };

  return (
    <div
      ref={wrapperRef}
      data-radial-context="text"
      {...dragHandlers}
      className="absolute touch-none"
      style={{
        left: 0,
        top: 0,
        width: box.w,
        height: box.h,
        // Centering translate must come *before* rotate in the function list,
        // not after: CSS transform-origin (default 50%/50%, i.e. this box's own
        // center) wraps the *entire* composed transform as one unit — it does
        // not nest per-function, re-centering on whatever point the previous
        // function happened to shift to. So a translate(-50%,-50%) placed
        // *between* rotate and the origin behaves differently than one placed
        // *before* rotate: with the recenter first, rotate pivots exactly on
        // the box's own center regardless of angle.
        //
        // No `scale()` here at all, unlike the old scaleX/scaleY-stretched
        // version — this box's own edges are always a plain undistorted
        // rectangle (its width/height ARE boxWidth/boxHeight directly, like an
        // image's displayWidth/Height), which is what fixes the selection
        // outline/resize-handle misalignment that showed up at extreme
        // stretch: those artifacts came from drawing the outline and handles
        // on the SAME element that also carried the glyph-stretch transform,
        // so the outline's own stroke width got stretched non-uniformly right
        // along with the content. The Warp effect (warpX/warpY) now lives
        // entirely on the inner content div below instead.
        transform: `translate(${box.x}px, ${box.y}px) translate(-50%, -50%) rotate(${rotation}deg)`,
        cursor: isEditing ? "text" : panActive ? "inherit" : "grab",
        outline: isSelected ? "1.5px solid rgb(var(--color-accent-glow) / 0.8)" : "none",
        outlineOffset: 4,
      }}
    >
      <div
        className="flex h-full w-full items-center overflow-visible"
        style={{ transform: `scale(${text.warpX}, ${text.warpY})` }}
      >
        <div
          ref={contentRef}
          contentEditable={isEditing}
          suppressContentEditableWarning
          onBlur={isEditing ? handleBlur : undefined}
          onKeyDown={isEditing ? handleKeyDown : undefined}
          className={clsx("w-full whitespace-pre-wrap outline-none", ALIGN_CLASS[text.align])}
          style={{
            fontFamily: FONT_STACKS[text.fontFamily],
            fontSize: text.fontSize,
            fontWeight: text.bold ? 700 : 400,
            fontStyle: text.italic ? "italic" : "normal",
            textDecoration: text.underline ? "underline" : "none",
            color: text.color,
            writingMode: text.orientation === "vertical" ? "vertical-rl" : "horizontal-tb",
          }}
        >
          {isEditing ? undefined : text.content}
        </div>
      </div>

      {isSelected && (
        <button
          type="button"
          onClick={handlePencilClick}
          onPointerDown={(e) => e.stopPropagation()}
          data-pulse={pencilPulsing ? "true" : undefined}
          className="glass-panel corner-frame accent-glow-hover absolute left-full top-0 z-10 flex h-11 w-11 items-center justify-center"
          style={{
            // Diagonally beyond the NE corner — the rotate handle occupies
            // top-center (Illustrator/Photoshop convention), so the pencil
            // button stays clear of it. Counter-scales against the ambient
            // canvas zoom only now (no more text-warp to also counter, since
            // warp no longer lives on this element's own ancestor chain) so
            // this stays a fixed, comfortable hit target on screen regardless
            // of zoom level.
            transform: `translate(-50%, -50%) scale(${1 / zoom}) translate(1.75rem, -1.75rem)`,
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
          minW={DISPLAY_SIZE_MIN}
          maxW={DISPLAY_SIZE_MAX}
          minH={DISPLAY_SIZE_MIN}
          maxH={DISPLAY_SIZE_MAX}
          snapGrid={{ canvasWidth: width, canvasHeight: height, cols, rows }}
          onPreview={onResizePreview}
          onCommit={onResizeCommit}
          onRotatePreview={onRotatePreview}
          onRotateCommit={onRotateCommit}
          getScreenCenter={getScreenCenter}
        />
      )}
    </div>
  );
}
