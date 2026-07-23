import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { useProjectStore } from "@/store/projectStore";
import { useUIStore } from "@/store/uiStore";
import { useDrag } from "@/hooks/useDrag";
import { useLoadedImage } from "@/hooks/useLoadedImage";
import { snapToNearestNode, snapToAlignmentGuides } from "@/utils/grid";
import { resolveRadialContext } from "@/utils/radialContext";
import { renderEffectStack } from "@/canvas/gl/glRenderer";
import { getGLCanvas } from "@/canvas/gl/glContext";
import { getEdgeAverageColor, getEdgeGlowBoxShadow } from "@/canvas/edgeBlend";
import { renderAsciiOverlay } from "@/canvas/asciiOverlay";
import { drawBlobTrackerOverlay } from "@/canvas/blobTrackerOverlay";
import { edgeColorCache } from "@/canvas/analysisCaches";
import { computeCropSourceRect } from "@/utils/coverFit";
import { getEnabledContentLayers, getEnabledEdgeBlendLayers, getEnabledAsciiLayers, getEnabledBlobTrackerLayers } from "@/store/imageEffects";
import {
  DISPLAY_SIZE_MAX,
  DISPLAY_SIZE_MIN,
  CROP_ZOOM_MIN,
  CROP_ZOOM_MAX,
  CROP_ZOOM_WHEEL_STEP,
  ALIGN_GUIDE_SNAP_THRESHOLD_SCREEN_PX,
} from "@/constants/defaults";
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
  const updateImage = useProjectStore((s) => s.updateImage);
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
  const croppingImageId = useUIStore((s) => s.croppingImageId);
  const setCroppingImageId = useUIStore((s) => s.setCroppingImageId);
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
  const [cropPreview, setCropPreview] = useState<CropState | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const cropContentRef = useRef<HTMLDivElement>(null);
  const cropDragRef = useRef<{ startScreenX: number; startScreenY: number; start: CropState } | null>(null);

  const isSelected = selectedElementIds.includes(image.id);
  const isGroupDragging = isSelected && selectedElementIds.length > 1;
  const isCropping = croppingImageId === image.id;

  // Edge Blend paints a halo outside the image's own box (not a transform of its
  // content), so enabled instances of it render via their own CSS box-shadow / canvas
  // pre-pass below instead of the shared GPU content pipeline. Both memoized (not a
  // new array every render) so the redraw effect below can safely depend on them
  // without firing on every unrelated re-render.
  const contentLayers = useMemo(() => getEnabledContentLayers(image.layers), [image.layers]);
  const edgeBlendLayers = useMemo(() => getEnabledEdgeBlendLayers(image.layers), [image.layers]);
  const asciiLayers = useMemo(() => getEnabledAsciiLayers(image.layers), [image.layers]);
  const blobTrackerLayers = useMemo(() => getEnabledBlobTrackerLayers(image.layers), [image.layers]);
  const hasContentEffectEnabled = contentLayers.length > 0;
  // ASCII Art and Blob Tracker both need a canvas too (ASCII samples/replaces whatever
  // content would otherwise be drawn; Blob Tracker draws its reticle overlay on top),
  // even on their own with no GL content effect enabled.
  const needsCanvas = hasContentEffectEnabled || asciiLayers.length > 0 || blobTrackerLayers.length > 0;

  // Only decoded when actually needed (GL/ASCII canvas, or an edge-blend color that
  // was never eagerly cached at upload time e.g. images restored from a saved design).
  const needsDecodedImage = needsCanvas || (edgeBlendLayers.length > 0 && !edgeColorCache.get(image.dataUrl));
  const loadedImg = useLoadedImage(needsDecodedImage ? image.dataUrl : null);

  const setDragPreviewNode = useUIStore((s) => s.setDragPreviewNode);
  const setAlignmentGuide = useUIStore((s) => s.setAlignmentGuide);

  const getPosition = useCallback(() => ({ x: image.x, y: image.y }), [image.x, image.y]);

  // Free-form-move (anchors off) target resolution: Shift constrains the move to
  // whichever axis has moved further from the committed position (Illustrator-
  // style controlled drag), then the result is smart-guide-snapped to the nearest
  // row/column line, canvas mid-line, OR another element's own edge/center — same
  // idea as anchors-on node-snapping, but to line *alignment* (against the grid AND
  // every other image/text on the canvas) instead of a lattice point, and only
  // engaging within a small pixel threshold instead of always-on.
  const otherElementBoxes = useMemo(
    () => [
      ...allImages.filter((i) => i.id !== image.id).map((i) => ({ x: i.x, y: i.y, w: i.displayWidth, h: i.displayHeight })),
      ...allTexts.map((t) => ({ x: t.x, y: t.y, w: t.boxWidth, h: t.boxHeight })),
    ],
    [allImages, allTexts, image.id],
  );
  const resolveFreeformTarget = useCallback(
    (x: number, y: number, shiftKey: boolean) => {
      let nx = x;
      let ny = y;
      if (shiftKey) {
        if (Math.abs(nx - image.x) > Math.abs(ny - image.y)) ny = image.y;
        else nx = image.x;
      }
      const thresholdPx = ALIGN_GUIDE_SNAP_THRESHOLD_SCREEN_PX / zoom;
      return snapToAlignmentGuides(nx, ny, image.displayWidth, image.displayHeight, width, height, cols, rows, thresholdPx, otherElementBoxes);
    },
    [image.x, image.y, image.displayWidth, image.displayHeight, width, height, cols, rows, zoom, otherElementBoxes],
  );

  const onPreview = useCallback(
    (x: number, y: number, shiftKey: boolean) => {
      if (showAnchors) {
        setPreview({ x, y });
        setDragPreviewNode(snapToNearestNode(x, y, width, height, cols, rows, true));
        if (isGroupDragging) setGroupDragOffset({ dx: x - image.x, dy: y - image.y });
        return;
      }
      const target = resolveFreeformTarget(x, y, shiftKey);
      setPreview({ x: target.x, y: target.y });
      setAlignmentGuide(target.guideX, target.guideY);
      if (isGroupDragging) setGroupDragOffset({ dx: target.x - image.x, dy: target.y - image.y });
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
      image.x,
      image.y,
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
        const dx = target.x - image.x;
        const dy = target.y - image.y;
        const otherImageIds = allImages.filter((i) => i.id !== image.id && selectedElementIds.includes(i.id)).map((i) => i.id);
        const groupTextIds = allTexts.filter((t) => selectedElementIds.includes(t.id)).map((t) => t.id);
        moveElementsBy(otherImageIds, groupTextIds, dx, dy);
        updateImage(image.id, { x: target.x, y: target.y });
        setGroupDragOffset(null);
      } else {
        updateImage(image.id, { x: target.x, y: target.y });
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
      updateImage,
      image.id,
      image.x,
      image.y,
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
  // it before the user gets a chance to right-click the whole group.
  const onTap = useCallback(
    (_screenX: number, _screenY: number, additive: boolean) => {
      if (additive) toggleElementSelection(image.id);
      else setSelectedElementId(image.id);
    },
    [image.id, toggleElementSelection, setSelectedElementId],
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // Right-click opens the menu even while in crop mode (e.g. to jump to
      // another setting, or exit crop via a different control) — it no
      // longer bails out of crop mode itself, since opening the menu doesn't
      // touch cropZoom/cropOffset.
      // Right-clicking a member of an existing multi-selection opens the
      // menu for the whole selection; right-clicking anything else selects
      // just that element first, same as a plain click would.
      const alreadyInGroup = isSelected && selectedElementIds.length > 1;
      const targets = alreadyInGroup ? selectedElementIds : [image.id];
      if (!alreadyInGroup) setSelectedElementId(image.id);
      const context = resolveRadialContext(targets, allImages, allTexts);
      openRadialMenu(e.clientX, e.clientY, context, targets);
    },
    [isSelected, selectedElementIds, image.id, allImages, allTexts, setSelectedElementId, openRadialMenu],
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
      if (radialMenu?.open && radialMenu.targetIds.includes(image.id)) moveRadialMenu(screenX, screenY);
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

  // Selecting something else (another element, a multi-selection, or clicking
  // the background) always ends crop mode for this image — same "click away
  // to commit" convention as Illustrator/Photoshop's clip-content editing.
  const isSoleSelection = selectedElementIds.length === 1 && selectedElementIds[0] === image.id;
  useEffect(() => {
    if (isCropping && !isSoleSelection) exitCropMode();
  }, [isSoleSelection, isCropping, exitCropMode]);

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
      // Use the LIVE crop zoom, not the value captured at pointer-down: a wheel
      // (or pinch) zoom can land mid-drag, and the pan boundary must always be
      // computed against the frame's *current* overflow, not a stale snapshot —
      // otherwise the clamp below either lets the image drag past its true edge
      // (stale zoom smaller than live) or locks up short of it (stale zoom
      // bigger than live). Re-deriving from cropLiveRef.current also means this
      // handler must set `zoom` to the live value below, not state.start.zoom —
      // overwriting it with the stale start value would silently undo whatever
      // the wheel handler had just set.
      const { cropZoom: liveZoom } = cropLiveRef.current;
      // abs, not a >0-only magnitude: below zoom 1 the image renders smaller than
      // its frame (see CROP_ZOOM_MIN's doc comment), and panning there is still
      // meaningful — it slides the smaller image around within the frame instead
      // of leaving it pinned to center, e.g. tucking it into a corner. Only at
      // zoom exactly 1 (image exactly fills the frame either way) is there truly
      // nothing to pan.
      const maxPanX = (image.displayWidth * Math.abs(liveZoom - 1)) / 2;
      const maxPanY = (image.displayHeight * Math.abs(liveZoom - 1)) / 2;
      const nextOffsetX = maxPanX > 0 ? clamp(state.start.offsetX + deltaX / maxPanX, -1, 1) : 0;
      const nextOffsetY = maxPanY > 0 ? clamp(state.start.offsetY + deltaY / maxPanY, -1, 1) : 0;
      setCropPreview({ zoom: liveZoom, offsetX: nextOffsetX, offsetY: nextOffsetY });
    },
    [zoom, image.displayWidth, image.displayHeight],
  );

  const handleCropPointerUp = useCallback(() => {
    cropDragRef.current = null;
    commitCrop();
  }, [commitCrop]);

  // Redraws only when the effect-relevant inputs change — deliberately excludes
  // x/y, which are handled entirely by this wrapper's CSS transform below. Sizes
  // off the *committed* displayWidth/Height (not a live resize-drag preview
  // value), so an active drag just cheaply CSS-stretches this canvas's existing
  // bitmap via the wrapper's own width/height style below, redrawing crisply
  // only once the drag commits — same perf discipline the old halftone-only
  // effect this replaces already relied on.
  useEffect(() => {
    if (!needsCanvas || !loadedImg || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const w = Math.ceil(image.displayWidth);
    const h = Math.ceil(image.displayHeight);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (hasContentEffectEnabled) {
      renderEffectStack(loadedImg, image.displayWidth, image.displayHeight, contentLayers, cropZoom, cropOffsetX, cropOffsetY);
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(getGLCanvas(), 0, 0, w, h);
    } else {
      // No GL content effect, but ASCII/Blob Tracker (below) still need some pixels of
      // their own to sample from or draw over — draw the plain cropped image first.
      const src = computeCropSourceRect(loadedImg.naturalWidth, loadedImg.naturalHeight, cropZoom, cropOffsetX, cropOffsetY);
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(loadedImg, src.x, src.y, src.width, src.height, 0, 0, w, h);
    }

    if (asciiLayers.length > 0) {
      // Always applied last, over whatever content was just drawn — see AsciiEffect's
      // doc comment for why this is a structural fixed position, not stack-order-driven.
      const asciiCanvas = renderAsciiOverlay(canvas, w, h, asciiLayers[asciiLayers.length - 1]);
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(asciiCanvas, 0, 0, w, h);
    }

    // Blob Tracker samples whatever's already on `canvas` (content + ASCII, if any) to
    // place its reticles, then draws straight onto this same identity-transformed 2D
    // context — no rotation-safe detour needed, unlike ASCII, since this per-image
    // canvas is never itself rotated (rotation lives on the wrapping DOM element).
    for (const layer of blobTrackerLayers) {
      drawBlobTrackerOverlay(ctx, canvas, 0, 0, w, h, layer, layer.id);
    }
  }, [
    loadedImg,
    image.displayWidth,
    image.displayHeight,
    needsCanvas,
    hasContentEffectEnabled,
    contentLayers,
    asciiLayers,
    blobTrackerLayers,
    cropZoom,
    cropOffsetX,
    cropOffsetY,
  ]);

  const panActive = useUIStore((s) => s.panToolActive || s.isSpacePanning);

  // Every OTHER selected element (not the one actively being dragged, whose own
  // `preview` already takes precedence below) previews itself offset by the
  // shared group-drag delta while a multi-selection is being moved.
  const pos =
    preview ?? (isSelected && groupDragOffset ? { x: image.x + groupDragOffset.dx, y: image.y + groupDragOffset.dy } : { x: image.x, y: image.y });
  const box = sizePreview ?? { x: pos.x, y: pos.y, w: image.displayWidth, h: image.displayHeight };
  const rotation = rotationPreview ?? image.rotation;
  // While pan mode or crop mode is active, the element must not intercept the
  // normal move-drag — crop mode swaps in its own pan/zoom handlers below instead.
  // Locked elements never attach drag handlers at all — see ResizeHandles below
  // for the equivalent gate on resize/rotate.
  const dragHandlers = panActive || isCropping || image.locked ? {} : { onPointerDown, onPointerMove, onPointerUp };
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
  // separate crop function; the two aren't mutually exclusive. Below zoom 1 the
  // image renders smaller than the frame (see CROP_ZOOM_MIN) — abs, not clamped
  // to >= 0, so panning still slides the smaller image around within the frame
  // (e.g. into a corner) instead of leaving it pinned to center; matches the
  // same abs guard in coverFit.ts, which is what keeps this live preview and
  // the exported PNG in agreement.
  const panX = cropOffsetX * Math.abs((box.w * cropZoom - box.w) / 2);
  const panY = cropOffsetY * Math.abs((box.h * cropZoom - box.h) / 2);

  const hasEdgeBlend = edgeBlendLayers.length > 0;
  const [edgeColor, setEdgeColor] = useState<RGB | null>(() => (hasEdgeBlend ? (edgeColorCache.get(image.dataUrl) ?? null) : null));

  useEffect(() => {
    if (!hasEdgeBlend) {
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
  }, [hasEdgeBlend, image.dataUrl, loadedImg]);

  return (
    <div
      ref={wrapperRef}
      data-radial-context="image"
      {...dragHandlers}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
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
        // Cropping's frame outline is deliberately thicker/fully-opaque (vs.
        // the thin selection outline) — its dashes need to read clearly as
        // "this is the crop frame boundary," not blend in as a faint hint.
        // CSS's dashed-border/outline dash length scales with the stroke
        // width itself (no separate dash-length property exists), so the
        // wider stroke also produces visibly larger dashes, not just a
        // thicker line.
        outline: isCropping
          ? "3px dashed rgb(var(--color-accent-glow) / 1)"
          : isSelected
            ? "1.5px solid rgb(var(--color-accent-glow) / 0.8)"
            : "none",
        // Crop-frame glow takes priority over the edge-blend glow while
        // actively cropping (both use box-shadow, so only one can apply).
        boxShadow: isCropping
          ? "0 0 0 1px rgb(0 0 0 / 0.4), 0 0 14px 2px rgb(var(--color-accent-glow) / 0.5)"
          : edgeColor
            ? edgeBlendLayers.map((layer) => getEdgeGlowBoxShadow(edgeColor, layer.margin)).join(", ")
            : undefined,
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
        {needsCanvas ? (
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
          className="glass-panel absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1 text-[10px] uppercase tracking-wide opacity-80"
          style={{ transform: `translate(-50%, 0) rotate(${-rotation}deg)` }}
        >
          Scroll to zoom · Drag to pan · Esc to finish
        </div>
      )}

      {isSelected && !panActive && !isCropping && !image.locked && selectedElementIds.length === 1 && (
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
