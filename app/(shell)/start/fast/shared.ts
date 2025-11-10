export type FieldKey = "background" | "current" | "goals";

export type Basics = {
  background: string;
  current: string;
  goals: string;
};

export type HistoryEntry = { timestamp: number; text: string; durationMs?: number };

export type HistoryRecord = Record<FieldKey, HistoryEntry[]>;

export const emptyHistory: HistoryRecord = {
  background: [],
  current: [],
  goals: [],
};

export function sanitizePlainText(input: string): string {
  if (!input) return "";
  let text = String(input);
  text = text.replace(/```[\s\S]*?```/g, " ");
  text = text.replace(/`([^`]+)`/g, "$1");
  text = text.replace(/!\[[^\]]*\]\([^)]*\)/g, " ");
  text = text.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  text = text.replace(/^#{1,6}\s*/gm, "");
  text = text.replace(/(\*\*|__)(.*?)\1/g, "$2");
  text = text.replace(/(\*|_)(.*?)\1/g, "$2");
  text = text.replace(/~~(.*?)~~/g, "$1");
  text = text.replace(/^>\s?/gm, "");
  text = text.replace(/^\s*[-+*]\s+/gm, "");
  text = text.replace(/^\s*\d+\.\s+/gm, "");
  text = text.replace(/^(-\s?){3,}$/gm, "");
  text = text.replace(/\s+/g, " ");
  return text.trim();
}

export function normalizeHistory(value: any): HistoryRecord {
  const base: HistoryRecord = { ...emptyHistory };
  (Object.keys(base) as FieldKey[]).forEach((key) => {
    const arr = Array.isArray(value?.[key]) ? value[key] : [];
    base[key] = arr
      .filter((entry: any) => entry && typeof entry.text === "string")
      .map((entry: any) => ({
        timestamp: typeof entry.timestamp === "number" ? entry.timestamp : Date.now(),
        text: sanitizePlainText(String(entry.text)),
        durationMs: typeof entry.durationMs === "number" ? entry.durationMs : undefined,
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  });
  return base;
}

export function fieldLabel(key: FieldKey): string {
  switch (key) {
    case "background":
      return "Ausbildung und beruflicher Hintergrund";
    case "current":
      return "Aktuelle Rolle";
    case "goals":
      return "Ziele und Interessen";
    default:
      return key;
  }
}

export function inputFieldLabel(key: FieldKey): string {
  switch (key) {
    case "background":
      return "Ausbildung";
    case "current":
      return "Aktuelle Rolle";
    case "goals":
      return "Ziele und Interessen";
    default:
      return key;
  }
}
