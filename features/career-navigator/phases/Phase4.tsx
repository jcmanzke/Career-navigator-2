import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import { CONTEXT_HEADER_NAME, DEEP_ANALYSIS_CONTEXT, N8N_WEBHOOK_URL } from "@/lib/n8n";
import type { Journey } from "../types";
import { cardCls, cls } from "../utils";

interface Phase4Props {
  journey: Journey;
  onNext: () => void;
  onBack: () => void;
}

const toText = (value: unknown): string => {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(toText).filter(Boolean).join("\n\n");
  if (typeof value === "object") return Object.values(value).map(toText).join("\n\n");
  return String(value);
};

export function Phase4({ journey, onNext, onBack }: Phase4Props) {
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);
  const linkComponents = useMemo<Components>(
    () => ({
      a: (props) => (
        <a {...props} target="_blank" rel="noopener noreferrer">
          {props.children}
        </a>
      ),
    }),
    [],
  );

  const analyze = async () => {
    try {
      setLoading(true);
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [CONTEXT_HEADER_NAME]: DEEP_ANALYSIS_CONTEXT,
        },
        body: JSON.stringify({ userId: journey.userId, journeyId: journey.id }),
      });
      const text = await response.text();
      try {
        const parsed = JSON.parse(text);
        setAnalysis(toText(parsed));
      } catch {
        setAnalysis(text);
      }
    } catch (error) {
      console.error(error);
      setAnalysis("Fehler bei der Analyse");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className={cls(cardCls, "p-4")}>
        <h2 className="mb-2 text-lg font-semibold">Phase 4: AI‑Analyse</h2>
        <p className="mb-3 text-body text-neutrals-600">
          Die Analyse und Clusterung der Erfahrungen wird später durch einen externen AI‑Service
          durchgeführt.
        </p>
        <button
          type="button"
          onClick={analyze}
          className="rounded-xl bg-[#1D252A] px-3 py-2 text-white hover:bg-primary-500 hover:text-neutrals-900"
        >
          {loading ? "Analysiere…" : "Ergebnisse analysieren"}
        </button>
        {analysis && (
          <ReactMarkdown components={linkComponents} className="markdown-view mt-4 w-full rounded border bg-neutrals-0 p-3">
            {analysis}
          </ReactMarkdown>
        )}
      </section>
      <div className="flex justify-between pt-8">
        <button onClick={onBack} className="rounded-xl border px-3 py-2">
          Zurück
        </button>
        <button
          onClick={onNext}
          className="rounded-xl bg-[#1D252A] px-3 py-2 text-white hover:bg-primary-500 hover:text-neutrals-900"
        >
          Weiter zu Phase 5
        </button>
      </div>
    </div>
  );
}
