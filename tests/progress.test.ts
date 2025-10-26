import {
  MemoryStorage,
  clearProgress,
  getProgress,
  getResumeUrl,
  saveProgress,
  type Progress,
} from "../lib/progress";

function runProgressTests(): void {
  const store = new MemoryStorage();

  const prog: Progress = { track: "fast", stepId: "intro", updatedAt: 0 };
  saveProgress(prog, store);
  const read = getProgress(store);
  if (!read) {
    throw new Error("reads saved progress");
  }
  if (read.track !== "fast") {
    throw new Error("fast track preserved");
  }
  if (read.stepId !== "intro") {
    throw new Error("fast step preserved");
  }
  if (getResumeUrl(read) !== "/start/fast?step=intro") {
    throw new Error("resume URL matches fast track");
  }

  const deep: Progress = { track: "deep", stepId: "phase-2", updatedAt: Date.now() };
  if (getResumeUrl(deep) !== "/start/deep?step=phase-2") {
    throw new Error("resume URL matches deep track");
  }

  clearProgress(store);
  if (getProgress(store) !== null) {
    throw new Error("clears progress");
  }

  // eslint-disable-next-line no-console -- log is helpful when running npm test locally
  console.log("progress tests: OK");
}

runProgressTests();
