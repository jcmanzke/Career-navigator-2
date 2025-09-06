"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseClient } from "../lib/supabaseClient";

// --- Minimal helpers -------------------------------------------------------
const uid = () => Math.random().toString(36).slice(2, 10);
const cls = (...xs) => xs.filter(Boolean).join(" ");
const debounce = (fn, ms = 600) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
};

// --- Toasts ----------------------------------------------------------------
function useToasts() {
  const [toasts, setToasts] = useState([]);
  const push = (text) => {
    const id = uid();
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  };
  return { toasts, push };
}

function Toasts({ toasts }) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((t) => (
        <div key={t.id} className="rounded-xl shadow-elevation3 bg-neutrals-900 text-neutrals-0 px-4 py-3 text-small">
          {t.text}
        </div>
      ))}
    </div>
  );
}

// --- Save Indicator ---------------------------------------------------------
function SaveIndicator({ state }) {
  const map = {
    idle: { dot: "bg-neutrals-300", text: "Up to date" },
    saving: { dot: "bg-semantic-warning-base animate-pulse", text: "Saving…" },
    saved: { dot: "bg-semantic-success-base", text: "Saved" },
  };
  const m = map[state] || map.idle;
  return (
    <div className="flex items-center gap-2 text-small text-neutrals-500">
      <span className={cls("inline-block h-2.5 w-2.5 rounded-full", m.dot)} />
      <span>{m.text}</span>
    </div>
  );
}

// --- Progress Steps (8 steps) ----------------------------------------------
function ProgressSteps({ current }) {
  const steps = Array.from({ length: 8 }, (_, i) => i + 1);
  const pct = Math.round(((current - 1) / 8) * 100);
  return (
    <div className="w-full">
      <div className="flex items-center justify-center gap-3 mb-2">
        {steps.map((n) => (
          <div key={n} className="flex items-center">
            <div
              className={cls(
                "h-8 w-8 rounded-full flex items-center justify-center text-small font-medium",
                n < current
                  ? "bg-semantic-success-base text-neutrals-0"
                  : n === current
                  ? "bg-primary-500 text-neutrals-0"
                  : "bg-neutrals-200 text-neutrals-600"
              )}
              title={`Schritt ${n}`}
            >
              {n}
            </div>
            {n !== 8 && <div className="w-6 h-1 mx-2 rounded bg-neutrals-200" />}
          </div>
        ))}
      </div>
      <div className="h-2 bg-neutrals-200 rounded-full">
        <div className="h-2 bg-primary-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-center text-small text-neutrals-500 mt-1">Fortschritt: {pct}%</p>
    </div>
  );
}

// --- Simple DnD List --------------------------------------------------------
function DraggableList({ items, setItems, render, itemKey }) {
  const dragIndex = useRef(null);
  return (
    <ul className="divide-y divide-accent-700 rounded-xl border border-accent-700 bg-neutrals-0">
      {items.map((it, i) => (
        <li
          key={itemKey(it)}
          draggable
          onDragStart={() => (dragIndex.current = i)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const from = dragIndex.current;
            const to = i;
            if (from === null || to === null || from === to) return;
            const next = items.slice();
            const [moved] = next.splice(from, 1);
            next.splice(to, 0, moved);
            setItems(next);
            dragIndex.current = null;
          }}
          className="p-3 flex items-center gap-3 hover:bg-neutrals-50"
        >
          <span className="cursor-move text-neutrals-400">↕</span>
          {render(it, i)}
        </li>
      ))}
    </ul>
  );
}

// --- Mock n8n endpoints (deterministic, local) -----------------------------
function extractThemesValues(stories) {
  // Very simple heuristic based on skills and words
  const skillCounts = {};
  const emoAvg = [];
  const keywords = {};
  for (const st of stories) {
    (st.skills || []).forEach((s) => (skillCounts[s] = (skillCounts[s] || 0) + 1));
    if (st.emotion) emoAvg.push(Number(st.emotion));
    const words = `${st.context} ${st.action} ${st.impact}`.toLowerCase().match(/[a-zäöüß]+/gi) || [];
    words.forEach((w) => (keywords[w] = (keywords[w] || 0) + 1));
  }
  const topSkills = Object.entries(skillCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k]) => k);
  const topWords = Object.entries(keywords).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k]) => k);
  const themes = Array.from(new Set([
    topWords.includes("team") || topSkills.includes("Teamwork") ? "Kollaboration" : null,
    topWords.includes("analyse") || topSkills.includes("Analyse") ? "Analytik" : null,
    topWords.includes("kunde") || topSkills.includes("Customer") ? "Kundenzentrierung" : null,
    topWords.includes("strategie") ? "Strategie" : null,
    topWords.includes("prozess") ? "Prozessoptimierung" : null,
    topWords.includes("ai") || topWords.includes("ml") ? "AI/Automation" : null,
  ].filter(Boolean))).slice(0, 5);
  const values = [
    emoAvg.length && emoAvg.reduce((a, b) => a + b, 0) / emoAvg.length > 3.5 ? "Wachstum & Freude" : "Sinn & Stabilität",
    topSkills.includes("Leadership") ? "Führung" : "Autonomie",
    topSkills.includes("Creativity") ? "Kreativität" : "Wirksamkeit",
  ];
  const implications = [
    themes.includes("Strategie") ? "Rollen mit strategischem Einfluss priorisieren" : "Operative Rollen mit Lernkurve wählen",
    themes.includes("AI/Automation") ? "AI‑getriebene Produkte/Prozesse suchen" : "Digitalisierung als Enabler nutzen",
    values.includes("Führung") ? "Führungsverantwortung mittelfristig aufbauen" : "Expertenlaufbahn mit hoher Ownership",
  ];
  return { themes, coreValues: values, implications, topSkills };
}

function generateCareerPlan(analysis, context) {
  const wantsHamburg = (context?.chips || []).includes("Hamburg");
  const wantsRenewables = (context?.chips || []).includes("Erneuerbare");
  const wantsAI = (context?.chips || []).includes("AI");
  const target = [
    wantsRenewables ? "Business Development im Renewable‑Sektor" : "Strategie/Transformation in Tech/Industrie",
    wantsAI ? " mit AI‑Fokus" : "",
    wantsHamburg ? " in Hamburg" : "",
  ].join("");
  const options = [
    wantsRenewables ? "BD/Strategy bei Renewable‑Entwicklern (z. B. Onshore/Offshore Wind, PV, Storage)" : "Corporate Strategy (Industrie/Tech)",
    analysis?.themes?.includes("AI/Automation") ? "Product/AI Strategy in digitalen Units" : "Transformation/PMO für großskalige Programme",
    "Inhouse Beratung mit starkem Umsetzungsfokus",
  ];
  const roadmap = [
    { horizon: "0–3 Monate", actions: ["Portfolio an Seven‑Stories finalisieren", "2 Leuchtturm‑Stories als Case Deck aufbereiten", "3 Zielfirmen identifizieren & Netzwerk aktivieren"] },
    { horizon: "3–6 Monate", actions: ["2 Interviews/Monat führen", "Technical Depth in einem Schwerpunkt (z. B. AI/Automation) vertiefen", "Side‑Project/PoC veröffentlichen"] },
    { horizon: "6–12 Monate", actions: ["Zielrolle annehmen oder Seniorität ausbauen", "Mentoring & Thought Leadership starten"] },
  ];
  const risks = [
    { risk: "Zerfaserter Fokus", mitigation: "Max. 2 Schwerpunkte parallel verfolgen" },
    { risk: "Analyse ohne Sichtbarkeit", mitigation: "Output öffentlich machen (Deck, Blog, GitHub)" },
    { risk: "Netzwerk-Engpässe", mitigation: "Wöchentliche Reach‑outs (3/Woche)" },
  ];
  return { goal: target || "Klar positionierte Rolle mit hoher Wirksamkeit", options, roadmap, risks };
}

function asMarkdown(j) {
  const exps = j.experiences || [];
  const top7 = (j.top7Ids || []).map((id) => exps.find((e) => e.id === id)).filter(Boolean);
  const stories = top7.map((e) => ({ title: e.title, ...(j.stories?.[e.id] || {}) }));
  const lines = [];
  lines.push(`# Career Navigator – Export`);
  lines.push("");
  lines.push(`Journey ID: ${j.id}`);
  lines.push("");
  lines.push("## Experiences (Top 7)\\n");
  top7.forEach((e, i) => lines.push(`${i + 1}. **${e.title}** — Tags: ${(e.tags || []).join(", ")}`));
  lines.push("");
  lines.push("## Stories\\n");
  stories.forEach((s, i) => {
    lines.push(`### ${i + 1}. ${s.title}`);
    lines.push(`- Kontext: ${s.context || "-"}`);
    lines.push(`- Handlung: ${s.action || "-"}`);
    lines.push(`- Skills: ${(s.skills || []).join(", ") || "-"}`);
    lines.push(`- Emotion: ${s.emotion || "-"}`);
    lines.push(`- Impact: ${s.impact || "-"}`);
    lines.push("");
  });
  if (j.analysis) {
    lines.push("## Analyse\\n");
    lines.push(`**Themes:** ${(j.analysis.themes || []).join(", ")}`);
    lines.push(`**Core Values:** ${(j.analysis.coreValues || []).join(", ")}`);
    lines.push(`**Implikationen:** ${(j.analysis.implications || []).join(", ")}`);
    lines.push("");
  }
  if (j.context) {
    lines.push("## Kontextprofil\\n");
    lines.push(`Chips: ${(j.context.chips || []).join(", ")}`);
    lines.push(`Notizen: ${j.context.notes || "-"}`);
    lines.push("");
  }
  if (j.plan) {
    lines.push("## Career‑Plan\\n");
    lines.push(`**Zielbild:** ${j.plan.goal}`);
    lines.push("**Optionen:**");
    (j.plan.options || []).forEach((o) => lines.push(`- ${o}`));
    lines.push("**Roadmap:**");
    (j.plan.roadmap || []).forEach((r) => {
      lines.push(`- ${r.horizon}: ${(r.actions || []).join("; ")}`);
    });
    lines.push("**Risiken & Mitigation:**");
    (j.plan.risks || []).forEach((r) => lines.push(`- ${r.risk} → ${r.mitigation}`));
  }
  return lines.join("\\n");
}

// --- Shell -----------------------------------------------------------------
function Shell({ step, setStep, saveState, children }) {
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    try {
      const supabase = getSupabaseClient();
      supabase.auth
        .getUser()
        .then(({ data: { user } }) => setEmail(user?.email ?? null));
    } catch (e) {
      console.error(e);
    }
  }, []);
  const handleLogout = async () => {
    try {
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
      window.location.href = "/login";
    } catch (e) {
      console.error(e);
    }
  };
  const stepToPhase = (s) => (s <= 4 ? "Phase 1" : s <= 6 ? "Phase 2" : "Phase 3");
  return (
    <div className="min-h-screen bg-gradient-to-b from-neutrals-0 to-neutrals-50 text-neutrals-900">
      <header className="sticky top-0 z-40 backdrop-blur bg-neutrals-0/70 border-b border-accent-700">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-2xl bg-primary-500 text-neutrals-0 flex items-center justify-center font-bold">CN</div>
            <div>
              <div className="font-display text-h6">Career Navigator – MVP</div>
              <div className="text-small text-neutrals-500">{step === 0 ? "Onboarding" : `Schritt ${step} • ${stepToPhase(step)}`}</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {email && <span className="text-small text-neutrals-600">{email}</span>}
            {email && <button onClick={handleLogout} className="px-3 py-1.5 rounded-xl border">Logout</button>}
            <SaveIndicator state={saveState} />
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <ProgressSteps current={Math.max(1, step || 1)} />
        {children}
        <footer className="py-4 text-small text-neutrals-500 text-center">MVP Demo • Local only • Mocked n8n</footer>
      </main>
    </div>
  );
}

// --- Phase 1 (Steps 1–4) ---------------------------------------------------
const DEFAULT_SKILLS = ["Analyse", "Leadership", "Teamwork", "Creativity", "Customer", "Research", "Delivery", "Communication"];
const CONTEXT_CHIPS = ["Hamburg", "International", "Remote", "Erneuerbare", "AI", "Strategie", "Produkt", "Beratung", "Corporate", "SME"];

function Phase1({ journey, setJourney, nextStep, toasts }) {
  const [sub, setSub] = useState(1); // 1..2 within Phase 1
  const exps = journey.experiences || [];
  const [newExpTitle, setNewExpTitle] = useState("");

  const canNextFrom1 = exps.length >= 15; // require 15 experiences
  const canFinishPhase = (journey.top7Ids || []).length === Math.min(7, exps.length) && exps.length >= 15;

  const addExperience = () => {
    if (!newExpTitle.trim()) return toasts.push("Titel hinzufügen");
    if (exps.length >= 15) return toasts.push("Maximal 15 Experiences");
    const e = { id: uid(), title: newExpTitle.trim() };
    setJourney((j) => ({ ...j, experiences: [...(j.experiences || []), e], ranking: [...(j.ranking || []), e.id] }));
    setNewExpTitle("");
  };

  const removeExperience = (id) => {
    setJourney((j) => ({
      ...j,
      experiences: j.experiences.filter((e) => e.id !== id),
      ranking: (j.ranking || []).filter((r) => r !== id),
      top7Ids: (j.top7Ids || []).filter((r) => r !== id),
    }));
  };

  const rankingList = (journey.ranking || []).map((id) => exps.find((e) => e.id === id)).filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        <div className={cls("md:col-span-2", "space-y-6")}>
          {sub === 1 && (
            <section className="bg-neutrals-0 rounded-2xl shadow-elevation2 border border-accent-700 p-4">
              <h2 className="text-lg font-semibold mb-2">Schritt 1: Experiences sammeln (15)</h2>
              <p className="text-body text-neutrals-600 mb-4">Notiere kurze Titel deiner 15 beruflichen Erfahrungen.</p>
              <div className="grid md:grid-cols-2 gap-3">
                <input
                  className="h-12 px-4 rounded-2xl border border-accent-700 md:col-span-2"
                  placeholder="Titel (z. B. Projekt X gelauncht)"
                  value={newExpTitle}
                  onChange={(e) => setNewExpTitle(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 mt-3">
                <button onClick={addExperience} className="px-3 py-2 rounded-xl bg-primary-500 text-neutrals-0 hover:bg-primary-600">Experience hinzufügen</button>
                <span className="text-small text-neutrals-500">{exps.length}/15</span>
              </div>
              <ul className="mt-4 space-y-2">
                {exps.map((e, i) => (
                  <li key={e.id} className="border border-accent-700 rounded-xl p-3 flex items-center justify-between">
                    <span>{i + 1}. {e.title}</span>
                    <button className="text-neutrals-500" onClick={() => removeExperience(e.id)}>✕</button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {sub === 2 && (
            <section className="bg-neutrals-0 rounded-2xl shadow-elevation2 border border-accent-700 p-4">
              <h2 className="text-lg font-semibold mb-2">Schritt 2: Ranking & Top‑7 auswählen</h2>
              <p className="text-body text-neutrals-600 mb-2">Per Drag & Drop sortieren. Die ersten 7 gelten als Top‑7.</p>
              <DraggableList
                items={rankingList}
                setItems={(list) =>
                  setJourney((j) => ({
                    ...j,
                    ranking: list.map((x) => x.id),
                    top7Ids: list.slice(0, Math.min(7, list.length)).map((x) => x.id),
                  }))
                }
                render={(e, i) => (
                  <div className="flex-1 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{i + 1}. {e.title}</div>
                    </div>
                    <span
                      className={cls(
                        "text-small px-2 py-1 rounded-full border",
                        i < 7
                          ? "bg-semantic-success-light text-semantic-success-dark border-semantic-success-base"
                          : "bg-neutrals-50 text-neutrals-600 border-accent-700",
                      )}
                    >
                      {i < 7 ? "Top‑7" : "—"}
                    </span>
                  </div>
                )}
                itemKey={(e) => e.id}
              />
            </section>
          )}

          {sub === 4 && (
            <section className="bg-neutrals-0 rounded-2xl shadow-elevation2 border border-accent-700 p-4">
              <h2 className="text-lg font-semibold mb-2">Schritt 4: Ranking & Top‑7 auswählen</h2>
            <p className="text-body text-neutrals-600 mb-2">Per Drag & Drop sortieren. Die ersten 7 gelten als Top‑7.</p>
              <DraggableList
                items={rankingList}
                setItems={(list) =>
                  setJourney((j) => ({
                    ...j,
                    ranking: list.map((x) => x.id),
                    top7Ids: list.slice(0, Math.min(7, list.length)).map((x) => x.id),
                  }))
                }
                render={(e, i) => (
                  <div className="flex-1 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{i + 1}. {e.title}</div>
                    <div className="text-small text-neutrals-500">Tags: {(e.tags || []).join(", ") || "—"}</div>
                    </div>
                    <span className={cls(
                      "text-small px-2 py-1 rounded-full border",
                      i < 7
                        ? "bg-semantic-success-light text-semantic-success-dark border-semantic-success-base"
                        : "bg-neutrals-50 text-neutrals-600 border-accent-700"
                    )}>{i < 7 ? "Top‑7" : "—"}</span>
                  </div>
                )}
                itemKey={(e) => e.id}
              />
            </section>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <section className="bg-neutrals-0 rounded-2xl shadow-elevation2 border border-accent-700 p-4">
            <h3 className="font-display text-h6 mb-2">Checkliste Phase 1</h3>
            <ul className="text-body space-y-1">
              <li>✓ Mind. 15 Experiences: <b>{exps.length}</b></li>
              <li>{canFinishPhase ? "✓" : "○"} Top‑7 ausgewählt</li>
            </ul>
          </section>
          <section className="bg-neutrals-0 rounded-2xl shadow-elevation2 border border-accent-700 p-4 space-y-2">
            <div className="flex flex-wrap gap-2">
              {[1, 2].map((i) => (
                <button
                  key={i}
                  onClick={() => setSub(i)}
                  className={cls(
                    "px-3 py-1.5 rounded-xl text-small border",
                    sub === i
                      ? "bg-primary-500 text-neutrals-0 border-primary-500"
                      : "bg-neutrals-0 hover:bg-neutrals-50"
                  )}
                >
                  Schritt {i}
                </button>
              ))}
            </div>
            <div className="pt-2 border-t">
              {sub < 2 ? (
                <button
                  disabled={!canNextFrom1}
                  onClick={() => setSub((s) => Math.min(2, s + 1))}
                  className="w-full px-3 py-2 rounded-xl bg-primary-500 text-neutrals-0 disabled:opacity-40"
                >
                  Weiter
                </button>
              ) : (
                <button
                  disabled={!canFinishPhase}
                  onClick={nextStep}
                  className="w-full px-3 py-2 rounded-xl bg-semantic-success-base text-neutrals-0 disabled:opacity-40"
                >
                  Phase 1 abschließen
                </button>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

// --- Phase 2 (Steps 5–6) ---------------------------------------------------
function StoryForm({ value, onChange }) {
  return (
    <div className="space-y-2">
      <label className="text-small">Kontext</label>
      <textarea className="w-full rounded-2xl border border-accent-700 p-4" rows={2} value={value.context || ""} onChange={(e) => onChange({ ...value, context: e.target.value })} />
      <label className="text-small">Handlung</label>
      <textarea className="w-full rounded-2xl border border-accent-700 p-4" rows={2} value={value.action || ""} onChange={(e) => onChange({ ...value, action: e.target.value })} />
      <label className="text-small">Skills</label>
      <div className="flex flex-wrap gap-2">
        {DEFAULT_SKILLS.map((s) => {
          const active = (value.skills || []).includes(s);
          return (
            <button
              type="button"
              key={s}
              onClick={() => {
                const set = new Set(value.skills || []);
                if (active) set.delete(s); else set.add(s);
                onChange({ ...value, skills: Array.from(set) });
              }}
              className={cls(
                "px-2 py-1 rounded-full text-small border",
                active ? "bg-primary-500 text-neutrals-0 border-primary-500" : "bg-neutrals-0 hover:bg-neutrals-50"
              )}
            >
              {s}
            </button>
          );
        })}
      </div>
      <label className="text-small">Emotion (1–5)</label>
      <input type="range" min="1" max="5" value={value.emotion || 3} onChange={(e) => onChange({ ...value, emotion: Number(e.target.value) })} className="w-full" />
      <label className="text-small">Impact</label>
      <textarea className="w-full rounded-2xl border border-accent-700 p-4" rows={2} value={value.impact || ""} onChange={(e) => onChange({ ...value, impact: e.target.value })} />
    </div>
  );
}

function Phase2({ journey, setJourney, nextStep, toasts }) {
  const top = (journey.top7Ids || []).map((id) => (journey.experiences || []).find((e) => e.id === id)).filter(Boolean);
  const stories = journey.stories || {};
  const storiesFilled = top.every((e) => {
    const s = stories[e.id] || {};
    return (s.context || s.action || s.impact) && (s.skills || []).length > 0;
  });
  const hasAnalysis = !!journey.analysis;

  const runAnalysis = () => {
    const payload = top.map((e) => stories[e.id] || {});
    const res = extractThemesValues(payload);
    setJourney((j) => ({ ...j, analysis: res }));
    toasts.push("AI‑Analyse durchgeführt (mock)");
  };

  return (
    <div className="space-y-6">
      <section className="bg-neutrals-0 rounded-2xl shadow-elevation2 border border-accent-700 p-4">
        <h2 className="text-lg font-semibold mb-2">Schritt 5: 7 Detail‑Stories</h2>
        <p className="text-body text-neutrals-600 mb-3">Fülle für jede Top‑Experience die Felder aus. Mindestens Skills auswählen.</p>
        <div className="space-y-4">
          {top.map((e, idx) => (
            <div key={e.id} className="border border-accent-700 rounded-2xl p-3">
              <div className="font-medium mb-2">{idx + 1}. {e.title}</div>
              <StoryForm value={stories[e.id] || { skills: [] }} onChange={(val) => setJourney((j) => ({ ...j, stories: { ...(j.stories || {}), [e.id]: val } }))} />
            </div>
          ))}
        </div>
      </section>

      <section className="bg-neutrals-0 rounded-2xl shadow-elevation2 border border-accent-700 p-4">
        <h2 className="text-lg font-semibold mb-2">Schritt 6: AI‑Analyse</h2>
        <p className="text-body text-neutrals-600 mb-3">Extrahiert Themes, Core Values & Implikationen (mocked n8n).</p>
        <div className="flex items-center gap-2 mb-3">
          <button onClick={runAnalysis} disabled={!storiesFilled} className="px-3 py-2 rounded-xl bg-primary-500 text-neutrals-0 disabled:opacity-40">Analyse starten</button>
          {!storiesFilled && <span className="text-small text-neutrals-500">Bitte vorher Stories mit Skills füllen</span>}
        </div>
        {hasAnalysis && (
          <div className="grid md:grid-cols-3 gap-3">
          <div className="border border-accent-700 rounded-xl p-3"><div className="font-medium mb-1">Themes</div><ul className="list-disc pl-5 text-body">{journey.analysis.themes.map((t) => <li key={t}>{t}</li>)}</ul></div>
          <div className="border border-accent-700 rounded-xl p-3"><div className="font-medium mb-1">Core Values</div><ul className="list-disc pl-5 text-body">{journey.analysis.coreValues.map((t) => <li key={t}>{t}</li>)}</ul></div>
          <div className="border border-accent-700 rounded-xl p-3"><div className="font-medium mb-1">Implikationen</div><ul className="list-disc pl-5 text-body">{journey.analysis.implications.map((t) => <li key={t}>{t}</li>)}</ul></div>
          </div>
        )}
      </section>

      <div className="flex justify-end">
        <button onClick={nextStep} disabled={!hasAnalysis} className="px-4 py-2 rounded-xl bg-semantic-success-base text-neutrals-0 disabled:opacity-40">Phase 2 abschließen</button>
      </div>
    </div>
  );
}

// --- Phase 3 (Steps 7–8) ---------------------------------------------------
function Phase3({ journey, setJourney, toasts }) {
  const [generated, setGenerated] = useState(!!journey.plan);

  const generate = () => {
    const plan = generateCareerPlan(journey.analysis || {}, journey.context || {});
    setJourney((j) => ({ ...j, plan }));
    setGenerated(true);
    toasts.push("Career‑Plan generiert (mock)");
  };

  const j = journey;

  const download = (filename, text, mime = "text/plain") => {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <section className="bg-neutrals-0 rounded-2xl shadow-elevation2 border border-accent-700 p-4">
        <h2 className="text-lg font-semibold mb-2">Schritt 7: Kontextprofil</h2>
        <p className="text-body text-neutrals-600 mb-3">Wähle passende Chips & ergänze Notizen.</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {CONTEXT_CHIPS.map((c) => {
            const active = (j.context?.chips || []).includes(c);
            return (
              <button
                key={c}
                onClick={() => {
                  const set = new Set(j.context?.chips || []);
                  active ? set.delete(c) : set.add(c);
                  setJourney((x) => ({ ...x, context: { ...(x.context || {}), chips: Array.from(set) } }));
                }}
                className={cls(
                  "px-2 py-1 rounded-full text-small border",
                  active ? "bg-primary-500 text-neutrals-0 border-primary-500" : "bg-neutrals-0 hover:bg-neutrals-50"
                )}
              >
                {c}
              </button>
            );
          })}
        </div>
        <textarea
          className="w-full rounded-2xl border border-accent-700 p-4"
          rows={3}
          placeholder="Rahmenbedingungen, Interessen, Standort‑Wünsche, Gehaltskorridor, etc."
          value={j.context?.notes || ""}
          onChange={(e) => setJourney((x) => ({ ...x, context: { ...(x.context || {}), notes: e.target.value } }))}
        />
      </section>

      <section className="bg-neutrals-0 rounded-2xl shadow-elevation2 border border-accent-700 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Schritt 8: Career‑Plan</h2>
          <button onClick={generate} className="px-3 py-2 rounded-xl bg-primary-500 text-neutrals-0">Plan generieren</button>
        </div>
        {journey.plan && (
          <div className="grid md:grid-cols-2 gap-3">
            <div className="border border-accent-700 rounded-xl p-3 space-y-2">
              <label className="text-small">Zielbild</label>
              <textarea className="w-full rounded-2xl border border-accent-700 p-4" rows={2} value={j.plan.goal} onChange={(e) => setJourney((x) => ({ ...x, plan: { ...x.plan, goal: e.target.value } }))} />
              <div>
                <div className="font-medium mb-1">Optionen</div>
                {(j.plan.options || []).map((o, i) => (
                  <div key={i} className="flex items-center gap-2 mb-2">
                    <input className="flex-1 h-12 px-4 rounded-2xl border border-accent-700" value={o} onChange={(e) => setJourney((x) => ({ ...x, plan: { ...x.plan, options: x.plan.options.map((v, idx) => (idx === i ? e.target.value : v)) } }))} />
                    <button className="text-neutrals-500" onClick={() => setJourney((x) => ({ ...x, plan: { ...x.plan, options: x.plan.options.filter((_, idx) => idx !== i) } }))}>✕</button>
                  </div>
                ))}
                <button className="text-small px-2 py-1 rounded-lg border border-accent-700" onClick={() => setJourney((x) => ({ ...x, plan: { ...x.plan, options: [...(x.plan.options || []), "Neue Option"] } }))}>+ Option</button>
              </div>
            </div>
            <div className="border border-accent-700 rounded-xl p-3 space-y-2">
              <div className="font-medium">Roadmap</div>
              {(j.plan.roadmap || []).map((r, i) => (
                <div key={i} className="border border-accent-700 rounded-xl p-2 mb-2">
                  <input className="w-full h-12 px-4 rounded-2xl border border-accent-700 mb-2" value={r.horizon} onChange={(e) => setJourney((x) => ({ ...x, plan: { ...x.plan, roadmap: x.plan.roadmap.map((v, idx) => (idx === i ? { ...v, horizon: e.target.value } : v)) } }))} />
                  {(r.actions || []).map((a, k) => (
                    <div key={k} className="flex items-center gap-2 mb-1">
                      <input className="flex-1 h-12 px-4 rounded-2xl border border-accent-700" value={a} onChange={(e) => setJourney((x) => ({ ...x, plan: { ...x.plan, roadmap: x.plan.roadmap.map((v, idx) => (idx === i ? { ...v, actions: v.actions.map((av, ak) => (ak === k ? e.target.value : av)) } : v)) } }))} />
                      <button className="text-neutrals-500" onClick={() => setJourney((x) => ({ ...x, plan: { ...x.plan, roadmap: x.plan.roadmap.map((v, idx) => (idx === i ? { ...v, actions: v.actions.filter((_, ak) => ak !== k) } : v)) } }))}>✕</button>
                    </div>
                  ))}
                  <button className="text-small px-2 py-1 rounded-lg border border-accent-700" onClick={() => setJourney((x) => ({ ...x, plan: { ...x.plan, roadmap: x.plan.roadmap.map((v, idx) => (idx === i ? { ...v, actions: [...v.actions, "Neue Aktion"] } : v)) } }))}>+ Aktion</button>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-2 rounded-xl border border-accent-700"
            onClick={() => {
              const md = asMarkdown(journey);
              const link = document.createElement("a");
              const blob = new Blob([md], { type: "text/markdown" });
              link.href = URL.createObjectURL(blob);
              link.download = `career-navigator-${journey.id}.md`;
              link.click();
              URL.revokeObjectURL(link.href);
            }}
          >
            Export: Markdown
          </button>
          <button className="px-3 py-2 rounded-xl border border-accent-700" onClick={() => window.print()}>Export: PDF (Drucken)</button>
        </div>
      </section>
    </div>
  );
}

// --- Main App ---------------------------------------------------------------
export default function CareerNavigator() {
  const { toasts, push } = useToasts();
  const [step, setStep] = useState(0); // 0=Onboarding, 1..8 = Steps
  const [saveState, setSaveState] = useState("idle");
  const [journey, setJourney] = useState(() => {
    const key = "careerNavigatorJourneyV1";
    const raw = typeof window !== "undefined" ? localStorage.getItem(key) : null;
    if (raw) {
      try { return JSON.parse(raw); } catch {}
    }
    return { id: uid(), createdAt: new Date().toISOString(), experiences: [], ranking: [], top7Ids: [], stories: {}, context: { chips: [], notes: "" } };
  });

  useEffect(() => {
    try {
      const supabase = getSupabaseClient();
      supabase
        .from('journeys')
        .select('id')
        .limit(1)
        .then(({ error }) => {
          if (error) {
            console.error('Supabase connection error', error);
          } else {
            console.log('Connected to Supabase');
          }
        });
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Autosave to localStorage
  const saveDebounced = useMemo(() => debounce((j) => {
    localStorage.setItem("careerNavigatorJourneyV1", JSON.stringify(j));
    setSaveState("saved");
    setTimeout(() => setSaveState("idle"), 800);
  }, 700), []);

  useEffect(() => {
    setSaveState("saving");
    saveDebounced(journey);
  }, [journey]);

  const reset = () => {
    localStorage.removeItem("careerNavigatorJourneyV1");
    setJourney({ id: uid(), createdAt: new Date().toISOString(), experiences: [], ranking: [], top7Ids: [], stories: {}, context: { chips: [], notes: "" } });
    setStep(0);
    push("Zurückgesetzt");
  };

  const nextStep = () => setStep((s) => Math.min(8, s + 1));
  const prevStep = () => setStep((s) => Math.max(0, s - 1));

  // Phase access guard: only allow navigation to next page when previous phase done
  const phaseDone = {
    p1: (journey.top7Ids || []).length === 7,
    p2: !!journey.analysis,
    p3: !!journey.plan,
  };

  return (
    <Shell step={step} setStep={setStep} saveState={saveState}>
      {step === 0 && (
        <section className="bg-neutrals-0 rounded-2xl shadow-elevation2 border border-accent-700 p-6">
          <h1 className="text-2xl font-semibold mb-2">Willkommen zum Career Navigator (MVP)</h1>
          <p className="text-body text-neutrals-600 mb-4">Geführter 8‑Schritte‑Prozess nach „Seven Stories“. Alles lokal, ohne Login. Du kannst jederzeit zurückkehren – Autosave ist aktiv.</p>
          <ol className="list-decimal pl-5 text-body text-neutrals-700 space-y-1 mb-4">
            <li>20 Experiences sammeln, taggen & clustern</li>
            <li>Top‑7 ranken</li>
            <li>7 Detail‑Stories schreiben</li>
            <li>AI‑Analyse (Themes, Core Values, Implikationen)</li>
            <li>Kontextprofil definieren</li>
            <li>Career‑Plan generieren & exportieren</li>
          </ol>
          <div className="flex items-center gap-2">
            <button onClick={() => setStep(1)} className="px-4 py-2 rounded-xl bg-primary-500 text-neutrals-0">Starten</button>
            <button onClick={reset} className="px-4 py-2 rounded-xl border">Zurücksetzen</button>
          </div>
        </section>
      )}

      {step >= 1 && step <= 4 && (
        <div>
          <Phase1
            journey={journey}
            setJourney={setJourney}
            nextStep={() => setStep(5)}
            toasts={{ push }}
          />
          <div className="flex gap-2">
            <button onClick={prevStep} className="px-3 py-2 rounded-xl border">Zurück</button>
            <button onClick={() => setStep(5)} disabled={!phaseDone.p1} className="flex-1 px-3 py-2 rounded-xl bg-primary-500 text-neutrals-0 disabled:opacity-40">Weiter zu Phase 2</button>
          </div>
        </div>
      )}

      {step >= 5 && step <= 6 && (
        <div>
          <Phase2 journey={journey} setJourney={setJourney} nextStep={() => setStep(7)} toasts={{ push }} />
          <div className="flex justify-between mt-4">
            <button onClick={() => setStep(4)} className="px-3 py-2 rounded-xl border">Zurück zu Phase 1</button>
            <button onClick={() => setStep(7)} disabled={!phaseDone.p2} className="px-3 py-2 rounded-xl bg-primary-500 text-neutrals-0 disabled:opacity-40">Weiter zu Phase 3</button>
          </div>
        </div>
      )}

      {step >= 7 && (
        <div>
          <Phase3 journey={journey} setJourney={setJourney} toasts={{ push }} />
          <div className="flex justify-between mt-4">
            <button onClick={() => setStep(6)} className="px-3 py-2 rounded-xl border">Zurück zu Phase 2</button>
            <button onClick={() => setStep(8)} className="px-3 py-2 rounded-xl bg-primary-500 text-neutrals-0">Fertig</button>
          </div>
        </div>
      )}

      <Toasts toasts={toasts} />
    </Shell>
  );
}
