"use strict";
/**
 * Simple client-side progress persistence with injectable storage for tests.
 * Does not block on any external API. Uses `localStorage` when available.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryStorage = void 0;
exports.saveProgress = saveProgress;
exports.getProgress = getProgress;
exports.clearProgress = clearProgress;
exports.getResumeUrl = getResumeUrl;
const STORAGE_KEY = "cn_progress";
const getDefaultStorage = () => {
    if (typeof window === "undefined")
        return null;
    try {
        return window.localStorage;
    }
    catch {
        return null;
    }
};
function saveProgress(p, storage = getDefaultStorage()) {
    if (!storage)
        return;
    const toSave = { ...p, updatedAt: p.updatedAt || Date.now() };
    storage.setItem(STORAGE_KEY, JSON.stringify(toSave));
}
function getProgress(storage = getDefaultStorage()) {
    if (!storage)
        return null;
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw)
        return null;
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || (parsed.track !== "fast" && parsed.track !== "deep") || !parsed.stepId)
            return null;
        return parsed;
    }
    catch {
        return null;
    }
}
function clearProgress(storage = getDefaultStorage()) {
    if (!storage)
        return;
    storage.removeItem(STORAGE_KEY);
}
function getResumeUrl(p) {
    const base = p.track === "fast" ? "/start/fast" : "/start/deep";
    const q = p.stepId ? `?step=${encodeURIComponent(p.stepId)}` : "";
    return `${base}${q}`;
}
/** In-memory storage for tests */
class MemoryStorage {
    constructor() {
        this.map = new Map();
    }
    getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
    setItem(key, val) { this.map.set(key, val); }
    removeItem(key) { this.map.delete(key); }
}
exports.MemoryStorage = MemoryStorage;
