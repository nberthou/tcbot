import { Client, TextChannel } from "discord.js";
import { WarSlot, postWarAvailabilityBatch } from "../services/warAvailability";

const DEFAULT_HOURS = [19, 20, 21, 22];

const getTodayWarSlots = (): WarSlot[] => {
  const now = new Date();
  const currentDay = Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
  }).format(now);

  const hours = [...DEFAULT_HOURS];
  if (now.getDay() === 0) {
    hours.unshift(18);
  }

  return hours.map((hour) => {
    const date = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hour,
      0,
      0,
    );
    const title =
      currentDay === "dimanche" && hour === 18
        ? "SQ 6v6 du dimanche"
        : `Wars du ${currentDay}`;

    return { title, date };
  });
};

/**
 * Programme la publication quotidienne des disponibilités de war à 9h,
 * dans le salon configuré via GUILD_ROOM_ID.
 */
export const scheduleDailyAvailabilityEmbeds = (client: Client) => {
  const nextRun = new Date();
  nextRun.setHours(4, 0, 0, 0);

  if (nextRun <= new Date()) {
    nextRun.setDate(nextRun.getDate() + 1);
  }

  setTimeout(() => {
    void (async () => {
      try {
        const channel = await client.channels.fetch(
          process.env.GUILD_ROOM_ID ?? "",
        );

        if (channel && channel.isTextBased()) {
          await postWarAvailabilityBatch(
            channel as TextChannel,
            getTodayWarSlots(),
          );
        }
      } catch (error) {
        console.error("Impossible d'envoyer les disponibilités:", error);
      } finally {
        scheduleDailyAvailabilityEmbeds(client);
      }
    })();
  }, nextRun.getTime() - Date.now());
};
