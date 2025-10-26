import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import type { Journey, JourneySetter, SaveStateSetter } from "../types";
import { cardCls, cls } from "../utils";

interface Phase1Props {
  journey: Journey;
  setJourney: JourneySetter;
  onNext: () => void;
  setSaveState: SaveStateSetter;
}

export function Phase1({ journey, setJourney, onNext, setSaveState }: Phase1Props) {
  const experiences = journey.experiences ?? [];
  const [title, setTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  const add = async () => {
    if (!title.trim() || experiences.length >= 15 || !journey.id) return;
    try {
      setSaveState("saving");
      const supabase = createClient();
      const { data, error } = await supabase
        .from("experiences")
        .insert({ journey_id: journey.id, title: title.trim() })
        .select()
        .single();
      if (error) throw error;
      const experience = { id: data.id as string, title: data.title as string };
      setJourney((prev) => ({
        ...prev,
        experiences: [...(prev.experiences ?? []), experience],
        ranking: [...(prev.ranking ?? []), experience.id],
      }));
      setTitle("");
    } catch (error) {
      console.error(error);
    } finally {
      setSaveState("idle");
    }
  };

  const remove = async (id: string) => {
    try {
      setSaveState("saving");
      const supabase = createClient();
      await supabase.from("experiences").delete().eq("id", id);
      setJourney((prev) => ({
        ...prev,
        experiences: prev.experiences.filter((exp) => exp.id !== id),
        ranking: (prev.ranking ?? []).filter((rankId) => rankId !== id),
        top7Ids: (prev.top7Ids ?? []).filter((rankId) => rankId !== id),
        stories: Object.fromEntries(
          Object.entries(prev.stories ?? {}).filter(([key]) => key !== id),
        ),
      }));
    } catch (error) {
      console.error(error);
    } finally {
      setSaveState("idle");
    }
  };

  const startEdit = (experience: { id: string; title: string }) => {
    setEditingId(experience.id);
    setEditingText(experience.title);
  };

  const saveEdit = async () => {
    if (!editingId || !editingText.trim()) return;
    try {
      setSaveState("saving");
      const supabase = createClient();
      await supabase.from("experiences").update({ title: editingText.trim() }).eq("id", editingId);
      setJourney((prev) => ({
        ...prev,
        experiences: prev.experiences.map((experience) =>
          experience.id === editingId ? { ...experience, title: editingText.trim() } : experience,
        ),
      }));
      setEditingId(null);
      setEditingText("");
    } catch (error) {
      console.error(error);
    } finally {
      setSaveState("idle");
    }
  };

  const canNext = experiences.length >= 5;

  return (
    <div className="space-y-4">
      <section className={cls(cardCls, "p-4")}>
        <h2 className="mb-2 text-lg font-semibold">Phase 1: Erinnerungen sammeln</h2>
        <p className="mb-3 text-body text-neutrals-600">
          Füge bis zu 15 Erfahrungen hinzu (mindestens 5, um fortzufahren).
        </p>
        <div className="mb-3 flex gap-2">
          <input
            className="flex-1 h-12 rounded-2xl border border-accent-700 px-4"
            placeholder="Titel der Erfahrung"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <button
            onClick={add}
            className="rounded-xl bg-primary-500 px-3 py-2 text-neutrals-0 hover:bg-primary-600"
          >
            Hinzufügen
          </button>
        </div>
        <ul className="space-y-2">
          {experiences.map((experience, index) => (
            <li
              key={experience.id}
              className="flex items-center justify-between rounded-xl border border-accent-700 p-3"
            >
              {editingId === experience.id ? (
                <>
                  <span className="mr-2">{index + 1}.</span>
                  <input
                    className="flex-1 h-10 rounded-xl border border-accent-700 px-2"
                    value={editingText}
                    onChange={(event) => setEditingText(event.target.value)}
                  />
                  <button
                    onClick={saveEdit}
                    className="ml-2 rounded-xl bg-primary-500 px-2 py-1 text-neutrals-0"
                  >
                    Speichern
                  </button>
                </>
              ) : (
                <>
                  <span>
                    {index + 1}. {experience.title}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      className="text-neutrals-500"
                      onClick={() => startEdit(experience)}
                      type="button"
                    >
                      ✎
                    </button>
                    <button
                      className="text-neutrals-500"
                      onClick={() => remove(experience.id)}
                      type="button"
                    >
                      ✕
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
        <div className="mt-2 text-small text-neutrals-500">{experiences.length}/15</div>
      </section>
      <div className="flex justify-end pt-8">
        <button
          onClick={onNext}
          disabled={!canNext}
          className="rounded-xl bg-[#1D252A] px-3 py-2 text-white hover:bg-primary-500 hover:text-neutrals-900 disabled:opacity-40"
        >
          Weiter zu Phase 2
        </button>
      </div>
    </div>
  );
}
