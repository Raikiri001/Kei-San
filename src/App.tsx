import { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "motion/react";
import { useUIStore } from "@/store/uiStore";
import { useImageUpload } from "@/hooks/useImageUpload";
import { UploadIcon } from "@/components/RadialMenu/icons";
import { CanvasWorkspace } from "@/components/CanvasWorkspace/CanvasWorkspace";
import { ControlDock } from "@/components/ControlDock/ControlDock";
import { ToolRail } from "@/components/ToolRail/ToolRail";
import { RadialMenu } from "@/components/RadialMenu/RadialMenu";
import { DesignsDrawer } from "@/components/DesignsDrawer/DesignsDrawer";
import { EffectsDrawer } from "@/components/EffectsDrawer/EffectsDrawer";
import { TextEffectsDrawer } from "@/components/TextEffectsDrawer";
import { UploadPanel } from "@/components/UploadDialog/UploadPanel";
import { CanvasSettingsPanel } from "@/components/ControlDock/CanvasSettingsPanel";
import { BackgroundColorPanel } from "@/components/ControlDock/BackgroundColorPanel";
import { DiscardConfirmBar } from "@/components/DiscardConfirmBar";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ensureFontsLoaded } from "@/constants/fonts";
import {
  BACKGROUND_COLOR_PANEL_WIDTH,
  CANVAS_SETTINGS_PANEL_WIDTH,
  DESIGNS_PANEL_WIDTH,
  HEADER_HEIGHT,
  LAYER_INSPECTOR_WIDTH,
  PANEL_PUSH_TRANSITION,
  RAIL_WIDTH,
  TEXT_EFFECTS_PANEL_WIDTH,
  UPLOAD_PANEL_WIDTH,
} from "@/constants/defaults";
import type { LeftPanelKind } from "@/store/uiStore";

function App() {
  const [fontProgress, setFontProgress] = useState(0);

  useEffect(() => {
    ensureFontsLoaded(setFontProgress);
  }, []);

  // Window-wide "drop an image anywhere" support — dropping a file on the
  // canvas, the header, the rail, wherever, goes through the exact same
  // upload pipeline as the Upload panel's own dropzone (see useImageUpload),
  // so it lands on the canvas AND shows up in that panel's persistent
  // uploaded-images list, same as a deliberate upload would. A plain
  // dragenter/dragleave pair can't reliably tell "left the window" from "moved
  // over a child element" (both fire the same events), so a running counter —
  // incremented on every enter, decremented on every leave, overlay visible
  // whenever it's above zero — is what actually survives dragging across
  // descendants instead of flickering the overlay on/off.
  const uploadFiles = useImageUpload();
  const openLeftPanel = useUIStore((s) => s.openLeftPanel);
  const [isDraggingFileOverWindow, setIsDraggingFileOverWindow] = useState(false);
  const dragDepthRef = useRef(0);

  function isFileDrag(e: React.DragEvent) {
    return e.dataTransfer.types.includes("Files");
  }

  function handleWindowDragEnter(e: React.DragEvent) {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    dragDepthRef.current += 1;
    setIsDraggingFileOverWindow(true);
  }

  function handleWindowDragOver(e: React.DragEvent) {
    // Every dragover must preventDefault, not just dragenter — a browser's
    // default handling of an un-prevented drop is to navigate away and show
    // the raw dropped file instead of firing the drop event at all.
    if (isFileDrag(e)) e.preventDefault();
  }

  function handleWindowDragLeave(e: React.DragEvent) {
    if (!isFileDrag(e)) return;
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setIsDraggingFileOverWindow(false);
  }

  function handleWindowDrop(e: React.DragEvent) {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    dragDepthRef.current = 0;
    setIsDraggingFileOverWindow(false);
    uploadFiles(e.dataTransfer.files);
    if (activeLeftPanel !== "upload") openLeftPanel("upload");
  }

  // Every rail panel (Upload, Image FX, Text FX, Canvas, Color, Designs)
  // docks to the left, pushing the canvas (and, since the ruler lives inside
  // it, the ruler too) over by exactly its own width rather than floating on
  // top of it; the layer customization panel docks to the right the same
  // way. Only one left-docked panel is ever open at a time (see uiStore's
  // activeLeftPanel), so a single width lookup covers all of them.
  const activeLeftPanel = useUIStore((s) => s.activeLeftPanel);
  const effectsPanelWidth = useUIStore((s) => s.effectsPanelWidth);
  const effectsSelectedLayerId = useUIStore((s) => s.effectsSelectedLayerId);

  const leftPanelWidths: Record<LeftPanelKind, number> = {
    effects: effectsPanelWidth,
    textEffects: TEXT_EFFECTS_PANEL_WIDTH,
    upload: UPLOAD_PANEL_WIDTH,
    canvasSettings: CANVAS_SETTINGS_PANEL_WIDTH,
    backgroundColor: BACKGROUND_COLOR_PANEL_WIDTH,
    designs: DESIGNS_PANEL_WIDTH,
  };
  const leftDrawerWidth = activeLeftPanel ? leftPanelWidths[activeLeftPanel] : 0;
  const rightDrawerWidth = activeLeftPanel === "effects" && effectsSelectedLayerId ? LAYER_INSPECTOR_WIDTH : 0;

  return (
    <div
      className="relative flex h-screen w-screen flex-col overflow-hidden"
      onDragEnter={handleWindowDragEnter}
      onDragOver={handleWindowDragOver}
      onDragLeave={handleWindowDragLeave}
      onDrop={handleWindowDrop}
    >
      {/* Canvas viewport starts below the header and beside the tool rail —
          both are permanent chrome that reserves its own space, rather than
          floating on top of a full-bleed workspace. left/right also shift
          to make room for whichever docked panel is currently open, animated
          in lockstep with that panel's own slide (same duration/easing, see
          PANEL_PUSH_TRANSITION) so it reads as one push, not two separate
          motions. */}
      <div
        className="absolute bottom-0"
        style={{
          top: HEADER_HEIGHT,
          left: RAIL_WIDTH + leftDrawerWidth,
          right: rightDrawerWidth,
          transition: `left ${PANEL_PUSH_TRANSITION}, right ${PANEL_PUSH_TRANSITION}`,
        }}
      >
        <CanvasWorkspace />
      </div>

      <ControlDock />
      <ToolRail />

      <RadialMenu />
      <UploadPanel />
      <CanvasSettingsPanel />
      <BackgroundColorPanel />
      <DesignsDrawer />
      <EffectsDrawer />
      <TextEffectsDrawer />
      <DiscardConfirmBar />
      <AnimatePresence>{fontProgress < 1 && <LoadingScreen key="loading" progress={fontProgress} />}</AnimatePresence>

      {/* Window-wide drop affordance — same visual language as the Upload
          panel's own dropzone (dashed border, upload glyph), just full-screen,
          so dropping a file anywhere on the app gives the same "yes, this is
          about to add an image" feedback as dropping it there directly. */}
      {isDraggingFileOverWindow && (
        <div className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
          <div className="glass-panel flex flex-col items-center gap-4 rounded-3xl border-2 border-dashed border-[rgb(var(--chrome-border)/0.5)] px-16 py-14 text-center">
            <span className="flex h-9 w-9 items-center justify-center">
              <UploadIcon />
            </span>
            <span className="text-[14px]">Drop to add image</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
