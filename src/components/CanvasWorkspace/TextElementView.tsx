import { useCallback, useEffect, useRef, useState } from "react";
import { useProjectStore } from "@/store/projectStore";
import { useUIStore } from "@/store/uiStore";
import { useDrag } from "@/hooks/useDrag";
import { snapToNearestNode } from "@/utils/grid";
import { FONT_STACKS } from "@/constants/fonts";
import { PencilIcon } from "@/components/RadialMenu/icons";
import type { TextElement } from "@/store/types";

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
  const contentRef = useRef<HTMLDivElement>(null);

  const isSelected = selectedElementId === text.id;
  const isEditing = editingTextId === text.id;

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

  const pos = preview ?? { x: text.x, y: text.y };
  const dragHandlers = isEditing ? {} : { onPointerDown, onPointerMove, onPointerUp };

  return (
    <div
      data-radial-context="text"
      {...dragHandlers}
      className="absolute max-w-[80vw] touch-none whitespace-pre-wrap text-center"
      style={{
        left: 0,
        top: 0,
        transform: `translate(${pos.x}px, ${pos.y}px) translate(-50%, -50%)`,
        fontFamily: FONT_STACKS[text.fontFamily],
        fontSize: text.fontSize,
        color: text.color,
        writingMode: text.orientation === "vertical" ? "vertical-rl" : "horizontal-tb",
        outline: isSelected ? "1.5px solid rgb(var(--color-accent-glow) / 0.8)" : "none",
        outlineOffset: 4,
        cursor: isEditing ? "text" : "grab",
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
          className="glass-panel absolute -right-3 -top-3 z-10 flex h-6 w-6 items-center justify-center rounded-full"
          style={{ writingMode: "horizontal-tb" }}
          aria-label="Open text tools"
        >
          <PencilIcon />
        </button>
      )}
    </div>
  );
}
