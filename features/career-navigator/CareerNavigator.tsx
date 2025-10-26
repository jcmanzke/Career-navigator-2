import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Toasts } from "./components/Toasts";
import { Shell } from "./components/Shell";
import { useToasts } from "./hooks/useToasts";
import { Phase1 } from "./phases/Phase1";
import { Phase2 } from "./phases/Phase2";
import { Phase3 } from "./phases/Phase3";
import { Phase4 } from "./phases/Phase4";
import { Phase5 } from "./phases/Phase5";
import type { Journey, SaveState } from "./types";
import { cardCls, cls } from "./utils";

const createEmptyJourney = (): Journey => ({
  id: null,
  userId: null,
  experiences: [],
  ranking: [],
  top7Ids: [],
  stories: {},
  profile: {},
});

export default function CareerNavigator() {
  const { toasts, push } = useToasts();
  const [step, setStep] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [journey, setJourney] = useState<Journey>(() => createEmptyJourney());

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || !mounted) return;
        let { data: journeyRow } = await supabase
          .from("journeys")
          .select("id")
          .eq("user_id", user.id)
          .single();
        if (!journeyRow) {
          const { data: newJourney } = await supabase
            .from("journeys")
            .insert({ user_id: user.id })
            .select()
            .single();
          journeyRow = newJourney;
        }
        if (!journeyRow) return;
        const journeyId = journeyRow.id as string;
        const { data: experiencesRows } = await supabase
          .from("experiences")
          .select("id,title,rank,is_top7")
          .eq("journey_id", journeyId);
        const experiences =
          experiencesRows?.map((row) => ({
            id: row.id as string,
            title: row.title as string,
            rank: row.rank ?? null,
            is_top7: row.is_top7 ?? null,
          })) ?? [];
        const ranking =
          experiencesRows
            ?.slice()
            .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
            .map((row) => row.id as string) ?? [];
        const top7Ids =
          experiencesRows?.filter((row) => row.is_top7).map((row) => row.id as string) ?? [];
        const { data: storyRows } = await supabase
          .from("stories")
          .select("experience_id,context,impact")
          .eq("journey_id", journeyId);
        const stories =
          storyRows?.reduce<Journey["stories"]>((acc, row) => {
            acc[row.experience_id as string] = {
              context: (row.context as string) || "",
              impact: (row.impact as string) || "",
            };
            return acc;
          }, {}) ?? {};
        const { data: profileRow } = await supabase
          .from("context_profiles")
          .select("notes")
          .eq("journey_id", journeyId)
          .single();
        let profile: Journey["profile"] = {};
        if (profileRow?.notes) {
          try {
            const parsed = JSON.parse(profileRow.notes as string);
            if (parsed && typeof parsed === "object") {
              profile = parsed as Journey["profile"];
            }
          } catch {
            profile = {};
          }
        }
        if (!mounted) return;
        setJourney({
          id: journeyId,
          userId: user.id,
          experiences,
          ranking,
          top7Ids,
          stories,
          profile,
        });
      } catch (error) {
        console.error(error);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const reset = async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setSaveState("saving");
      const { data: newJourney } = await supabase
        .from("journeys")
        .insert({ user_id: user.id })
        .select()
        .single();
      setJourney({
        ...createEmptyJourney(),
        id: newJourney?.id ?? null,
        userId: user.id,
      });
      setStep(0);
      push("Zurückgesetzt");
    } catch (error) {
      console.error(error);
    } finally {
      setSaveState("idle");
    }
  };

  return (
    <Shell step={step} setStep={setStep} saveState={saveState}>
      {step === 0 && (
        <section className={cls(cardCls, "p-6")}>
          <h1 className="mb-2 text-2xl font-semibold">Willkommen zum Career Navigator</h1>
          <p className="mb-4 text-body text-neutrals-600">Geführter Prozess in fünf Phasen.</p>
          <ol className="mb-4 list-decimal space-y-1 pl-5 text-body text-neutrals-700">
            <li>Erfahrungen sammeln</li>
            <li>Top‑7 ranken</li>
            <li>Details ergänzen</li>
            <li>AI‑Analyse & Cluster</li>
            <li>Hintergrundinfos</li>
          </ol>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStep(1)}
              className="rounded-xl bg-[#1D252A] px-4 py-2 text-white hover:bg-primary-500 hover:text-neutrals-900"
            >
              Starten
            </button>
            <button onClick={reset} className="rounded-xl border px-4 py-2">
              Zurücksetzen
            </button>
          </div>
        </section>
      )}
      {step === 1 && (
        <Phase1
          journey={journey}
          setJourney={setJourney}
          onNext={() => setStep(2)}
          setSaveState={setSaveState}
        />
      )}
      {step === 2 && (
        <Phase2
          journey={journey}
          setJourney={setJourney}
          onNext={() => setStep(3)}
          onBack={() => setStep(1)}
          setSaveState={setSaveState}
        />
      )}
      {step === 3 && (
        <Phase3
          journey={journey}
          setJourney={setJourney}
          onNext={() => setStep(4)}
          onBack={() => setStep(2)}
          setSaveState={setSaveState}
        />
      )}
      {step === 4 && (
        <Phase4 journey={journey} onNext={() => setStep(5)} onBack={() => setStep(3)} />
      )}
      {step === 5 && (
        <Phase5
          journey={journey}
          setJourney={setJourney}
          onBack={() => setStep(4)}
          setSaveState={setSaveState}
        />
      )}
      <Toasts toasts={toasts} />
    </Shell>
  );
}
