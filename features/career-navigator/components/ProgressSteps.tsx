import { cls } from "../utils";

export function ProgressSteps({
  current,
  onSelect,
  total = 5,
}: {
  current: number;
  onSelect?: (step: number) => void;
  total?: number;
}) {
  const steps = Array.from({ length: total }, (_, index) => index + 1);
  const pct = Math.round(((current - 1) / total) * 100);
  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-center gap-3">
        {steps.map((stepNumber) => (
          <div key={stepNumber} className="flex items-center">
            <button
              type="button"
              onClick={() => onSelect?.(stepNumber)}
              className={cls(
                "h-8 w-8 rounded-full flex items-center justify-center text-small font-medium focus:outline-none",
                stepNumber < current
                  ? "bg-semantic-success-base text-neutrals-0"
                  : stepNumber === current
                  ? "bg-primary-500 text-neutrals-0"
                  : "bg-neutrals-200 text-neutrals-600",
              )}
              title={`Schritt ${stepNumber}`}
            >
              {stepNumber}
            </button>
            {stepNumber !== steps[steps.length - 1] && (
              <div className="mx-2 h-1 w-6 rounded bg-neutrals-200" />
            )}
          </div>
        ))}
      </div>
      <div className="h-2 rounded-full bg-neutrals-200">
        <div className="h-2 rounded-full bg-primary-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-center text-small text-neutrals-500">Fortschritt: {pct}%</p>
    </div>
  );
}
