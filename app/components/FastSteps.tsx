"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const cls = (...xs: (string | false | null | undefined)[]) =>
  xs.filter(Boolean).join(" ");

const steps = [
  { href: "/start/fast", title: "Welcome" },
  { href: "/start/fast/prompts", title: "Prompts" },
  { href: "/start/fast/background", title: "Background" },
  { href: "/start/fast/processing", title: "Processing" },
  { href: "/start/fast/results", title: "Results" },
];

export default function FastSteps() {
  const pathname = usePathname();
  const current =
    steps.findIndex((s) => pathname === s.href || pathname.startsWith(s.href + "/")) + 1 || 1;
  const pct = Math.round(((current - 1) / (steps.length - 1)) * 100);

  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-center gap-3 mb-2">
        {steps.map((s, idx) => (
          <div key={s.href} className="flex items-center">
            <Link
              href={s.href}
              className={cls(
                "h-8 w-8 rounded-full flex items-center justify-center text-small font-medium focus:outline-none",
                idx + 1 < current
                  ? "bg-semantic-success-base text-neutrals-0"
                  : idx + 1 === current
                  ? "bg-primary-500 text-neutrals-0"
                  : "bg-neutrals-200 text-neutrals-600"
              )}
              title={s.title}
            >
              {idx + 1}
            </Link>
            {idx + 1 !== steps.length && <div className="w-6 h-1 mx-2 rounded bg-neutrals-200" />}
          </div>
        ))}
      </div>
      <div className="h-2 bg-neutrals-200 rounded-full">
        <div
          className="h-2 bg-primary-500 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-center text-small text-neutrals-500 mt-1">Progress: {pct}%</p>
    </div>
  );
}

