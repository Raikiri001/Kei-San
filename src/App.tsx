import { CanvasWorkspace } from "@/components/CanvasWorkspace/CanvasWorkspace";
import { ControlDock } from "@/components/ControlDock/ControlDock";
import { RadialMenu } from "@/components/RadialMenu/RadialMenu";
import { DesignsDrawer } from "@/components/DesignsDrawer/DesignsDrawer";
import { DiscardConfirmBar } from "@/components/DiscardConfirmBar";

function App() {
  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden">
      <div className="absolute inset-0">
        <CanvasWorkspace />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-6 z-30 flex justify-center px-4">
        <ControlDock />
      </div>

      <RadialMenu />
      <DesignsDrawer />
      <DiscardConfirmBar />
    </div>
  );
}

export default App;
