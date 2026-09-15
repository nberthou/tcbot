export type Availability = "can" | "maybe" | "sub" | "can't";

export const AVAILABILITY_BY_EMOJI: Record<string, Availability> = {
  "✅": "can",
  "❓": "maybe",
  "❕": "sub",
  "❌": "can't",
};

export const AVAILABILITY_EMOJIS = Object.keys(AVAILABILITY_BY_EMOJI);

export const AVAILABILITY_LABELS: Record<Availability, string> = {
  can: "Participants",
  maybe: "Maybe",
  sub: "Subs",
  "can't": "Can't",
};

export const EMPTY_FIELD_VALUE = "Aucun";
