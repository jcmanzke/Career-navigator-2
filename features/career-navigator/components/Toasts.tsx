import type { Toast } from "../types";
import { cls } from "../utils";

export function Toasts({ toasts }: { toasts: Toast[] }) {
  if (!toasts.length) return null;
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cls(
            "rounded-xl shadow-elevation3 bg-neutrals-900 text-neutrals-0 px-4 py-3 text-small",
          )}
        >
          {toast.text}
        </div>
      ))}
    </div>
  );
}
