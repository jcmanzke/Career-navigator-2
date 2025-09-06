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

// --- Progress Steps (5 steps) ----------------------------------------------
function ProgressSteps({ current }) {
  const steps = Array.from({ length: 5 }, (_, i) => i + 1);
  const pct = Math.round(((current - 1) / 5) * 100);
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
            {n !== 5 && <div className="w-6 h-1 mx-2 rounded bg-neutrals-200" />}
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
  const stepToPhase = (s) => `Phase ${s}`;
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
      </main>
    </div>
  );
}

// --- Phase 1 ---------------------------------------------------
function Phase1({ journey, setJourney, onNext }) {
  const exps = journey.experiences || [];
  const [title, setTitle] = useState("");
  const add = () => {
    if (!title.trim()) return;
    if (exps.length >= 15) return;
    const e = { id: uid(), title: title.trim() };
    setJourney((j) => ({
      ...j,
      experiences: [...(j.experiences || []), e],
      ranking: [...(j.ranking || []), e.id],
    }));
    setTitle("");
  };
  const remove = (id) => {
    setJourney((j) => ({
      ...j,
      experiences: j.experiences.filter((e) => e.id !== id),
      ranking: (j.ranking || []).filter((r) => r !== id),
      top7Ids: (j.top7Ids || []).filter((r) => r !== id),
      stories: Object.fromEntries(Object.entries(j.stories || {}).filter(([k]) => k !== id)),
    }));
  };
  const canNext = exps.length >= 5;
  return (
    <div className="space-y-4">
      <section className="bg-neutrals-0 rounded-2xl shadow-elevation2 border border-accent-700 p-4">
        <h2 className="text-lg font-semibold mb-2">Phase 1: Erinnerungen sammeln</h2>
        <p className="text-body text-neutrals-600 mb-3">Füge bis zu 15 Erfahrungen hinzu (mindestens 5, um fortzufahren).</p>
        <div className="flex gap-2 mb-3">
          <input
            className="flex-1 h-12 px-4 rounded-2xl border border-accent-700"
            placeholder="Titel der Erfahrung"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <button onClick={add} className="px-3 py-2 rounded-xl bg-primary-500 text-neutrals-0 hover:bg-primary-600">Hinzufügen</button>
        </div>
        <ul className="space-y-2">
          {exps.map((e, i) => (
            <li key={e.id} className="border border-accent-700 rounded-xl p-3 flex items-center justify-between">
              <span>{i + 1}. {e.title}</span>
              <button className="text-neutrals-500" onClick={() => remove(e.id)}>✕</button>
            </li>
          ))}
        </ul>
        <div className="mt-2 text-small text-neutrals-500">{exps.length}/15</div>
      </section>
      <div className="flex justify-end">
        <button onClick={onNext} disabled={!canNext} className="px-3 py-2 rounded-xl bg-primary-500 text-neutrals-0 disabled:opacity-40">Weiter zu Phase 2</button>
      </div>
    </div>
  );
}

// --- Phase 2 ---------------------------------------------------
function Phase2({ journey, setJourney, onNext, onBack }) {
  const exps = journey.experiences || [];
  const rankingList = (journey.ranking && journey.ranking.length === exps.length
    ? journey.ranking
    : exps.map((e) => e.id))
    .map((id) => exps.find((e) => e.id === id))
    .filter(Boolean);
  const setList = (list) =>
    setJourney((j) => ({
      ...j,
      ranking: list.map((x) => x.id),
      top7Ids: list.slice(0, Math.min(7, list.length)).map((x) => x.id),
    }));
  const canNext = rankingList.length >= Math.min(7, exps.length) && exps.length >= 5;
  return (
    <div className="space-y-4">
      <section className="bg-neutrals-0 rounded-2xl shadow-elevation2 border border-accent-700 p-4">
        <h2 className="text-lg font-semibold mb-2">Phase 2: Top‑7 ranken</h2>
        <p className="text-body text-neutrals-600 mb-2">Sortiere deine Erfahrungen per Drag & Drop. Die ersten 7 gelten als Top‑7.</p>
        <DraggableList
          items={rankingList}
          setItems={setList}
          render={(e, i) => (
            <div className="flex-1 flex items-center justify-between">
              <div>{i + 1}. {e.title}</div>
              <span className={cls("text-small px-2 py-1 rounded-full border",
                i < 7 ? "bg-semantic-success-light text-semantic-success-dark border-semantic-success-base" : "bg-neutrals-50 text-neutrals-600 border-accent-700"
              )}>{i < 7 ? "Top‑7" : ""}</span>
            </div>
          )}
          itemKey={(e) => e.id}
        />
      </section>
      <div className="flex justify-between">
        <button onClick={onBack} className="px-3 py-2 rounded-xl border">Zurück</button>
        <button onClick={onNext} disabled={!canNext} className="px-3 py-2 rounded-xl bg-primary-500 text-neutrals-0 disabled:opacity-40">Weiter zu Phase 3</button>
      </div>
    </div>
  );
}

// --- Phase 3 ---------------------------------------------------
function Phase3({ journey, setJourney, onNext, onBack }) {
  const top = (journey.top7Ids || [])
    .map((id) => (journey.experiences || []).find((e) => e.id === id))
    .filter(Boolean);
  const stories = journey.stories || {};
  const update = (id, field, value) =>
    setJourney((j) => ({
      ...j,
      stories: { ...(j.stories || {}), [id]: { ...(j.stories?.[id] || {}), [field]: value } },
    }));
  const canNext = top.length > 0;
  return (
    <div className="space-y-4">
      <section className="bg-neutrals-0 rounded-2xl shadow-elevation2 border border-accent-700 p-4">
        <h2 className="text-lg font-semibold mb-2">Phase 3: Details zu Top‑7</h2>
        <div className="space-y-4">
          {top.map((e, idx) => (
            <div key={e.id} className="border border-accent-700 rounded-2xl p-3">
              <div className="font-medium mb-2">{idx + 1}. {e.title}</div>
              <textarea
                className="w-full rounded-2xl border border-accent-700 p-3 mb-2"
                rows={2}
                placeholder="Kontext"
                value={stories[e.id]?.context || ""}
                onChange={(ev) => update(e.id, "context", ev.target.value)}
              />
              <textarea
                className="w-full rounded-2xl border border-accent-700 p-3"
                rows={2}
                placeholder="Impact"
                value={stories[e.id]?.impact || ""}
                onChange={(ev) => update(e.id, "impact", ev.target.value)}
              />
            </div>
          ))}
        </div>
      </section>
      <div className="flex justify-between">
        <button onClick={onBack} className="px-3 py-2 rounded-xl border">Zurück</button>
        <button onClick={onNext} disabled={!canNext} className="px-3 py-2 rounded-xl bg-primary-500 text-neutrals-0 disabled:opacity-40">Weiter zu Phase 4</button>
      </div>
    </div>
  );
}

// --- Phase 4 ---------------------------------------------------
function Phase4({ onNext, onBack }) {
  return (
    <div className="space-y-4">
      <section className="bg-neutrals-0 rounded-2xl shadow-elevation2 border border-accent-700 p-4">
        <h2 className="text-lg font-semibold mb-2">Phase 4: AI‑Analyse</h2>
        <p className="text-body text-neutrals-600">Die Analyse und Clusterung der Erfahrungen wird später durch einen externen AI‑Service durchgeführt.</p>
      </section>
      <div className="flex justify-between">
        <button onClick={onBack} className="px-3 py-2 rounded-xl border">Zurück</button>
        <button onClick={onNext} className="px-3 py-2 rounded-xl bg-primary-500 text-neutrals-0">Weiter zu Phase 5</button>
      </div>
    </div>
  );
}

// --- Phase 5 ---------------------------------------------------
function Phase5({ journey, setJourney, onBack }) {
  const profile = journey.profile || {};
  return (
    <div className="space-y-4">
      <section className="bg-neutrals-0 rounded-2xl shadow-elevation2 border border-accent-700 p-4 space-y-3">
        <h2 className="text-lg font-semibold">Phase 5: Hintergrundinformationen</h2>
        <input
          className="w-full h-12 px-4 rounded-2xl border border-accent-700"
          placeholder="Beruflicher Hintergrund"
          value={profile.background || ""}
          onChange={(e) => setJourney((j) => ({ ...j, profile: { ...(j.profile || {}), background: e.target.value } }))}
        />
        <input
          className="w-full h-12 px-4 rounded-2xl border border-accent-700"
          placeholder="Aktuelle Position"
          value={profile.current || ""}
          onChange={(e) => setJourney((j) => ({ ...j, profile: { ...(j.profile || {}), current: e.target.value } }))}
        />
      </section>
      <div className="flex justify-start">
        <button onClick={onBack} className="px-3 py-2 rounded-xl border">Zurück</button>
      </div>
    </div>
  );
}

// --- Main App --------------------------------------------------
export default function CareerNavigator() {
  const { toasts, push } = useToasts();
  const [step, setStep] = useState(0); // 0=Intro, 1..5 phases
  const [saveState, setSaveState] = useState("idle");
  const [journey, setJourney] = useState(() => {
    const key = "careerNavigatorJourneyV2";
    const raw = typeof window !== "undefined" ? localStorage.getItem(key) : null;
    if (raw) {
      try { return JSON.parse(raw); } catch {}
    }
    return { id: uid(), createdAt: new Date().toISOString(), experiences: [], ranking: [], top7Ids: [], stories: {}, profile: {} };
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
          }
        });
    } catch (e) {
      console.error(e);
    }
  }, []);

  const saveDebounced = useMemo(() => debounce((j) => {
    localStorage.setItem("careerNavigatorJourneyV2", JSON.stringify(j));
    setSaveState("saved");
    setTimeout(() => setSaveState("idle"), 800);
  }, 700), []);

  useEffect(() => {
    setSaveState("saving");
    saveDebounced(journey);
  }, [journey]);

  const reset = () => {
    localStorage.removeItem("careerNavigatorJourneyV2");
    setJourney({ id: uid(), createdAt: new Date().toISOString(), experiences: [], ranking: [], top7Ids: [], stories: {}, profile: {} });
    setStep(0);
    push("Zurückgesetzt");
  };

  return (
    <Shell step={step} setStep={setStep} saveState={saveState}>
      {step === 0 && (
        <section className="bg-neutrals-0 rounded-2xl shadow-elevation2 border border-accent-700 p-6">
          <h1 className="text-2xl font-semibold mb-2">Willkommen zum Career Navigator</h1>
          <p className="text-body text-neutrals-600 mb-4">Geführter Prozess in fünf Phasen.</p>
          <ol className="list-decimal pl-5 text-body text-neutrals-700 space-y-1 mb-4">
            <li>Erfahrungen sammeln</li>
            <li>Top‑7 ranken</li>
            <li>Details ergänzen</li>
            <li>AI‑Analyse & Cluster</li>
            <li>Hintergrundinfos</li>
          </ol>
          <div className="flex items-center gap-2">
            <button onClick={() => setStep(1)} className="px-4 py-2 rounded-xl bg-primary-500 text-neutrals-0">Starten</button>
            <button onClick={reset} className="px-4 py-2 rounded-xl border">Zurücksetzen</button>
          </div>
        </section>
      )}
      {step === 1 && <Phase1 journey={journey} setJourney={setJourney} onNext={() => setStep(2)} />}
      {step === 2 && <Phase2 journey={journey} setJourney={setJourney} onNext={() => setStep(3)} onBack={() => setStep(1)} />}
      {step === 3 && <Phase3 journey={journey} setJourney={setJourney} onNext={() => setStep(4)} onBack={() => setStep(2)} />}
      {step === 4 && <Phase4 onNext={() => setStep(5)} onBack={() => setStep(3)} />}
      {step === 5 && <Phase5 journey={journey} setJourney={setJourney} onBack={() => setStep(4)} />}
      <Toasts toasts={toasts} />
    </Shell>
  );
}
