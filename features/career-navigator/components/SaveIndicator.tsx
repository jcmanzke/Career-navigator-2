import type { SaveState } from "../types";
import { cls } from "../utils";

const STATE_MAP: Record<
  SaveState,
  { dot: string; text: string; textCls: string }
> = {
  idle: {
    dot: "bg-semantic-success-base",
    text: "Up to date",
    textCls: "text-semantic-success-base",
  },
  saving: {
    dot: "bg-semantic-warning-base animate-pulse",
    text: "Saving…",
    textCls: "text-semantic-warning-base",
  },
};

export function SaveIndicator({ state }: { state: SaveState }) {
  const current = STATE_MAP[state] ?? STATE_MAP.idle;
  return (
    <div className={cls("flex items-center gap-2 text-small", current.textCls)}>
      <span className={cls("inline-block h-2.5 w-2.5 rounded-full", current.dot)} />
      <span>{current.text}</span>
    </div>
  );
}
