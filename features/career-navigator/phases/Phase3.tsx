import { useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { VoiceTextarea } from "../components/VoiceTextarea";
import type { Journey, JourneySetter, SaveStateSetter } from "../types";
import { cardCls, cls, debounce } from "../utils";

interface Phase3Props {
  journey: Journey;
  setJourney: JourneySetter;
  onNext: () => void;
  onBack: () => void;
  setSaveState: SaveStateSetter;
}

export function Phase3({ journey, setJourney, onNext, onBack, setSaveState }: Phase3Props) {
  const topIds =
    journey.top7Ids && journey.top7Ids.length > 0
      ? journey.top7Ids
      : (journey.ranking ?? []).slice(0, 7);
  const experiences = journey.experiences ?? [];
  const top = topIds
    .map((id) => experiences.find((experience) => experience.id === id))
    .filter(Boolean);
  const stories = journey.stories ?? {};

  const saveStory = useMemo(
    () =>
      debounce(async (id: string, data: { context?: string; impact?: string }) => {
        if (!journey.id) return;
        try {
          setSaveState("saving");
          const supabase = createClient();
          await supabase
            .from("stories")
            .upsert(
              {
                journey_id: journey.id,
                experience_id: id,
                context: data.context ?? "",
                impact: data.impact ?? "",
              },
              { onConflict: "journey_id,experience_id" },
            );
        } catch (error) {
          console.error(error);
        } finally {
          setSaveState("idle");
        }
      }, 600),
    [journey.id, setSaveState],
  );

  const update = (id: string, field: "context" | "impact", value: string) => {
    setJourney((prev) => {
      const nextStory = { ...(prev.stories?.[id] ?? {}), [field]: value };
      const nextStories = { ...(prev.stories ?? {}), [id]: nextStory };
      saveStory(id, nextStory);
      return { ...prev, stories: nextStories };
    });
  };

  const canNext = top.length > 0;

  const handleNext = async () => {
    if (!journey.id) {
      onNext();
      return;
    }
    try {
      setSaveState("saving");
      const supabase = createClient();
      const rows = top.map((experience) => ({
        journey_id: journey.id,
        experience_id: experience!.id,
        context: stories[experience!.id]?.context ?? "",
        impact: stories[experience!.id]?.impact ?? "",
      }));
      if (rows.length > 0) {
        const { error } = await supabase
          .from("stories")
          .upsert(rows, { onConflict: "journey_id,experience_id" });
        if (error) throw error;
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSaveState("idle");
    }
    onNext();
  };

  return (
    <div className="space-y-4">
      <section className={cls(cardCls, "p-4")}>
        <h2 className="mb-2 text-lg font-semibold">Phase 3: Details zu Top‑7</h2>
        <div className="space-y-4">
          {top.map((experience, index) => {
            if (!experience) return null;
            return (
              <div key={experience.id} className="rounded-2xl border border-accent-700 p-3">
                <div className="mb-2 font-medium">
                  {index + 1}. {experience.title}
                </div>
                <VoiceTextarea
                  placeholder="Kontext"
                  value={stories[experience.id]?.context ?? ""}
                  onChange={(value) => update(experience.id, "context", value)}
                />
                <VoiceTextarea
                  placeholder="Impact"
                  value={stories[experience.id]?.impact ?? ""}
                  onChange={(value) => update(experience.id, "impact", value)}
                />
              </div>
            );
          })}
        </div>
      </section>
      <div className="flex justify-between pt-8">
        <button onClick={onBack} className="rounded-xl border px-3 py-2">
          Zurück
        </button>
        <button
          onClick={handleNext}
          disabled={!canNext}
          className="rounded-xl bg-[#1D252A] px-3 py-2 text-white hover:bg-primary-500 hover:text-neutrals-900 disabled:opacity-40"
        >
          Weiter zu Phase 4
        </button>
      </div>
    </div>
  );
}
