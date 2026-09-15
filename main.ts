import { Events } from "discord.js";
import dotenv from "dotenv";
dotenv.config();

import { createClient } from "./src/discord/client";
import { loadCommandModules } from "./src/discord/commandLoader";
import { registerInteractionHandler } from "./src/discord/interactionHandler";
import { registerPlayerSyncHandler } from "./src/discord/playerSyncHandler";
import { scheduleDailyAvailabilityEmbeds } from "./src/scheduler/dailyWarScheduler";
import { restoreRecurringWarSchedules } from "./src/scheduler/recurringWarScheduler";
import { syncAllPlayersInGuild } from "./src/services/playerRoster";
import { restoreActiveWarPosts } from "./src/services/warAvailability";

const client = createClient();

for (const [name, command] of loadCommandModules()) {
  client.commands.set(name, command);
}

registerInteractionHandler(client);
registerPlayerSyncHandler(client);

client.once(Events.ClientReady, (readyClient) => {
  console.log("TCBot is ready! Logged in as " + readyClient.user.tag);
  scheduleDailyAvailabilityEmbeds(readyClient);
  void restoreRecurringWarSchedules(readyClient);
  void restoreActiveWarPosts(readyClient);

  for (const guild of readyClient.guilds.cache.values()) {
    void syncAllPlayersInGuild(guild)
      .then((count) =>
        console.log(`${count} joueur(s) synchronisé(s) pour ${guild.name}.`),
      )
      .catch((error) =>
        console.error(
          `Erreur de synchronisation des joueurs pour ${guild.name}:`,
          error,
        ),
      );
  }
});

client.login(process.env.BOT_TOKEN ?? "");
