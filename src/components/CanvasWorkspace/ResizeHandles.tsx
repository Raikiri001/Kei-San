import { useUIStore } from "@/store/uiStore";
import { useResizeDrag, type ResizeHandleId } from "@/hooks/useResizeDrag";
import { useRotateDrag } from "@/hooks/useRotateDrag";
import { LockIcon, UnlockIcon } from "@/components/RadialMenu/icons";
import {
  HANDLE_HIT_SIZE,
  HANDLE_VISUAL_SIZE,
  ROTATE_HANDLE_HIT_SIZE,
  ROTATE_HANDLE_OFFSET,
  ROTATE_HANDLE_VISUAL_SIZE,
} from "@/constants/defaults";

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface ResizeHandlesProps {
  /** Reads the element's current committed box (center-anchored) at drag start. */
  getBox: () => Box;
  /** Current committed rotation in degrees. Resize handles need this to correctly
   * compensate drag deltas (see useResizeDrag.ts); the rotate handle needs it as
   * its own drag's starting value. */
  rotation: number;
  zoom: number;
  minW: number;
  maxW: number;
  minH: number;
  maxH: number;
  onPreview: (box: Box) => void;
  onCommit: (box: Box) => void;
  onRotatePreview: (rotationDeg: number) => void;
  onRotateCommit: (rotationDeg: number) => void;
  /** Viewport (screen-space) center of the element, for the rotate handle's angle math. */
  getScreenCenter: () => { x: number; y: number };
  /** Cancels an ambient CSS-scale ancestor (e.g. a text element's scaleX/scaleY
   * stretch) so handles render at a consistent, undistorted size regardless of how
   * much the parent has been stretched. Defaults to 1 (no ambient scale, e.g. images). */
  counterScaleX?: number;
  counterScaleY?: number;
}

const HANDLES: { id: ResizeHandleId; position: string; cursor: string }[] = [
  { id: "nw", position: "left-0 top-0", cursor: "nwse-resize" },
  { id: "n", position: "left-1/2 top-0", cursor: "ns-resize" },
  { id: "ne", position: "left-full top-0", cursor: "nesw-resize" },
  { id: "e", position: "left-full top-1/2", cursor: "ew-resize" },
  { id: "se", position: "left-full top-full", cursor: "nwse-resize" },
  { id: "s", position: "left-1/2 top-full", cursor: "ns-resize" },
  { id: "sw", position: "left-0 top-full", cursor: "nesw-resize" },
  { id: "w", position: "left-0 top-1/2", cursor: "ew-resize" },
];

/**
 * 8 resize handles (4 corners + 4 edge midpoints) + a rotate handle + a shared
 * aspect-lock toggle, rendered as children of an already-positioned/sized/rotated
 * element wrapper — handles are placed via 0%/50%/100% so they track the
 * wrapper's own width/height automatically, and since they're DOM children of
 * the wrapper's own `rotate()` transform, they visually follow the element's
 * current rotation for free (no extra position math needed here for that).
 *
 * Shift's meaning is scoped per-handle, not global:
 *   - corner drag:  Shift = uniform (aspect-locked) scale
 *   - edge drag:    Shift is ignored — always single-axis
 *   - rotate drag:  Shift = snap to the nearest ROTATION_SNAP_DEGREES (15°) increment
 * See useResizeDrag.ts / useRotateDrag.ts for the implementations.
 */
export function ResizeHandles({
  getBox,
  rotation,
  zoom,
  minW,
  maxW,
  minH,
  maxH,
  onPreview,
  onCommit,
  onRotatePreview,
  onRotateCommit,
  getScreenCenter,
  counterScaleX = 1,
  counterScaleY = 1,
}: ResizeHandlesProps) {
  const aspectLocked = useUIStore((s) => s.aspectLocked);
  const toggleAspectLocked = useUIStore((s) => s.toggleAspectLocked);
  const getRotation = () => rotation;

  return (
    <>
      {HANDLES.map(({ id, position, cursor }, idx) => (
        <ResizeHandle
          key={id}
          handle={id}
          position={position}
          cursor={cursor}
          getBox={getBox}
          getRotation={getRotation}
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
          popDelayMs={idx * 25}
        />
      ))}

      <RotateHandle
        getScreenCenter={getScreenCenter}
        getRotation={getRotation}
        onPreview={onRotatePreview}
        onCommit={onRotateCommit}
        counterScaleX={counterScaleX}
        counterScaleY={counterScaleY}
      />

      {/* Diagonal offset beyond the se corner (rather than the old bottom-center
          spot, which the new `s` edge handle now occupies) so it never overlaps
          a resize handle's — now larger — hit area. */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggleAspectLocked();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        title={aspectLocked ? "Aspect ratio locked" : "Aspect ratio unlocked (hold Shift to lock temporarily)"}
        className={`glass-panel absolute left-full top-full z-10 flex h-6 w-6 items-center justify-center transition-[color,opacity,border-color] duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          aspectLocked ? "border-accent/70 text-accent" : "opacity-70 hover:opacity-100"
        }`}
        style={{ transform: `translate(1.25rem, 1.25rem) scale(${counterScaleX}, ${counterScaleY})` }}
      >
        <span className="flex h-3.5 w-3.5 items-center justify-center">{aspectLocked ? <LockIcon /> : <UnlockIcon />}</span>
      </button>
    </>
  );
}

interface ResizeHandleProps {
  handle: ResizeHandleId;
  position: string;
  cursor: string;
  getBox: () => Box;
  getRotation: () => number;
  zoom: number;
  aspectLocked: boolean;
  minW: number;
  maxW: number;
  minH: number;
  maxH: number;
  onPreview: (box: Box) => void;
  onCommit: (box: Box) => void;
  counterScaleX: number;
  counterScaleY: number;
  popDelayMs: number;
}

function ResizeHandle({
  handle,
  position,
  cursor,
  getBox,
  getRotation,
  zoom,
  aspectLocked,
  minW,
  maxW,
  minH,
  maxH,
  onPreview,
  onCommit,
  counterScaleX,
  counterScaleY,
  popDelayMs,
}: ResizeHandleProps) {
  const { onPointerDown, onPointerMove, onPointerUp } = useResizeDrag({
    handle,
    getBox,
    getRotation,
    zoom,
    aspectLocked,
    minW,
    maxW,
    minH,
    maxH,
    onPreview,
    onCommit,
  });

  // Small visible dot (HANDLE_VISUAL_SIZE) inside a larger invisible pointer
  // target (HANDLE_HIT_SIZE) — the standard "easy to grab, not oversized"
  // pattern, rather than literally enlarging the visible square.
  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      className={`absolute z-10 flex touch-none items-center justify-center ${position}`}
      style={{
        width: HANDLE_HIT_SIZE,
        height: HANDLE_HIT_SIZE,
        cursor,
        transform: `translate(-50%, -50%) scale(${counterScaleX}, ${counterScaleY})`,
      }}
    >
      <span
        className="handle-dot handle-pop"
        style={{ width: HANDLE_VISUAL_SIZE, height: HANDLE_VISUAL_SIZE, animationDelay: `${popDelayMs}ms` }}
      />
    </div>
  );
}

interface RotateHandleProps {
  getScreenCenter: () => { x: number; y: number };
  getRotation: () => number;
  onPreview: (rotationDeg: number) => void;
  onCommit: (rotationDeg: number) => void;
  counterScaleX: number;
  counterScaleY: number;
}

/** Small circular handle + connecting stem, distinct in shape from the square
 * resize dots, anchored top-center above the element — the standard
 * Illustrator/Photoshop rotate-handle position. Text elements' pencil "edit
 * text" button used to sit at this same top-center spot; it has been moved to
 * a diagonal offset beyond the NE corner instead (see TextElementView.tsx) so
 * this component stays identical for both image and text consumers rather
 * than needing to special-case one of them. */
function RotateHandle({ getScreenCenter, getRotation, onPreview, onCommit, counterScaleX, counterScaleY }: RotateHandleProps) {
  const { onPointerDown, onPointerMove, onPointerUp } = useRotateDrag({
    getScreenCenter,
    getRotation,
    onPreview,
    onCommit,
  });

  return (
    <div className="absolute left-1/2 top-0 z-10" style={{ transform: `scale(${counterScaleX}, ${counterScaleY})` }}>
      <span
        className="absolute left-1/2 top-0 w-px bg-[rgb(var(--color-accent-glow)/0.7)]"
        style={{ height: ROTATE_HANDLE_OFFSET, transform: "translate(-50%, -100%)" }}
      />
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        title="Rotate (hold Shift to snap to 15°)"
        className="absolute flex touch-none items-center justify-center rounded-full"
        style={{
          left: "50%",
          top: -ROTATE_HANDLE_OFFSET,
          width: ROTATE_HANDLE_HIT_SIZE,
          height: ROTATE_HANDLE_HIT_SIZE,
          cursor: "grab",
          transform: "translate(-50%, -50%)",
        }}
      >
        <span
          className="handle-dot handle-pop rounded-full"
          style={{ width: ROTATE_HANDLE_VISUAL_SIZE, height: ROTATE_HANDLE_VISUAL_SIZE }}
        />
      </div>
    </div>
  );
}
