import { useGridNodes } from "@/hooks/useGridNodes";
import type { GridNode } from "@/utils/grid";

interface GridOverlayProps {
  width: number;
  height: number;
  cols: number;
  rows: number;
  /** The node an in-progress drag would snap to on release, if any — rendered as a solid glowing highlight. */
  nearestSnapNode?: GridNode | null;
}

const ANCHOR_SIZE = 5;
const ANCHOR_HIGHLIGHT_SIZE = 12;

/**
 * Grid lines + anchor-node markers showing the current snap lattice — a
 * rendering hint, not a stored element. Lines/anchors intentionally use
 * `mix-blend-mode: difference` against the canvas's own background/image
 * content (not a `--chrome-*` theme variable): difference-blended white stays
 * visibly contrasted against any arbitrary user-chosen background color, dark
 * or light. Don't "fix" this back to a theme var — that's exactly what made
 * the old flat-opacity lines disappear against light/bright backgrounds.
 */
export function GridOverlay({ width, height, cols, rows, nearestSnapNode }: GridOverlayProps) {
  const cellWidth = width / cols;
  const cellHeight = height / rows;
  const nodes = useGridNodes(width, height, cols, rows);

  return (
    <div className="pointer-events-none absolute inset-0">
      <div
        className="absolute inset-0"
        style={{
          mixBlendMode: "difference",
          backgroundImage:
            "linear-gradient(to right, rgb(255 255 255 / 0.35) 1px, transparent 1px)," +
            "linear-gradient(to bottom, rgb(255 255 255 / 0.35) 1px, transparent 1px)",
          backgroundSize: `${cellWidth}px ${cellHeight}px`,
        }}
      />
      {nodes.map((node) => (
        <div
          key={`${node.x}-${node.y}`}
          className="absolute rounded-full"
          style={{
            mixBlendMode: "difference",
            background: "white",
            width: ANCHOR_SIZE,
            height: ANCHOR_SIZE,
            left: node.x,
            top: node.y,
            transform: "translate(-50%, -50%)",
          }}
        />
      ))}
      {nearestSnapNode && (
        <div
          className="absolute rounded-full"
          style={{
            background: "var(--color-accent)",
            boxShadow: "0 0 10px 3px rgb(var(--color-accent-glow) / 0.7)",
            width: ANCHOR_HIGHLIGHT_SIZE,
            height: ANCHOR_HIGHLIGHT_SIZE,
            left: nearestSnapNode.x,
            top: nearestSnapNode.y,
            transform: "translate(-50%, -50%)",
          }}
        />
      )}
    </div>
  );
}
