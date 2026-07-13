import { useEffect, useRef } from "react";
import { useProjectStore } from "@/store/projectStore";
import { useUIStore } from "@/store/uiStore";
import { MAX_ZOOM, MIN_ZOOM } from "@/constants/defaults";
import { GridOverlay } from "@/components/CanvasWorkspace/GridOverlay";
import { ImageElementView } from "@/components/CanvasWorkspace/ImageElementView";
import { TextElementView } from "@/components/CanvasWorkspace/TextElementView";

const TAP_THRESHOLD_PX = 4;

export function CanvasWorkspace() {
  const width = useProjectStore((s) => s.project.width);
  const height = useProjectStore((s) => s.project.height);
  const cols = useProjectStore((s) => s.project.cols);
  const rows = useProjectStore((s) => s.project.rows);
  const backgroundColor = useProjectStore((s) => s.project.backgroundColor);
  const images = useProjectStore((s) => s.project.images);
  const texts = useProjectStore((s) => s.project.texts);

  const zoom = useUIStore((s) => s.zoom);
  const setZoom = useUIStore((s) => s.setZoom);
  const zoomBy = useUIStore((s) => s.zoomBy);
  const openRadialMenu = useUIStore((s) => s.openRadialMenu);
  const setSelectedElementId = useUIStore((s) => s.setSelectedElementId);

  const viewportRef = useRef<HTMLDivElement>(null);
  const bgDownRef = useRef<{ x: number; y: number } | null>(null);
  const didFitRef = useRef(false);

  // Auto-fit the canvas into the viewport once per canvas dimension change.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const { width: vw, height: vh } = viewport.getBoundingClientRect();
    const fit = Math.min((vw * 0.9) / width, (vh * 0.9) / height, 1);
    setZoom(Number.isFinite(fit) && fit > 0 ? fit : 1);
    didFitRef.current = true;
  }, [width, height, setZoom]);

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    zoomBy(-e.deltaY * 0.001);
  }

  function handleBgPointerDown(e: React.PointerEvent) {
    bgDownRef.current = { x: e.clientX, y: e.clientY };
  }

  function handleBgPointerUp(e: React.PointerEvent) {
    const down = bgDownRef.current;
    bgDownRef.current = null;
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    if (moved < TAP_THRESHOLD_PX) {
      setSelectedElementId(null);
      openRadialMenu(e.clientX, e.clientY, "canvas", null);
    }
  }

  return (
    <div
      ref={viewportRef}
      onWheel={handleWheel}
      className="relative flex h-full w-full items-center justify-center overflow-hidden"
    >
      <div style={{ transform: `scale(${zoom})` }} className="transition-transform duration-75 ease-out">
        <div
          data-radial-context="canvas"
          onPointerDown={handleBgPointerDown}
          onPointerUp={handleBgPointerUp}
          className="relative touch-none shadow-[0_0_0_1px_rgb(255_255_255/0.08),0_40px_120px_-20px_rgb(0_0_0/0.6)]"
          style={{ width, height, backgroundColor }}
        >
          <GridOverlay width={width} height={height} cols={cols} rows={rows} />
          {images.map((image) => (
            <ImageElementView key={image.id} image={image} />
          ))}
          {texts.map((text) => (
            <TextElementView key={text.id} text={text} />
          ))}
        </div>
      </div>

      <div className="glass-panel corner-frame absolute bottom-5 right-5 flex items-center gap-1 rounded-lg px-2 py-1.5">
        <span className="corner-bl" />
        <span className="corner-br" />
        <button
          type="button"
          onClick={() => zoomBy(-0.1)}
          disabled={zoom <= MIN_ZOOM}
          className="flex h-7 w-7 items-center justify-center text-sm disabled:opacity-30"
        >
          −
        </button>
        <span className="w-12 text-center text-[11px] tabular-nums">{Math.round(zoom * 100)}%</span>
        <button
          type="button"
          onClick={() => zoomBy(0.1)}
          disabled={zoom >= MAX_ZOOM}
          className="flex h-7 w-7 items-center justify-center text-sm disabled:opacity-30"
        >
          +
        </button>
      </div>
    </div>
  );
}
