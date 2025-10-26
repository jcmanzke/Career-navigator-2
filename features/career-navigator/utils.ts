export const cardCls =
  "rounded-3xl border border-neutrals-200/50 bg-neutrals-0/60 backdrop-blur-md shadow-elevation2";

export function cls(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function debounce<T extends (...args: any[]) => void>(fn: T, delay = 600) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn(...args);
    }, delay);
  };
}
