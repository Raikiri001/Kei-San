import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { useProjectStore } from "@/store/projectStore";
import { useUIStore } from "@/store/uiStore";
import { useDrag } from "@/hooks/useDrag";
import { useLoadedImage } from "@/hooks/useLoadedImage";
import { snapToNearestNode } from "@/utils/grid";
import { drawHalftone, resolveInkColor } from "@/canvas/halftone";
import { getEdgeAverageColor, getEdgeGlowBoxShadow } from "@/canvas/edgeBlend";
import { edgeColorCache } from "@/canvas/analysisCaches";
import { DISPLAY_SIZE_MAX, DISPLAY_SIZE_MIN, CROP_ZOOM_MIN, CROP_ZOOM_MAX, CROP_ZOOM_WHEEL_STEP } from "@/constants/defaults";
import { ResizeHandles } from "@/components/CanvasWorkspace/ResizeHandles";
import type { RGB } from "@/canvas/colorExtraction";
import type { ImageElement } from "@/store/types";

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

interface CropState {
  zoom: number;
  offsetX: number;
  offsetY: number;
}

export function ImageElementView({ image }: { image: ImageElement }) {
  const width = useProjectStore((s) => s.project.width);
  const height = useProjectStore((s) => s.project.height);
  const cols = useProjectStore((s) => s.project.cols);
  const rows = useProjectStore((s) => s.project.rows);
  const backgroundColor = useProjectStore((s) => s.project.backgroundColor);
  const updateImage = useProjectStore((s) => s.updateImage);
  const zoom = useUIStore((s) => s.zoom);
  const openRadialMenu = useUIStore((s) => s.openRadialMenu);
  const closeRadialMenu = useUIStore((s) => s.closeRadialMenu);
  const moveRadialMenu = useUIStore((s) => s.moveRadialMenu);
  const radialMenu = useUIStore((s) => s.radialMenu);
  const selectedElementId = useUIStore((s) => s.selectedElementId);
  const setSelectedElementId = useUIStore((s) => s.setSelectedElementId);
  const croppingImageId = useUIStore((s) => s.croppingImageId);
  const setCroppingImageId = useUIStore((s) => s.setCroppingImageId);

  const [preview, setPreview] = useState<{ x: number; y: number } | null>(null);
  const [sizePreview, setSizePreview] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [rotationPreview, setRotationPreview] = useState<number | null>(null);
  const [cropPreview, setCropPreview] = useState<CropState | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const cropContentRef = useRef<HTMLDivElement>(null);
  const cropDragRef = useRef<{ startScreenX: number; startScreenY: number; start: CropState } | null>(null);

  const isSelected = selectedElementId === image.id;
  const isCropping = croppingImageId === image.id;

  // Only decoded when actually needed (halftone canvas, or an edge-blend color
  // that was never eagerly cached at upload time e.g. images restored from a
  // saved design).
  const needsDecodedImage = image.circleMask || (image.edgeBlend && !edgeColorCache.get(image.dataUrl));
  const loadedImg = useLoadedImage(needsDecodedImage ? image.dataUrl : null);

  const setDragPreviewNode = useUIStore((s) => s.setDragPreviewNode);

  const getPosition = useCallback(() => ({ x: image.x, y: image.y }), [image.x, image.y]);

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
      updateImage(image.id, { x: snapped.x, y: snapped.y });
      setPreview(null);
      setDragPreviewNode(null);
    },
    [width, height, cols, rows, updateImage, image.id, setDragPreviewNode],
  );

  const onTap = useCallback(
    (screenX: number, screenY: number) => openRadialMenu(screenX, screenY, "image", image.id),
    [openRadialMenu, image.id],
  );

  const getResizeBox = useCallback(
    () => ({ x: image.x, y: image.y, w: image.displayWidth, h: image.displayHeight }),
    [image.x, image.y, image.displayWidth, image.displayHeight],
  );
  const onResizePreview = useCallback((box: { x: number; y: number; w: number; h: number }) => setSizePreview(box), []);
  const onResizeCommit = useCallback(
    (box: { x: number; y: number; w: number; h: number }) => {
      updateImage(image.id, { x: box.x, y: box.y, displayWidth: box.w, displayHeight: box.h });
      setSizePreview(null);
    },
    [updateImage, image.id],
  );

  const getScreenCenter = useCallback(() => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    return rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : { x: 0, y: 0 };
  }, []);
  const onRotatePreview = useCallback((rotationDeg: number) => setRotationPreview(rotationDeg), []);
  const onRotateCommit = useCallback(
    (rotationDeg: number) => {
      updateImage(image.id, { rotation: rotationDeg });
      setRotationPreview(null);
    },
    [updateImage, image.id],
  );

  const onDragMove = useCallback(
    (screenX: number, screenY: number) => {
      if (radialMenu?.open && radialMenu.targetId === image.id) moveRadialMenu(screenX, screenY);
    },
    [radialMenu, moveRadialMenu, image.id],
  );

  const { onPointerDown, onPointerMove, onPointerUp } = useDrag({
    getPosition,
    zoom,
    onPreview,
    onCommit,
    onTap,
    onDragMove,
  });

  // Live crop state (zoom + pan), previewed locally while dragging/scrolling and
  // only written back to the store on commit — same preview/commit split used
  // for position/size/rotation above.
  const cropZoom = cropPreview?.zoom ?? image.cropZoom;
  const cropOffsetX = cropPreview?.offsetX ?? image.cropOffsetX;
  const cropOffsetY = cropPreview?.offsetY ?? image.cropOffsetY;

  const commitCrop = useCallback(() => {
    if (cropPreview) {
      updateImage(image.id, { cropZoom: cropPreview.zoom, cropOffsetX: cropPreview.offsetX, cropOffsetY: cropPreview.offsetY });
      setCropPreview(null);
    }
  }, [cropPreview, updateImage, image.id]);

  const exitCropMode = useCallback(() => {
    commitCrop();
    setCroppingImageId(null);
  }, [commitCrop, setCroppingImageId]);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isCropping) {
        exitCropMode();
      } else {
        setSelectedElementId(image.id);
        setCroppingImageId(image.id);
      }
    },
    [isCropping, exitCropMode, setSelectedElementId, setCroppingImageId, image.id],
  );

  // Selecting something else (another element, or clicking the background)
  // always ends crop mode for this image — same "click away to commit"
  // convention as Illustrator/Photoshop's clip-content editing.
  useEffect(() => {
    if (isCropping && selectedElementId !== image.id) exitCropMode();
  }, [selectedElementId, image.id, isCropping, exitCropMode]);

  useEffect(() => {
    if (!isCropping) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" || e.key === "Enter") exitCropMode();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isCropping, exitCropMode]);

  // Wheel (plain mouse scroll, or a trackpad pinch — browsers report pinch
  // gestures as wheel events too) zooms the crop while double-clicked in.
  // This MUST be a real native listener with { passive: false }, not React's
  // onWheel prop: React registers its synthetic wheel listener as passive
  // (matching native scroll-perf conventions), which silently no-ops
  // preventDefault after the first tick or two — letting the gesture fall
  // through to the browser's own pinch-to-zoom-the-page behavior instead of
  // staying scoped to this crop. A plain addEventListener with passive:false
  // is the only way to make preventDefault actually stick for every tick.
  const cropLiveRef = useRef({ cropZoom, cropOffsetX, cropOffsetY });
  cropLiveRef.current = { cropZoom, cropOffsetX, cropOffsetY };

  useEffect(() => {
    const el = cropContentRef.current;
    if (!el || !isCropping) return;
    function onWheelNative(e: WheelEvent) {
      e.preventDefault();
      e.stopPropagation();
      const { cropZoom: z, cropOffsetX: ox, cropOffsetY: oy } = cropLiveRef.current;
      const nextZoom = clamp(z - e.deltaY * CROP_ZOOM_WHEEL_STEP, CROP_ZOOM_MIN, CROP_ZOOM_MAX);
      setCropPreview({ zoom: nextZoom, offsetX: ox, offsetY: oy });
    }
    el.addEventListener("wheel", onWheelNative, { passive: false });
    return () => el.removeEventListener("wheel", onWheelNative);
  }, [isCropping]);

  const handleCropPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      cropDragRef.current = {
        startScreenX: e.clientX,
        startScreenY: e.clientY,
        start: { zoom: cropZoom, offsetX: cropOffsetX, offsetY: cropOffsetY },
      };
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    },
    [cropZoom, cropOffsetX, cropOffsetY],
  );

  const handleCropPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const state = cropDragRef.current;
      if (!state) return;
      const deltaX = (e.clientX - state.startScreenX) / zoom;
      const deltaY = (e.clientY - state.startScreenY) / zoom;
      const maxPanX = (image.displayWidth * (state.start.zoom - 1)) / 2;
      const maxPanY = (image.displayHeight * (state.start.zoom - 1)) / 2;
      const nextOffsetX = maxPanX > 0 ? clamp(state.start.offsetX + deltaX / maxPanX, -1, 1) : 0;
      const nextOffsetY = maxPanY > 0 ? clamp(state.start.offsetY + deltaY / maxPanY, -1, 1) : 0;
      setCropPreview({ zoom: state.start.zoom, offsetX: nextOffsetX, offsetY: nextOffsetY });
    },
    [zoom, image.displayWidth, image.displayHeight],
  );

  const handleCropPointerUp = useCallback(() => {
    cropDragRef.current = null;
    commitCrop();
  }, [commitCrop]);

  // Redraws only when the halftone-relevant inputs change — deliberately excludes
  // x/y, which are handled entirely by this wrapper's CSS transform below.
  useEffect(() => {
    if (!image.circleMask || !loadedImg || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = Math.ceil(image.displayWidth);
    canvas.height = Math.ceil(image.displayHeight);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const inkColor = resolveInkColor(backgroundColor);
    drawHalftone(
      ctx,
      loadedImg,
      0,
      0,
      image.displayWidth,
      image.displayHeight,
      image.halftoneMode,
      inkColor,
      image.halftoneDotPitch,
      cropZoom,
      cropOffsetX,
      cropOffsetY,
    );
  }, [
    loadedImg,
    image.displayWidth,
    image.displayHeight,
    image.circleMask,
    image.halftoneMode,
    image.halftoneDotPitch,
    backgroundColor,
    cropZoom,
    cropOffsetX,
    cropOffsetY,
  ]);

  const panActive = useUIStore((s) => s.panToolActive || s.isSpacePanning);

  const pos = preview ?? { x: image.x, y: image.y };
  const box = sizePreview ?? { x: pos.x, y: pos.y, w: image.displayWidth, h: image.displayHeight };
  const rotation = rotationPreview ?? image.rotation;
  // While pan mode or crop mode is active, the element must not intercept the
  // normal move-drag — crop mode swaps in its own pan/zoom handlers below instead.
  const dragHandlers = panActive || isCropping ? {} : { onPointerDown, onPointerMove, onPointerUp };
  const cropHandlers = isCropping
    ? {
        onPointerDown: handleCropPointerDown,
        onPointerMove: handleCropPointerMove,
        onPointerUp: handleCropPointerUp,
      }
    : {};

  // Image is stretched to exactly (box.w*cropZoom, box.h*cropZoom) and clipped by
  // the overflow-hidden content wrapper below — at cropZoom=1 (the default) this
  // is exactly box.w x box.h, i.e. the whole image squished to fill the frame
  // with no cropping at all. Panning/zooming further in is what implements the
  // separate crop function; the two aren't mutually exclusive.
  const panX = cropOffsetX * ((box.w * cropZoom - box.w) / 2);
  const panY = cropOffsetY * ((box.h * cropZoom - box.h) / 2);

  const [edgeColor, setEdgeColor] = useState<RGB | null>(() =>
    image.edgeBlend ? (edgeColorCache.get(image.dataUrl) ?? null) : null,
  );

  useEffect(() => {
    if (!image.edgeBlend) {
      setEdgeColor(null);
      return;
    }
    const cached = edgeColorCache.get(image.dataUrl);
    if (cached) {
      setEdgeColor(cached);
      return;
    }
    if (loadedImg) {
      const computed = getEdgeAverageColor(loadedImg);
      edgeColorCache.set(image.dataUrl, computed);
      setEdgeColor(computed);
    }
  }, [image.edgeBlend, image.dataUrl, loadedImg]);

  return (
    <div
      ref={wrapperRef}
      data-radial-context="image"
      {...dragHandlers}
      onDoubleClick={handleDoubleClick}
      className={clsx(
        "absolute touch-none",
        !panActive && !isCropping && "cursor-grab active:cursor-grabbing",
        isCropping && "cursor-move",
      )}
      style={{
        left: 0,
        top: 0,
        width: box.w,
        height: box.h,
        // Centering translate must come *before* rotate in the function list,
        // not after — see the matching comment in TextElementView.tsx for why
        // CSS's transform-origin (which wraps the whole composed transform as
        // one unit, not per-function) makes the two orders behave completely
        // differently: this order pivots rotation exactly on the box's own
        // center for any angle; the previous order let the pivot drift away
        // from center as rotation increased.
        transform: `translate(${box.x}px, ${box.y}px) translate(${-box.w / 2}px, ${-box.h / 2}px) rotate(${rotation}deg)`,
        // No outlineOffset (same fix as TextElementView): a gap here reads as
        // the box not actually landing on a grid anchor when it resizes/snaps
        // flush — the outline (and the dashed crop frame) needs to sit
        // exactly on the box's true edge, not floating outside it.
        outline: isCropping
          ? "1.5px dashed rgb(var(--color-accent-glow) / 0.9)"
          : isSelected
            ? "1.5px solid rgb(var(--color-accent-glow) / 0.8)"
            : "none",
        boxShadow: edgeColor ? getEdgeGlowBoxShadow(edgeColor, image.edgeBlendMargin) : undefined,
      }}
    >
      <div
        ref={cropContentRef}
        className="relative h-full w-full touch-none overflow-hidden"
        // Opacity lives on the content div, not the outer wrapper — the
        // selection outline/resize handles stay fully visible even when the
        // image itself is highly transparent, instead of fading along with it.
        style={{ opacity: image.opacity }}
        {...cropHandlers}
      >
        {image.circleMask ? (
          <canvas ref={canvasRef} className="h-full w-full" />
        ) : (
          <img
            src={image.dataUrl}
            alt=""
            draggable={false}
            className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
            style={{
              width: box.w * cropZoom,
              height: box.h * cropZoom,
              transform: `translate(-50%, -50%) translate(${panX}px, ${panY}px)`,
            }}
          />
        )}
      </div>

      {isCropping && (
        <div
          className="glass-panel absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap px-2.5 py-1 text-[10px] uppercase tracking-wide opacity-80"
          style={{ transform: `translate(-50%, 0) rotate(${-rotation}deg)` }}
        >
          Scroll to zoom · Drag to pan · Esc to finish
        </div>
      )}

      {isSelected && !panActive && !isCropping && (
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
