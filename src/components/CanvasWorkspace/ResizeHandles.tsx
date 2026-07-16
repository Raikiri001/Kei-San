import { useUIStore } from "@/store/uiStore";
import { useResizeDrag, type ResizeCorner } from "@/hooks/useResizeDrag";
import { LockIcon, UnlockIcon } from "@/components/RadialMenu/icons";

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface ResizeHandlesProps {
  /** Reads the element's current committed box (center-anchored) at drag start. */
  getBox: () => Box;
  zoom: number;
  minW: number;
  maxW: number;
  minH: number;
  maxH: number;
  onPreview: (box: Box) => void;
  onCommit: (box: Box) => void;
  /** Cancels an ambient CSS-scale ancestor (e.g. a text element's scaleX/scaleY
   * stretch) so handles render at a consistent, undistorted size regardless of how
   * much the parent has been stretched. Defaults to 1 (no ambient scale, e.g. images). */
  counterScaleX?: number;
  counterScaleY?: number;
}

const CORNERS: { corner: ResizeCorner; position: string; cursor: string }[] = [
  { corner: "nw", position: "left-0 top-0", cursor: "nwse-resize" },
  { corner: "ne", position: "left-full top-0", cursor: "nesw-resize" },
  { corner: "sw", position: "left-0 top-full", cursor: "nesw-resize" },
  { corner: "se", position: "left-full top-full", cursor: "nwse-resize" },
];

/**
 * 4 corner resize handles + a shared aspect-lock toggle, rendered as children of an
 * already-positioned/sized element wrapper (handles are placed via 0%/100% so they
 * track the wrapper's own width/height automatically). Free-form by default —
 * holding Shift, or toggling the lock button (a global preference, not per-element),
 * constrains the drag to uniform scaling.
 */
export function ResizeHandles({
  getBox,
  zoom,
  minW,
  maxW,
  minH,
  maxH,
  onPreview,
  onCommit,
  counterScaleX = 1,
  counterScaleY = 1,
}: ResizeHandlesProps) {
  const aspectLocked = useUIStore((s) => s.aspectLocked);
  const toggleAspectLocked = useUIStore((s) => s.toggleAspectLocked);

  return (
    <>
      {CORNERS.map(({ corner, position, cursor }, idx) => (
        <ResizeHandle
          key={corner}
          corner={corner}
          position={position}
          cursor={cursor}
          getBox={getBox}
          zoom={zoom}
          aspectLocked={aspectLocked}
          minW={minW}
          maxW={maxW}
          minH={minH}
          maxH={maxH}
          onPreview={onPreview}
          onCommit={onCommit}
          counterScaleX={counterScaleX}
          counterScaleY={counterScaleY}
          popDelayMs={idx * 30}
        />
      ))}
      {/* Bottom-center placement (mirroring the text pencil button's top-center spot)
          deliberately avoids all 4 corners so it never overlaps a resize handle's hit
          area, even at low zoom where both shrink to just a few screen px. */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggleAspectLocked();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        title={aspectLocked ? "Aspect ratio locked" : "Aspect ratio unlocked (hold Shift to lock temporarily)"}
        className={`glass-panel absolute left-1/2 top-full z-10 flex h-6 w-6 items-center justify-center ${
          aspectLocked ? "border-accent/70 text-accent" : "opacity-70 hover:opacity-100"
        }`}
        style={{ transform: `translate(-50%, 0.5rem) scale(${counterScaleX}, ${counterScaleY})` }}
      >
        <span className="flex h-3.5 w-3.5 items-center justify-center">{aspectLocked ? <LockIcon /> : <UnlockIcon />}</span>
      </button>
    </>
  );
}

interface ResizeHandleProps extends ResizeHandlesProps {
  corner: ResizeCorner;
  position: string;
  cursor: string;
  aspectLocked: boolean;
  popDelayMs: number;
}

function ResizeHandle({
  corner,
  position,
  cursor,
  getBox,
  zoom,
  aspectLocked,
  minW,
  maxW,
  minH,
  maxH,
  onPreview,
  onCommit,
  counterScaleX = 1,
  counterScaleY = 1,
  popDelayMs,
}: ResizeHandleProps) {
  const { onPointerDown, onPointerMove, onPointerUp } = useResizeDrag({
    corner,
    getBox,
    zoom,
    aspectLocked,
    minW,
    maxW,
    minH,
    maxH,
    onPreview,
    onCommit,
  });

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      className={`glass-panel border-accent/60 handle-pop absolute z-10 h-2.5 w-2.5 touch-none ${position}`}
      style={{
        cursor,
        transform: `translate(-50%, -50%) scale(${counterScaleX}, ${counterScaleY})`,
        animationDelay: `${popDelayMs}ms`,
      }}
    />
  );
}
