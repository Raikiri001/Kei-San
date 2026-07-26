import { useEffect, useState } from "react";
import { AnimatePresence } from "motion/react";
import { useUIStore } from "@/store/uiStore";
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
    <div className="relative flex h-screen w-screen flex-col overflow-hidden">
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
    </div>
  );
}

export default App;
