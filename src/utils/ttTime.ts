/**
 * Parse un temps au format "X:XX.XXX" (minutes:secondes.millisecondes,
 * secondes < 60) en millisecondes. Retourne `null` si le format est
 * invalide.
 */
export const parseTimeToMs = (input: string): number | null => {
  const trimmed = input.trim();
  const match = trimmed.match(/^(\d+):(\d{1,2})\.(\d{1,3})$/);
  if (!match) return null;

  const [, minutesPart, secondsPart, millisPart] = match;
  const seconds = parseInt(secondsPart, 10);
  if (seconds >= 60) return null;

  const minutes = parseInt(minutesPart, 10);
  const millis = parseInt(millisPart.padEnd(3, "0"), 10);
  const totalMs = minutes * 60_000 + seconds * 1_000 + millis;
  return totalMs > 0 ? totalMs : null;
};

/**
 * Formate un temps en millisecondes en chaîne "m:ss.mmm".
 */
export const formatMsToTime = (ms: number): string => {
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1_000);
  const millis = ms % 1_000;
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
};
