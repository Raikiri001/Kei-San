import { useGridNodes } from "@/hooks/useGridNodes";
import { useUIStore } from "@/store/uiStore";
import type { GridNode } from "@/utils/grid";

interface GridOverlayProps {
  width: number;
  height: number;
  cols: number;
  rows: number;
  /** The node an in-progress drag would snap to on release, if any — rendered as a solid glowing highlight. */
  nearestSnapNode?: GridNode | null;
  /** Full-length smart-guide lines an in-progress free-form (anchors-off) move
   * is currently aligned to, canvas px — null on an axis with no alignment. */
  alignmentGuideX?: number | null;
  alignmentGuideY?: number | null;
}

const ANCHOR_SIZE = 5;
const ANCHOR_HIGHLIGHT_SIZE = 12;
const ALIGNMENT_GUIDE_THICKNESS = 1.5;

/**
 * Grid lines + anchor-node markers showing the current snap lattice — a
 * rendering hint, not a stored element. Lines/anchors intentionally use
 * `mix-blend-mode: difference` against the canvas's own background/image
 * content (not a `--chrome-*` theme variable): difference-blended white stays
 * visibly contrasted against any arbitrary user-chosen background color, dark
 * or light. Don't "fix" this back to a theme var — that's exactly what made
 * the old flat-opacity lines disappear against light/bright backgrounds.
 */
export function GridOverlay({ width, height, cols, rows, nearestSnapNode, alignmentGuideX, alignmentGuideY }: GridOverlayProps) {
  const cellWidth = width / cols;
  const cellHeight = height / rows;
  const nodes = useGridNodes(width, height, cols, rows);
  const showAnchors = useUIStore((s) => s.showAnchors);

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
      {showAnchors &&
        nodes.map((node) => (
          <div
            key={`${node.x}-${node.y}`}
            className="absolute"
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
          className="absolute"
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
      {/* Illustrator/InDesign-style smart-guide lines: full-canvas-length, shown
          only while a free-form (anchors-off) move is currently aligned to a
          row/column line or the canvas mid-line — see snapToAlignmentGuides. */}
      {alignmentGuideX != null && (
        <div
          className="absolute inset-y-0"
          style={{
            left: alignmentGuideX,
            width: ALIGNMENT_GUIDE_THICKNESS,
            background: "var(--color-accent)",
            boxShadow: "0 0 8px 1px rgb(var(--color-accent-glow) / 0.7)",
            transform: "translateX(-50%)",
          }}
        />
      )}
      {alignmentGuideY != null && (
        <div
          className="absolute inset-x-0"
          style={{
            top: alignmentGuideY,
            height: ALIGNMENT_GUIDE_THICKNESS,
            background: "var(--color-accent)",
            boxShadow: "0 0 8px 1px rgb(var(--color-accent-glow) / 0.7)",
            transform: "translateY(-50%)",
          }}
        />
      )}
    </div>
  );
}
