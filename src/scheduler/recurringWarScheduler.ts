import { Client, TextChannel } from "discord.js";
import {
  deleteRecurringWar,
  getAllRecurringWars,
  insertRecurringWar,
} from "../db/recurringWars";
import { postWarAvailabilityBatch, WarSlot } from "../services/warAvailability";
import {
  addDays,
  getNextWeekdayOccurrence,
  shiftWeekday,
  withTime,
} from "../utils/date";

const POST_HOUR = 9;
const POST_MINUTE = 0;

export interface RecurringWarConfig {
  channel: TextChannel;
  weekday: string;
  hours: string[];
  title: string;
  /** Nombre de jours avant la war où publier les dispos (0 = le jour même). */
  publishDaysBefore?: number;
}

const activeTimers = new Map<string, NodeJS.Timeout>();

/**
 * Republie chaque semaine, `publishDaysBefore` jours avant le jour de la
 * war, les créneaux de war pour ce jour-là. La configuration est persistée
 * en base (sauf si `persist` vaut `false`, utilisé au démarrage pour
 * restaurer les planifications déjà enregistrées sans les dupliquer,
 * auquel cas `id` doit être fourni). Retourne l'id de la war récurrente en
 * base.
 */
export const scheduleRecurringWarAvailability = async (
  config: RecurringWarConfig,
  { persist = true, id }: { persist?: boolean; id?: string } = {},
): Promise<string> => {
  const publishDaysBefore = config.publishDaysBefore ?? 0;

  const warId = persist
    ? await insertRecurringWar({
        channelId: config.channel.id,
        weekday: config.weekday,
        hours: config.hours,
        title: config.title,
        publishDaysBefore,
      })
    : id!;

  const publishWeekday = shiftWeekday(config.weekday, -publishDaysBefore);

  const runAndReschedule = () => {
    const publishRun = getNextWeekdayOccurrence(
      publishWeekday,
      POST_HOUR,
      POST_MINUTE,
    );
    const warDate = addDays(publishRun, publishDaysBefore);

    const timer = setTimeout(() => {
      void (async () => {
        try {
          const slots: WarSlot[] = config.hours.map((hour) => ({
            title: config.title,
            date: withTime(warDate, hour),
          }));
          await postWarAvailabilityBatch(config.channel, slots);
        } catch (error) {
          console.error("Impossible de publier la war récurrente:", error);
        } finally {
          runAndReschedule();
        }
      })();
    }, publishRun.getTime() - Date.now());

    activeTimers.set(warId, timer);
  };

  runAndReschedule();
  return warId;
};

/**
 * Annule la republication hebdomadaire d'une war récurrente et la supprime
 * de la base. Retourne `false` si elle n'existait déjà plus.
 */
export const cancelRecurringWarSchedule = async (
  id: string,
): Promise<boolean> => {
  const timer = activeTimers.get(id);
  if (timer) clearTimeout(timer);
  activeTimers.delete(id);

  return deleteRecurringWar(id);
};

/**
 * Recharge depuis la base toutes les wars récurrentes enregistrées et
 * reprogramme leur publication hebdomadaire. À appeler une fois au démarrage
 * du bot.
 */
export const restoreRecurringWarSchedules = async (client: Client) => {
  for (const record of await getAllRecurringWars()) {
    try {
      const channel = await client.channels.fetch(record.channelId);
      if (!channel || !channel.isTextBased() || channel.isDMBased()) continue;

      await scheduleRecurringWarAvailability(
        {
          channel: channel as TextChannel,
          weekday: record.weekday,
          hours: record.hours,
          title: record.title,
          publishDaysBefore: record.publishDaysBefore,
        },
        { persist: false, id: record.id },
      );
    } catch (error) {
      console.error(
        `Impossible de restaurer la war récurrente #${record.id}:`,
        error,
      );
    }
  }
};
