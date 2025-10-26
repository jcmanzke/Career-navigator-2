import { createClient } from "@/utils/supabase/client";
import { DraggableList } from "../components/DraggableList";
import type { Experience, Journey, JourneySetter, SaveStateSetter } from "../types";
import { cardCls, cls } from "../utils";

interface Phase2Props {
  journey: Journey;
  setJourney: JourneySetter;
  onNext: () => void;
  onBack: () => void;
  setSaveState: SaveStateSetter;
}

export function Phase2({ journey, setJourney, onNext, onBack, setSaveState }: Phase2Props) {
  const experiences = journey.experiences ?? [];
  const rankingList = (journey.ranking && journey.ranking.length === experiences.length
    ? journey.ranking
    : experiences.map((experience) => experience.id))
    .map((id) => experiences.find((experience) => experience.id === id))
    .filter(Boolean) as Experience[];

  const setList = async (list: Experience[]) => {
    setJourney((prev) => ({
      ...prev,
      ranking: list.map((item) => item.id),
      top7Ids: list.slice(0, Math.min(7, list.length)).map((item) => item.id),
    }));
    if (!journey.id) return;
    try {
      setSaveState("saving");
      const supabase = createClient();
      const updates = list.map((experience, index) => ({
        id: experience.id,
        rank: index + 1,
        is_top7: index < 7,
      }));
      if (updates.length > 0) {
        await supabase.from("experiences").upsert(updates);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSaveState("idle");
    }
  };

  const canNext = rankingList.length >= Math.min(7, experiences.length) && experiences.length >= 5;

  return (
    <div className="space-y-4">
      <section className={cls(cardCls, "p-4")}>
        <h2 className="mb-2 text-lg font-semibold">Phase 2: Top‑7 ranken</h2>
        <p className="mb-2 text-body text-neutrals-600">
          Sortiere deine Erfahrungen per Drag & Drop. Die ersten 7 gelten als Top‑7.
        </p>
        <DraggableList
          items={rankingList}
          setItems={setList}
          render={(experience, index) => (
            <div className="flex flex-1 items-center justify-between">
              <div>
                {index + 1}. {experience.title}
              </div>
              <span
                className={cls(
                  "px-2 py-1 text-small rounded-full border",
                  index < 7
                    ? "border-semantic-success-base bg-semantic-success-light text-semantic-success-dark"
                    : "border-accent-700 bg-neutrals-50 text-neutrals-600",
                )}
              >
                {index < 7 ? "Top‑7" : ""}
              </span>
            </div>
          )}
          itemKey={(experience) => experience.id}
        />
      </section>
      <div className="flex justify-between pt-8">
        <button onClick={onBack} className="rounded-xl border px-3 py-2">
          Zurück
        </button>
        <button
          onClick={onNext}
          disabled={!canNext}
          className="rounded-xl bg-[#1D252A] px-3 py-2 text-white hover:bg-primary-500 hover:text-neutrals-900 disabled:opacity-40"
        >
          Weiter zu Phase 3
        </button>
      </div>
    </div>
  );
}
