"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const progress_1 = require("../lib/progress");
function runProgressTests() {
    const store = new progress_1.MemoryStorage();
    const prog = { track: "fast", stepId: "intro", updatedAt: 0 };
    (0, progress_1.saveProgress)(prog, store);
    const read = (0, progress_1.getProgress)(store);
    if (!read) {
        throw new Error("reads saved progress");
    }
    if (read.track !== "fast") {
        throw new Error("fast track preserved");
    }
    if (read.stepId !== "intro") {
        throw new Error("fast step preserved");
    }
    if ((0, progress_1.getResumeUrl)(read) !== "/start/fast?step=intro") {
        throw new Error("resume URL matches fast track");
    }
    const deep = { track: "deep", stepId: "phase-2", updatedAt: Date.now() };
    if ((0, progress_1.getResumeUrl)(deep) !== "/start/deep?step=phase-2") {
        throw new Error("resume URL matches deep track");
    }
    (0, progress_1.clearProgress)(store);
    if ((0, progress_1.getProgress)(store) !== null) {
        throw new Error("clears progress");
    }
    // eslint-disable-next-line no-console -- log is helpful when running npm test locally
    console.log("progress tests: OK");
}
runProgressTests();
