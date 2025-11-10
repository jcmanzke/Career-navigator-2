"use client";

import { useMemo } from "react";
import type { Basics, FieldKey, HistoryRecord } from "./shared";
import { fieldLabel } from "./shared";

const STEP_ONE_ITEMS: Array<{
  key: FieldKey;
  title: string;
  description: string;
}> = [
  {
    key: "background",
    title: "Ausbildung und beruflicher Hintergrund",
    description: "Skizziere kurz, was dich geprägt hat.",
  },
  {
    key: "current",
    title: "Aktuelle Rolle",
    description: "Erkläre in wenigen Worten, was du heute machst.",
  },
  {
    key: "goals",
    title: "Ziele und Interessen",
    description: "Was möchtest du als Nächstes angehen?",
  },
];

function cls(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export interface StepOneSectionProps {
  basics: Basics;
  history: HistoryRecord;
  onRecord: (field: FieldKey) => void | Promise<void>;
  onContinue: () => void | Promise<void>;
  disableActions?: boolean;
}

export function StepOneSection({
  basics,
  history,
  onRecord,
  onContinue,
  disableActions = false,
}: StepOneSectionProps) {
  const recordings = useMemo(() => {
    return STEP_ONE_ITEMS.map((item) => ({
      ...item,
      hasRecording: Boolean(history[item.key]?.length),
      summary: basics[item.key]?.trim() ?? "",
      label: fieldLabel(item.key),
    }));
  }, [basics, history]);

  return (
    <section className="rounded-3xl border border-neutrals-200/60 bg-neutrals-0/60 backdrop-blur-md shadow-elevation2 p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold">Schritt 1: Background Informationen</h2>
        <p className="text-neutrals-600">
          Nimm zu jeder Kategorie kurz eine Sprachnachricht auf. Du kannst jederzeit neu aufnehmen.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {recordings.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onRecord(item.key)}
            disabled={disableActions}
            className={cls(
              "group flex h-full flex-col justify-between rounded-2xl border border-neutrals-200 bg-neutrals-0 p-4 text-left shadow-sm transition-transform",
              "hover:shadow-elevation3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
              disableActions && "opacity-80",
            )}
            aria-label={`Aufnahme starten: ${item.label}`}
          >
            <div>
              <span className="text-base font-medium text-neutrals-900">{item.label}</span>
              <p className="mt-2 text-sm text-neutrals-600">{item.description}</p>
            </div>
            <div className="mt-6 flex items-center gap-3 text-sm font-semibold text-primary-600">
              <span
                className={cls(
                  "flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary-200 bg-primary-100 text-2xl transition-transform group-hover:scale-105",
                  item.hasRecording &&
                    "border-semantic-success-base bg-semantic-success-surface text-semantic-success-base",
                )}
                aria-hidden="true"
              >
                {item.hasRecording ? "✅" : "🎙️"}
              </span>
              <span className="text-neutrals-900">Aufnehmen</span>
            </div>
          </button>
        ))}
      </div>
      <div className="mt-8 flex items-center justify-end">
        <button
          type="button"
          onClick={() => {
            void onContinue();
          }}
          disabled={disableActions}
          className={cls(
            "rounded-xl bg-[#1D252A] px-4 py-2 text-white transition hover:bg-primary-500 hover:text-neutrals-900",
            disableActions && "opacity-80",
          )}
        >
          Weiter
        </button>
      </div>
    </section>
  );
}
