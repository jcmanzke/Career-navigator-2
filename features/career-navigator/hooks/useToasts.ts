import { useState } from "react";
import { uid } from "../utils";
import type { Toast } from "../types";

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = (text: string) => {
    const id = uid();
    setToasts((prev) => [...prev, { id, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3000);
  };

  return { toasts, push };
}
