import TopBar from "@/app/components/TopBar";
import type { SaveState } from "../types";
import { ProgressSteps } from "./ProgressSteps";
import { SaveIndicator } from "./SaveIndicator";

interface ShellProps {
  step: number;
  setStep: (step: number) => void;
  saveState: SaveState;
  children: React.ReactNode;
}

export function Shell({ step, setStep, saveState, children }: ShellProps) {
  return (
    <div className="min-h-screen text-neutrals-900">
      <TopBar hideBackOn={["/deep"]} right={<SaveIndicator state={saveState} />} />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        <ProgressSteps current={Math.max(1, step || 1)} onSelect={setStep} />
        {children}
      </main>
    </div>
  );
}
