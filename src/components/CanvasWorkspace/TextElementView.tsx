import { useCallback, useState } from "react";
import { useProjectStore } from "@/store/projectStore";
import { useUIStore } from "@/store/uiStore";
import { useDrag } from "@/hooks/useDrag";
import { snapToNearestNode } from "@/utils/grid";
import { FONT_STACKS } from "@/constants/fonts";
import type { TextElement } from "@/store/types";

export function TextElementView({ text }: { text: TextElement }) {
  const width = useProjectStore((s) => s.project.width);
  const height = useProjectStore((s) => s.project.height);
  const cols = useProjectStore((s) => s.project.cols);
  const rows = useProjectStore((s) => s.project.rows);
  const updateText = useProjectStore((s) => s.updateText);
  const zoom = useUIStore((s) => s.zoom);
  const openRadialMenu = useUIStore((s) => s.openRadialMenu);
  const selectedElementId = useUIStore((s) => s.selectedElementId);

  const [preview, setPreview] = useState<{ x: number; y: number } | null>(null);

  const getPosition = useCallback(() => ({ x: text.x, y: text.y }), [text.x, text.y]);
  const onPreview = useCallback((x: number, y: number) => setPreview({ x, y }), []);

  const onCommit = useCallback(
    (x: number, y: number) => {
      const snapped = snapToNearestNode(x, y, width, height, cols, rows);
      updateText(text.id, { x: snapped.x, y: snapped.y });
      setPreview(null);
    },
    [width, height, cols, rows, updateText, text.id],
  );

  const onTap = useCallback(
    (screenX: number, screenY: number) => openRadialMenu(screenX, screenY, "text", text.id),
    [openRadialMenu, text.id],
  );

  const { onPointerDown, onPointerMove, onPointerUp } = useDrag({ getPosition, zoom, onPreview, onCommit, onTap });

  const pos = preview ?? { x: text.x, y: text.y };
  const isSelected = selectedElementId === text.id;

  return (
    <div
      data-radial-context="text"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      className="absolute max-w-[80vw] cursor-grab touch-none whitespace-pre-wrap text-center active:cursor-grabbing"
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
      }}
    >
      {text.content}
    </div>
  );
}
