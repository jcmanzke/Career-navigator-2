export type FieldKey = "background" | "current" | "goals";

export type Basics = {
  background: string;
  current: string;
  goals: string;
};

export type HistoryEntry = { timestamp: number; text: string };

export type HistoryRecord = Record<FieldKey, HistoryEntry[]>;

export const emptyHistory: HistoryRecord = {
  background: [],
  current: [],
  goals: [],
};

export function normalizeHistory(value: any): HistoryRecord {
  const base: HistoryRecord = { ...emptyHistory };
  (Object.keys(base) as FieldKey[]).forEach((key) => {
    const arr = Array.isArray(value?.[key]) ? value[key] : [];
    base[key] = arr
      .filter((entry: any) => entry && typeof entry.text === "string")
      .map((entry: any) => ({
        timestamp: typeof entry.timestamp === "number" ? entry.timestamp : Date.now(),
        text: String(entry.text),
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
