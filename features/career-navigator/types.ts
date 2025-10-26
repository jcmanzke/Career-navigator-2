import type { Dispatch, SetStateAction } from "react";

export type SaveState = "idle" | "saving";

export interface Toast {
  id: string;
  text: string;
}

export interface Experience {
  id: string;
  title: string;
  rank?: number | null;
  is_top7?: boolean | null;
}

export interface StoryDetails {
  context: string;
  impact: string;
}

export type StoryMap = Record<string, StoryDetails>;

export type JourneyProfile = Record<string, string>;

export interface Journey {
  id: string | null;
  userId: string | null;
  experiences: Experience[];
  ranking: string[];
  top7Ids: string[];
  stories: StoryMap;
  profile: JourneyProfile;
}

export type JourneySetter = Dispatch<SetStateAction<Journey>>;
export type SaveStateSetter = Dispatch<SetStateAction<SaveState>>;
