import { useEffect, useState } from "react";
import { AnimatePresence } from "motion/react";
import { CanvasWorkspace } from "@/components/CanvasWorkspace/CanvasWorkspace";
import { ControlDock } from "@/components/ControlDock/ControlDock";
import { ToolRail } from "@/components/ToolRail/ToolRail";
import { RadialMenu } from "@/components/RadialMenu/RadialMenu";
import { DesignsDrawer } from "@/components/DesignsDrawer/DesignsDrawer";
import { EffectsDrawer } from "@/components/EffectsDrawer/EffectsDrawer";
import { UploadDialog } from "@/components/UploadDialog/UploadDialog";
import { DiscardConfirmBar } from "@/components/DiscardConfirmBar";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ensureFontsLoaded } from "@/constants/fonts";
import { HEADER_HEIGHT, RAIL_WIDTH } from "@/constants/defaults";

function App() {
  const [fontProgress, setFontProgress] = useState(0);

  useEffect(() => {
    ensureFontsLoaded(setFontProgress);
  }, []);

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden">
      {/* Canvas viewport starts below the header and beside the tool rail —
          both are now permanent chrome that reserves its own space, rather
          than floating on top of a full-bleed workspace. */}
      <div className="absolute bottom-0 right-0" style={{ top: HEADER_HEIGHT, left: RAIL_WIDTH }}>
        <CanvasWorkspace />
      </div>

      <ControlDock />
      <ToolRail />

      <RadialMenu />
      <DesignsDrawer />
      <EffectsDrawer />
      <UploadDialog />
      <DiscardConfirmBar />
      <AnimatePresence>{fontProgress < 1 && <LoadingScreen key="loading" progress={fontProgress} />}</AnimatePresence>
    </div>
  );
}

export default App;
