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
import { UploadDialog } from "@/components/UploadDialog/UploadDialog";
import { DiscardConfirmBar } from "@/components/DiscardConfirmBar";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ensureFontsLoaded } from "@/constants/fonts";
import { HEADER_HEIGHT, LAYER_INSPECTOR_WIDTH, PANEL_PUSH_TRANSITION, RAIL_WIDTH, TEXT_EFFECTS_PANEL_WIDTH } from "@/constants/defaults";

function App() {
  const [fontProgress, setFontProgress] = useState(0);

  useEffect(() => {
    ensureFontsLoaded(setFontProgress);
  }, []);

  // Image/Text Effects dock to the left, pushing the canvas (and, since the
  // ruler lives inside it, the ruler too) over by exactly their own width
  // rather than floating on top of it; the layer customization panel docks
  // to the right the same way. Only one left-docked panel is ever open at a
  // time (see uiStore's mutual-exclusion in openEffectsDrawer/
  // setTextEffectsDrawerOpen), so a single width covers both.
  const effectsDrawerOpen = useUIStore((s) => s.effectsDrawerOpen);
  const effectsPanelWidth = useUIStore((s) => s.effectsPanelWidth);
  const textEffectsDrawerOpen = useUIStore((s) => s.textEffectsDrawerOpen);
  const effectsSelectedLayerId = useUIStore((s) => s.effectsSelectedLayerId);

  const leftDrawerWidth = effectsDrawerOpen ? effectsPanelWidth : textEffectsDrawerOpen ? TEXT_EFFECTS_PANEL_WIDTH : 0;
  const rightDrawerWidth = effectsDrawerOpen && effectsSelectedLayerId ? LAYER_INSPECTOR_WIDTH : 0;

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
      <DesignsDrawer />
      <EffectsDrawer />
      <TextEffectsDrawer />
      <UploadDialog />
      <DiscardConfirmBar />
      <AnimatePresence>{fontProgress < 1 && <LoadingScreen key="loading" progress={fontProgress} />}</AnimatePresence>
    </div>
  );
}

export default App;
