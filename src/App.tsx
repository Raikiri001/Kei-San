import { useEffect, useState } from "react";
import { AnimatePresence } from "motion/react";
import { CanvasWorkspace } from "@/components/CanvasWorkspace/CanvasWorkspace";
import { ControlDock } from "@/components/ControlDock/ControlDock";
import { RadialMenu } from "@/components/RadialMenu/RadialMenu";
import { DesignsDrawer } from "@/components/DesignsDrawer/DesignsDrawer";
import { UploadDialog } from "@/components/UploadDialog/UploadDialog";
import { DiscardConfirmBar } from "@/components/DiscardConfirmBar";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ensureFontsLoaded } from "@/constants/fonts";

function App() {
  const [fontProgress, setFontProgress] = useState(0);

  useEffect(() => {
    ensureFontsLoaded(setFontProgress);
  }, []);

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden">
      <div className="absolute inset-0">
        <CanvasWorkspace />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-10 z-30 flex justify-center px-4">
        <ControlDock />
      </div>

      <RadialMenu />
      <DesignsDrawer />
      <UploadDialog />
      <DiscardConfirmBar />
      <AnimatePresence>{fontProgress < 1 && <LoadingScreen key="loading" progress={fontProgress} />}</AnimatePresence>
    </div>
  );
}

export default App;
