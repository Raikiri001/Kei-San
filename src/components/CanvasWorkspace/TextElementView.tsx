import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { useProjectStore } from "@/store/projectStore";
import { useUIStore } from "@/store/uiStore";
import { useDrag } from "@/hooks/useDrag";
import { snapToNearestNode, snapToAlignmentGuides } from "@/utils/grid";
import { resolveRadialContext } from "@/utils/radialContext";
import { getFontStack } from "@/constants/fonts";
import { DISPLAY_SIZE_MAX, DISPLAY_SIZE_MIN, ALIGN_GUIDE_SNAP_THRESHOLD_SCREEN_PX } from "@/constants/defaults";
import { ResizeHandles } from "@/components/CanvasWorkspace/ResizeHandles";
import { hexToRgba } from "@/canvas/colorExtraction";
import { getTextGlowShadow } from "@/canvas/textGlow";
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
  const moveElementsBy = useProjectStore((s) => s.moveElementsBy);
  const allImages = useProjectStore((s) => s.project.images);
  const allTexts = useProjectStore((s) => s.project.texts);
  const zoom = useUIStore((s) => s.zoom);
  const openRadialMenu = useUIStore((s) => s.openRadialMenu);
  const closeRadialMenu = useUIStore((s) => s.closeRadialMenu);
  const moveRadialMenu = useUIStore((s) => s.moveRadialMenu);
  const radialMenu = useUIStore((s) => s.radialMenu);
  const selectedElementIds = useUIStore((s) => s.selectedElementIds);
  const setSelectedElementId = useUIStore((s) => s.setSelectedElementId);
  const toggleElementSelection = useUIStore((s) => s.toggleElementSelection);
  const groupDragOffset = useUIStore((s) => s.groupDragOffset);
  const setGroupDragOffset = useUIStore((s) => s.setGroupDragOffset);
  const editingTextId = useUIStore((s) => s.editingTextId);
  const setEditingTextId = useUIStore((s) => s.setEditingTextId);
  const setDragPreviewNode = useUIStore((s) => s.setDragPreviewNode);
  const setAlignmentGuide = useUIStore((s) => s.setAlignmentGuide);
  // Master anchor toggle: on, moved elements snap to the nearest anchor node
  // (and the dots render — see GridOverlay); off, moves are completely
  // free-form with no position snapping at all. Resize-edge snapping (in
  // useResizeDrag/ResizeHandles below) is independent of this toggle — it
  // always stays on, just dropping to whole-cell row/column/edge lines
  // instead of the fine half-cell anchor lattice when this is off.
  const showAnchors = useUIStore((s) => s.showAnchors);

  const [preview, setPreview] = useState<{ x: number; y: number } | null>(null);
  const [sizePreview, setSizePreview] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [rotationPreview, setRotationPreview] = useState<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const isSelected = selectedElementIds.includes(text.id);
  const isGroupDragging = isSelected && selectedElementIds.length > 1;
  const isEditing = editingTextId === text.id;

  const getPosition = useCallback(() => ({ x: text.x, y: text.y }), [text.x, text.y]);

  // See ImageElementView's identical helper for the full rationale: Shift
  // constrains free-form (anchors-off) moves to one axis, then the result is
  // smart-guide-snapped to the nearest row/column line, canvas mid-line, or
  // another element's own edge/center.
  const otherElementBoxes = useMemo(
    () => [
      ...allImages.map((i) => ({ x: i.x, y: i.y, w: i.displayWidth, h: i.displayHeight })),
      ...allTexts.filter((t) => t.id !== text.id).map((t) => ({ x: t.x, y: t.y, w: t.boxWidth, h: t.boxHeight })),
    ],
    [allImages, allTexts, text.id],
  );
  const resolveFreeformTarget = useCallback(
    (x: number, y: number, shiftKey: boolean) => {
      let nx = x;
      let ny = y;
      if (shiftKey) {
        if (Math.abs(nx - text.x) > Math.abs(ny - text.y)) ny = text.y;
        else nx = text.x;
      }
      const thresholdPx = ALIGN_GUIDE_SNAP_THRESHOLD_SCREEN_PX / zoom;
      return snapToAlignmentGuides(nx, ny, text.boxWidth, text.boxHeight, width, height, cols, rows, thresholdPx, otherElementBoxes);
    },
    [text.x, text.y, text.boxWidth, text.boxHeight, width, height, cols, rows, zoom, otherElementBoxes],
  );

  const onPreview = useCallback(
    (x: number, y: number, shiftKey: boolean) => {
      if (showAnchors) {
        setPreview({ x, y });
        setDragPreviewNode(snapToNearestNode(x, y, width, height, cols, rows, true));
        if (isGroupDragging) setGroupDragOffset({ dx: x - text.x, dy: y - text.y });
        return;
      }
      const target = resolveFreeformTarget(x, y, shiftKey);
      setPreview({ x: target.x, y: target.y });
      setAlignmentGuide(target.guideX, target.guideY);
      if (isGroupDragging) setGroupDragOffset({ dx: target.x - text.x, dy: target.y - text.y });
    },
    [
      width,
      height,
      cols,
      rows,
      showAnchors,
      setDragPreviewNode,
      setAlignmentGuide,
      resolveFreeformTarget,
      isGroupDragging,
      text.x,
      text.y,
      setGroupDragOffset,
    ],
  );

  const onCommit = useCallback(
    (x: number, y: number, shiftKey: boolean) => {
      const target = showAnchors ? snapToNearestNode(x, y, width, height, cols, rows, true) : resolveFreeformTarget(x, y, shiftKey);
      if (isGroupDragging) {
        // Only this dragged element (the group's anchor) actually snaps to the
        // grid — the same raw delta is then applied to every other selected
        // element as-is, so the whole group's relative spacing never shifts.
        const dx = target.x - text.x;
        const dy = target.y - text.y;
        const groupImageIds = allImages.filter((i) => selectedElementIds.includes(i.id)).map((i) => i.id);
        const otherTextIds = allTexts.filter((t) => t.id !== text.id && selectedElementIds.includes(t.id)).map((t) => t.id);
        moveElementsBy(groupImageIds, otherTextIds, dx, dy);
        updateText(text.id, { x: target.x, y: target.y });
        setGroupDragOffset(null);
      } else {
        updateText(text.id, { x: target.x, y: target.y });
      }
      setPreview(null);
      setDragPreviewNode(null);
      setAlignmentGuide(null, null);
    },
    [
      width,
      height,
      cols,
      rows,
      showAnchors,
      resolveFreeformTarget,
      updateText,
      text.id,
      text.x,
      text.y,
      setDragPreviewNode,
      setAlignmentGuide,
      isGroupDragging,
      selectedElementIds,
      allImages,
      allTexts,
      moveElementsBy,
      setGroupDragOffset,
    ],
  );

  // Left-click (no drag) only selects — it no longer opens the radial menu,
  // which is now reserved for right-click (see handleContextMenu below) so a
  // plain click on a member of an existing multi-selection doesn't collapse
  // it before the user gets a chance to right-click the whole group. Double-
  // click is the fast path straight into the inline editor.
  const onTap = useCallback(
    (_screenX: number, _screenY: number, additive: boolean) => {
      if (additive) toggleElementSelection(text.id);
      else setSelectedElementId(text.id);
    },
    [text.id, toggleElementSelection, setSelectedElementId],
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (isEditing) return;
      // Right-clicking a member of an existing multi-selection opens the
      // menu for the whole selection; right-clicking anything else selects
      // just that element first, same as a plain click would.
      const alreadyInGroup = isSelected && selectedElementIds.length > 1;
      const targets = alreadyInGroup ? selectedElementIds : [text.id];
      if (!alreadyInGroup) setSelectedElementId(text.id);
      const context = resolveRadialContext(targets, allImages, allTexts);
      openRadialMenu(e.clientX, e.clientY, context, targets);
    },
    [isEditing, isSelected, selectedElementIds, text.id, allImages, allTexts, setSelectedElementId, openRadialMenu],
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      // In case a right-click had already opened the ring on this element,
      // close it back out so the pills don't sit on top of the text while
      // it's being edited.
      closeRadialMenu();
      setSelectedElementId(text.id);
      setEditingTextId(text.id);
    },
    [closeRadialMenu, setSelectedElementId, setEditingTextId, text.id],
  );

  const onDragMove = useCallback(
    (screenX: number, screenY: number) => {
      if (radialMenu?.open && radialMenu.targetIds.includes(text.id)) moveRadialMenu(screenX, screenY);
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

  const panActive = useUIStore((s) => s.panToolActive || s.isSpacePanning);

  // Every OTHER selected element (not the one actively being dragged, whose own
  // `preview` already takes precedence below) previews itself offset by the
  // shared group-drag delta while a multi-selection is being moved.
  const groupPos = isSelected && groupDragOffset ? { x: text.x + groupDragOffset.dx, y: text.y + groupDragOffset.dy } : { x: text.x, y: text.y };
  const pos = sizePreview ?? preview ?? groupPos;
  const box = sizePreview ?? { x: pos.x, y: pos.y, w: text.boxWidth, h: text.boxHeight };
  const rotation = rotationPreview ?? text.rotation;
  // While pan mode is active, the element must not intercept the drag — letting
  // pointerdown bubble to the canvas background lets the same gesture pan the
  // view even when it starts on top of a text element. Locked elements never
  // attach drag handlers at all — see ResizeHandles below for the equivalent
  // gate on resize/rotate.
  const dragHandlers = isEditing || panActive || text.locked ? {} : { onPointerDown, onPointerMove, onPointerUp };

  return (
    <div
      ref={wrapperRef}
      data-radial-context="text"
      {...dragHandlers}
      onDoubleClick={isEditing ? undefined : handleDoubleClick}
      onContextMenu={handleContextMenu}
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
        // No outlineOffset: any gap here reads as the box not actually landing
        // on a grid anchor when it resizes/snaps flush — the outline needs to
        // sit exactly on the box's true (snapped) edge, not floating outside it.
        outline: isSelected ? "1.5px solid rgb(var(--color-accent-glow) / 0.8)" : "none",
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
            fontFamily: getFontStack(text.fontFamily),
            fontSize: text.fontSize,
            fontWeight: text.bold ? 700 : 400,
            fontStyle: text.italic ? "italic" : "normal",
            textDecoration: text.underline ? "underline" : "none",
            color: hexToRgba(text.color, text.colorAlpha),
            textShadow: text.glow ? getTextGlowShadow(text.glowColor, text.glowSize) : undefined,
            writingMode: text.orientation === "vertical" ? "vertical-rl" : "horizontal-tb",
          }}
        >
          {isEditing ? undefined : text.content}
        </div>
      </div>

      {isSelected && !isEditing && !panActive && !text.locked && selectedElementIds.length === 1 && (
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
          onDragStart={closeRadialMenu}
        />
      )}
    </div>
  );
}
