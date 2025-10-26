import { useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import type { Journey, JourneySetter, SaveStateSetter } from "../types";
import { cardCls, cls, debounce } from "../utils";

interface Phase5Props {
  journey: Journey;
  setJourney: JourneySetter;
  onBack: () => void;
  setSaveState: SaveStateSetter;
}

export function Phase5({ journey, setJourney, onBack, setSaveState }: Phase5Props) {
  const profile = journey.profile ?? {};

  const saveProfile = useMemo(
    () =>
      debounce(async (payload: Record<string, string>) => {
        if (!journey.id) return;
        try {
          setSaveState("saving");
          const supabase = createClient();
          await supabase
            .from("context_profiles")
            .upsert(
              { journey_id: journey.id, notes: JSON.stringify(payload) },
              { onConflict: "journey_id" },
            );
        } catch (error) {
          console.error(error);
        } finally {
          setSaveState("idle");
        }
      }, 600),
    [journey.id, setSaveState],
  );

  const updateField = (field: string, value: string) => {
    setJourney((prev) => {
      const nextProfile = { ...(prev.profile ?? {}), [field]: value };
      saveProfile(nextProfile);
      return { ...prev, profile: nextProfile };
    });
  };

  return (
    <div className="space-y-4">
      <section className={cls(cardCls, "p-4 space-y-3")}>
        <h2 className="text-lg font-semibold">Phase 5: Hintergrundinformationen</h2>
        <input
          className="h-12 w-full rounded-2xl border border-accent-700 px-4"
          placeholder="Beruflicher Hintergrund"
          value={profile.background ?? ""}
          onChange={(event) => updateField("background", event.target.value)}
        />
        <input
          className="h-12 w-full rounded-2xl border border-accent-700 px-4"
          placeholder="Aktuelle Position"
          value={profile.current ?? ""}
          onChange={(event) => updateField("current", event.target.value)}
        />
      </section>
      <div className="flex justify-start pt-8">
        <button onClick={onBack} className="rounded-xl border px-3 py-2">
          Zurück
        </button>
      </div>
    </div>
  );
}
