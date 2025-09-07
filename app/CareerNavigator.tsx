"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseClient } from "../lib/supabaseClient";

// --- Minimal helpers -------------------------------------------------------
const uid = () => Math.random().toString(36).slice(2, 10);
const cls = (...xs) => xs.filter(Boolean).join(" ");
const cardCls =
  "rounded-3xl border border-neutrals-200/50 bg-neutrals-0/60 backdrop-blur-md shadow-elevation2";
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
  const m = map[state] || map.idle;
  return (
    <div className={cls("flex items-center gap-2 text-small", m.textCls)}>
      <span className={cls("inline-block h-2.5 w-2.5 rounded-full", m.dot)} />
      <span>{m.text}</span>
    </div>
  );
}

// --- Progress Steps (5 steps) ----------------------------------------------
function ProgressSteps({ current, onSelect }) {
  const steps = Array.from({ length: 5 }, (_, i) => i + 1);
  const pct = Math.round(((current - 1) / 5) * 100);
  return (
    <div className="w-full">
      <div className="flex items-center justify-center gap-3 mb-2">
        {steps.map((n) => (
          <div key={n} className="flex items-center">
            <button
              type="button"
              onClick={() => onSelect?.(n)}
              className={cls(
                "h-8 w-8 rounded-full flex items-center justify-center text-small font-medium focus:outline-none",
                n < current
                  ? "bg-semantic-success-base text-neutrals-0"
                  : n === current
                  ? "bg-primary-500 text-neutrals-0"
                  : "bg-neutrals-200 text-neutrals-600",
              )}
              title={`Schritt ${n}`}
            >
              {n}
            </button>
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
    <div className="min-h-screen text-neutrals-900">
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
        <ProgressSteps current={Math.max(1, step || 1)} onSelect={setStep} />
        {children}
      </main>
    </div>
  );
}

// --- Phase 1 ---------------------------------------------------
function Phase1({ journey, setJourney, onNext, setSaveState }) {
  const exps = journey.experiences || [];
  const [title, setTitle] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const add = async () => {
    if (!title.trim()) return;
    if (exps.length >= 15) return;
    if (!journey.id) return;
    try {
      setSaveState('saving');
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('experiences')
        .insert({ journey_id: journey.id, title: title.trim() })
        .select()
        .single();
      if (error) throw error;
      const e = { id: data.id, title: data.title };
      setJourney((j) => ({
        ...j,
        experiences: [...(j.experiences || []), e],
        ranking: [...(j.ranking || []), e.id],
      }));
      setTitle("");
      setSaveState('idle');
    } catch (e) {
      console.error(e);
      setSaveState('idle');
    }
  };
  const remove = async (id) => {
    try {
      setSaveState('saving');
      const supabase = getSupabaseClient();
      await supabase.from('experiences').delete().eq('id', id);
      setJourney((j) => ({
        ...j,
        experiences: j.experiences.filter((e) => e.id !== id),
        ranking: (j.ranking || []).filter((r) => r !== id),
        top7Ids: (j.top7Ids || []).filter((r) => r !== id),
        stories: Object.fromEntries(Object.entries(j.stories || {}).filter(([k]) => k !== id)),
      }));
      setSaveState('idle');
    } catch (e) {
      console.error(e);
      setSaveState('idle');
    }
  };

  const startEdit = (e) => {
    setEditingId(e.id);
    setEditingText(e.title);
  };

  const saveEdit = async () => {
    if (!editingText.trim()) return;
    try {
      setSaveState('saving');
      const supabase = getSupabaseClient();
      await supabase.from('experiences').update({ title: editingText.trim() }).eq('id', editingId);
      setJourney((j) => ({
        ...j,
        experiences: j.experiences.map((ex) =>
          ex.id === editingId ? { ...ex, title: editingText.trim() } : ex
        ),
      }));
      setEditingId(null);
      setEditingText("");
      setSaveState('idle');
    } catch (e) {
      console.error(e);
      setSaveState('idle');
    }
  };
  const canNext = exps.length >= 5;
  return (
    <div className="space-y-4">
      <section className={cls(cardCls, "p-4")}>
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
              {editingId === e.id ? (
                <>
                  <span className="mr-2">{i + 1}.</span>
                  <input
                    className="flex-1 h-10 px-2 rounded-xl border border-accent-700"
                    value={editingText}
                    onChange={(ev) => setEditingText(ev.target.value)}
                  />
                  <button
                    onClick={saveEdit}
                    className="ml-2 px-2 py-1 rounded-xl bg-primary-500 text-neutrals-0"
                  >
                    Speichern
                  </button>
                </>
              ) : (
                <>
                  <span>{i + 1}. {e.title}</span>
                  <div className="flex items-center gap-2">
                    <button className="text-neutrals-500" onClick={() => startEdit(e)}>✎</button>
                    <button className="text-neutrals-500" onClick={() => remove(e.id)}>✕</button>
                  </div>
                </>
              )}
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
function Phase2({ journey, setJourney, onNext, onBack, setSaveState }) {
  const exps = journey.experiences || [];
  const rankingList = (journey.ranking && journey.ranking.length === exps.length
    ? journey.ranking
    : exps.map((e) => e.id))
    .map((id) => exps.find((e) => e.id === id))
    .filter(Boolean);
  const setList = async (list) => {
    setJourney((j) => ({
      ...j,
      ranking: list.map((x) => x.id),
      top7Ids: list.slice(0, Math.min(7, list.length)).map((x) => x.id),
    }));
    if (!journey.id) return;
    try {
      setSaveState('saving');
      const supabase = getSupabaseClient();
      const updates = list.map((e, idx) => ({ id: e.id, rank: idx + 1, is_top7: idx < 7 }));
      if (updates.length > 0) {
        await supabase.from('experiences').upsert(updates);
      }
      setSaveState('idle');
    } catch (e) {
      console.error(e);
      setSaveState('idle');
    }
  };
  const canNext = rankingList.length >= Math.min(7, exps.length) && exps.length >= 5;
  return (
    <div className="space-y-4">
      <section className={cls(cardCls, "p-4")}>
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
function Phase3({ journey, setJourney, onNext, onBack, setSaveState }) {
  const top = (journey.top7Ids || [])
    .map((id) => (journey.experiences || []).find((e) => e.id === id))
    .filter(Boolean);
  const stories = journey.stories || {};
  const saveStory = useMemo(() => debounce(async (id, data) => {
    if (!journey.id) return;
    try {
      setSaveState('saving');
      const supabase = getSupabaseClient();
      await supabase.from('stories').upsert({ journey_id: journey.id, experience_id: id, context: data.context || '', impact: data.impact || '' }, { onConflict: 'journey_id,experience_id' });
      setSaveState('idle');
    } catch (e) {
      console.error(e);
      setSaveState('idle');
    }
  }, 600), [journey.id]);
  const update = (id, field, value) =>
    setJourney((j) => {
      const next = { ...(j.stories || {}), [id]: { ...(j.stories?.[id] || {}), [field]: value } };
      saveStory(id, next[id]);
      return { ...j, stories: next };
    });
  const canNext = top.length > 0;

  const handleNext = async () => {
    if (!journey.id) return onNext();
    try {
      setSaveState('saving');
      const supabase = getSupabaseClient();
      const rows = top.map((e) => ({
        journey_id: journey.id,
        experience_id: e.id,
        context: stories[e.id]?.context || '',
        impact: stories[e.id]?.impact || '',
      }));
      if (rows.length > 0) {
        const { error } = await supabase
          .from('stories')
          .upsert(rows, { onConflict: 'journey_id,experience_id' });
        if (error) throw error;
      }
      setSaveState('idle');
    } catch (e) {
      console.error(e);
      setSaveState('idle');
    }
    onNext();
  };
  return (
    <div className="space-y-4">
      <section className={cls(cardCls, "p-4")}>
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
        <button onClick={handleNext} disabled={!canNext} className="px-3 py-2 rounded-xl bg-primary-500 text-neutrals-0 disabled:opacity-40">Weiter zu Phase 4</button>
      </div>
    </div>
  );
}

// --- Phase 4 ---------------------------------------------------
function Phase4({ onNext, onBack }) {
  return (
    <div className="space-y-4">
      <section className={cls(cardCls, "p-4")}>
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
function Phase5({ journey, setJourney, onBack, setSaveState }) {
  const profile = journey.profile || {};
  const saveProfile = useMemo(() => debounce(async (p) => {
    if (!journey.id) return;
    try {
      setSaveState('saving');
      const supabase = getSupabaseClient();
      await supabase.from('context_profiles').upsert({ journey_id: journey.id, notes: JSON.stringify(p) }, { onConflict: 'journey_id' });
      setSaveState('idle');
    } catch (e) {
      console.error(e);
      setSaveState('idle');
    }
  },600), [journey.id]);
  const updateField = (field, value) =>
    setJourney((j) => {
      const p = { ...(j.profile || {}), [field]: value };
      saveProfile(p);
      return { ...j, profile: p };
    });
  return (
    <div className="space-y-4">
      <section className={cls(cardCls, "p-4 space-y-3")}>
        <h2 className="text-lg font-semibold">Phase 5: Hintergrundinformationen</h2>
        <input
          className="w-full h-12 px-4 rounded-2xl border border-accent-700"
          placeholder="Beruflicher Hintergrund"
          value={profile.background || ""}
          onChange={(e) => updateField('background', e.target.value)}
        />
        <input
          className="w-full h-12 px-4 rounded-2xl border border-accent-700"
          placeholder="Aktuelle Position"
          value={profile.current || ""}
          onChange={(e) => updateField('current', e.target.value)}
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
  const [journey, setJourney] = useState({ id: null, experiences: [], ranking: [], top7Ids: [], stories: {}, profile: {} });

  useEffect(() => {
    async function load() {
      try {
        const supabase = getSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        let { data: jRow } = await supabase.from('journeys').select('id').eq('user_id', user.id).single();
        if (!jRow) {
          const { data: newJ } = await supabase.from('journeys').insert({ user_id: user.id }).select().single();
          jRow = newJ;
        }
        const journeyId = jRow.id;
        const { data: exps } = await supabase.from('experiences').select('id,title,rank,is_top7').eq('journey_id', journeyId);
        const experiences = (exps || []).map(e => ({ id: e.id, title: e.title }));
        const ranking = (exps || []).sort((a,b)=> (a.rank||0)-(b.rank||0)).map(e=>e.id);
        const top7Ids = (exps || []).filter(e=>e.is_top7).map(e=>e.id);
        const { data: storyRows } = await supabase.from('stories').select('experience_id,context,impact').eq('journey_id', journeyId);
        const stories = Object.fromEntries((storyRows || []).map(r => [r.experience_id, { context: r.context || '', impact: r.impact || '' }]));
        const { data: profileRow } = await supabase.from('context_profiles').select('notes').eq('journey_id', journeyId).single();
        let profile = {};
        if (profileRow?.notes) { try { profile = JSON.parse(profileRow.notes); } catch {} }
        setJourney({ id: journeyId, experiences, ranking, top7Ids, stories, profile });
      } catch (e) {
        console.error(e);
      }
    }
    load();
  }, []);

  const reset = async () => {
    try {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setSaveState('saving');
      const { data: newJ } = await supabase.from('journeys').insert({ user_id: user.id }).select().single();
      setJourney({ id: newJ.id, experiences: [], ranking: [], top7Ids: [], stories: {}, profile: {} });
      setStep(0);
      push("Zurückgesetzt");
      setSaveState('idle');
    } catch (e) {
      console.error(e);
      setSaveState('idle');
    }
  };

  return (
    <Shell step={step} setStep={setStep} saveState={saveState}>
      {step === 0 && (
        <section className={cls(cardCls, "p-6")}>
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
      {step === 1 && <Phase1 journey={journey} setJourney={setJourney} onNext={() => setStep(2)} setSaveState={setSaveState} />}
      {step === 2 && <Phase2 journey={journey} setJourney={setJourney} onNext={() => setStep(3)} onBack={() => setStep(1)} setSaveState={setSaveState} />}
      {step === 3 && <Phase3 journey={journey} setJourney={setJourney} onNext={() => setStep(4)} onBack={() => setStep(2)} setSaveState={setSaveState} />}
      {step === 4 && <Phase4 onNext={() => setStep(5)} onBack={() => setStep(3)} />}
      {step === 5 && <Phase5 journey={journey} setJourney={setJourney} onBack={() => setStep(4)} setSaveState={setSaveState} />}
      <Toasts toasts={toasts} />
    </Shell>
  );
}
