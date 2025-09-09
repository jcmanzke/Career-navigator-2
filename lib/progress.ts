/**
 * Simple client-side progress persistence with injectable storage for tests.
 * Does not block on any external API. Uses `localStorage` when available.
 */

export type Track = "fast" | "deep";

export interface Progress {
  track: Track;
  stepId: string;
  updatedAt: number; // epoch ms
}

const STORAGE_KEY = "cn_progress";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, val: string): void;
  removeItem(key: string): void;
}

const getDefaultStorage = (): StorageLike | null => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

export function saveProgress(p: Progress, storage: StorageLike | null = getDefaultStorage()): void {
  if (!storage) return;
  const toSave = { ...p, updatedAt: p.updatedAt || Date.now() } as Progress;
  storage.setItem(STORAGE_KEY, JSON.stringify(toSave));
}

export function getProgress(storage: StorageLike | null = getDefaultStorage()): Progress | null {
  if (!storage) return null;
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Progress;
    if (!parsed || (parsed.track !== "fast" && parsed.track !== "deep") || !parsed.stepId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearProgress(storage: StorageLike | null = getDefaultStorage()): void {
  if (!storage) return;
  storage.removeItem(STORAGE_KEY);
}

export function getResumeUrl(p: Progress): string {
  const base = p.track === "fast" ? "/start/fast" : "/"; // deep goes to main exercise
  const q = p.stepId ? `?step=${encodeURIComponent(p.stepId)}` : "";
  return `${base}${q}`;
}

/** In-memory storage for tests */
export class MemoryStorage implements StorageLike {
  private map = new Map<string, string>();
  getItem(key: string): string | null { return this.map.has(key) ? this.map.get(key)! : null; }
  setItem(key: string, val: string): void { this.map.set(key, val); }
  removeItem(key: string): void { this.map.delete(key); }
}
