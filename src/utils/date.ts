const WEEKDAY_INDICES: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const WEEKDAY_NAMES = Object.keys(WEEKDAY_INDICES).sort(
  (a, b) => WEEKDAY_INDICES[a] - WEEKDAY_INDICES[b],
);

export const WEEKDAY_LABELS: Record<string, string> = {
  monday: "lundi",
  tuesday: "mardi",
  wednesday: "mercredi",
  thursday: "jeudi",
  friday: "vendredi",
  saturday: "samedi",
  sunday: "dimanche",
};

/**
 * Retourne la prochaine date (aujourd'hui inclus) correspondant au jour de
 * la semaine donné (ex: "monday").
 */
export const getNextDateForWeekday = (weekday: string, from = new Date()) => {
  const targetIndex = WEEKDAY_INDICES[weekday];
  const diff = (targetIndex - from.getDay() + 7) % 7;
  const result = new Date(from);
  result.setDate(from.getDate() + diff);
  return result;
};

/**
 * Retourne la prochaine occurrence (strictement future) du jour de semaine
 * donné à l'heure précisée. Si ce jour/heure n'est pas encore passé
 * aujourd'hui, retourne aujourd'hui.
 */
export const getNextWeekdayOccurrence = (
  weekday: string,
  hour: number,
  minute = 0,
  from = new Date(),
) => {
  const targetIndex = WEEKDAY_INDICES[weekday];
  const result = new Date(from);
  result.setHours(hour, minute, 0, 0);

  let diff = (targetIndex - from.getDay() + 7) % 7;
  if (diff === 0 && result <= from) diff = 7;
  result.setDate(from.getDate() + diff);
  return result;
};

/**
 * Décale un jour de semaine d'un nombre de jours donné (peut être négatif).
 * Ex: shiftWeekday("friday", -2) => "wednesday".
 */
export const shiftWeekday = (weekday: string, deltaDays: number): string => {
  const index = WEEKDAY_INDICES[weekday];
  const shiftedIndex = (((index + deltaDays) % 7) + 7) % 7;
  return WEEKDAY_NAMES[shiftedIndex];
};

/**
 * Ajoute (ou retranche) un nombre de jours à une date.
 */
export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

/**
 * Combine une date (jour/mois/année) avec un horaire au format "HH:mm".
 */
export const withTime = (date: Date, hourMinute: string) => {
  const [hourString, minuteString] = hourMinute.split(":");
  const result = new Date(date);
  result.setHours(parseInt(hourString, 10));
  result.setMinutes(parseInt(minuteString, 10));
  result.setSeconds(0);
  result.setMilliseconds(0);
  return result;
};
