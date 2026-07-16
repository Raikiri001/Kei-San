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
import { DISPLAY_SIZE_MAX, DISPLAY_SIZE_MIN } from "@/constants/defaults";
import { ResizeHandles } from "@/components/CanvasWorkspace/ResizeHandles";
import type { RGB } from "@/canvas/colorExtraction";
import type { ImageElement } from "@/store/types";

export function ImageElementView({ image }: { image: ImageElement }) {
  const width = useProjectStore((s) => s.project.width);
  const height = useProjectStore((s) => s.project.height);
  const cols = useProjectStore((s) => s.project.cols);
  const rows = useProjectStore((s) => s.project.rows);
  const backgroundColor = useProjectStore((s) => s.project.backgroundColor);
  const updateImage = useProjectStore((s) => s.updateImage);
  const zoom = useUIStore((s) => s.zoom);
  const openRadialMenu = useUIStore((s) => s.openRadialMenu);
  const moveRadialMenu = useUIStore((s) => s.moveRadialMenu);
  const radialMenu = useUIStore((s) => s.radialMenu);
  const selectedElementId = useUIStore((s) => s.selectedElementId);

  const [preview, setPreview] = useState<{ x: number; y: number } | null>(null);
  const [sizePreview, setSizePreview] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
    );
  }, [
    loadedImg,
    image.displayWidth,
    image.displayHeight,
    image.circleMask,
    image.halftoneMode,
    image.halftoneDotPitch,
    backgroundColor,
  ]);

  const panActive = useUIStore((s) => s.panToolActive || s.isSpacePanning);

  const pos = preview ?? { x: image.x, y: image.y };
  const box = sizePreview ?? { x: pos.x, y: pos.y, w: image.displayWidth, h: image.displayHeight };
  const isSelected = selectedElementId === image.id;
  // While pan mode is active, the element must not intercept the drag — letting
  // pointerdown bubble to the canvas background lets the same gesture pan the
  // view even when it starts on top of an image.
  const dragHandlers = panActive ? {} : { onPointerDown, onPointerMove, onPointerUp };

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
      data-radial-context="image"
      {...dragHandlers}
      className={clsx("absolute touch-none", !panActive && "cursor-grab active:cursor-grabbing")}
      style={{
        left: 0,
        top: 0,
        width: box.w,
        height: box.h,
        transform: `translate(${box.x - box.w / 2}px, ${box.y - box.h / 2}px)`,
        outline: isSelected ? "1.5px solid rgb(var(--color-accent-glow) / 0.8)" : "none",
        outlineOffset: 2,
        boxShadow: edgeColor ? getEdgeGlowBoxShadow(edgeColor, image.edgeBlendMargin) : undefined,
      }}
    >
      {image.circleMask ? (
        <canvas ref={canvasRef} className="h-full w-full" />
      ) : (
        <img
          src={image.dataUrl}
          alt=""
          draggable={false}
          className="h-full w-full select-none object-cover"
        />
      )}
      {isSelected && !panActive && (
        <ResizeHandles
          getBox={getResizeBox}
          zoom={zoom}
          minW={DISPLAY_SIZE_MIN}
          maxW={DISPLAY_SIZE_MAX}
          minH={DISPLAY_SIZE_MIN}
          maxH={DISPLAY_SIZE_MAX}
          onPreview={onResizePreview}
          onCommit={onResizeCommit}
        />
      )}
    </div>
  );
}
