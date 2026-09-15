import { Events } from "discord.js";
import {
  buildFilterButtons,
  buildTimesEmbed,
  decodeCustomId,
} from "../services/ttTimeDisplay";
import { TCBotClient } from "./client";

/**
 * Route les interactions de type "slash command" vers le module de
 * commande correspondant.
 */
export const registerInteractionHandler = (client: TCBotClient) => {
  client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isAutocomplete()) {
      const command = client.commands.get(interaction.commandName);
      try {
        await command?.autocomplete?.(interaction);
      } catch (error) {
        console.error(error);
      }
      return;
    }

    if (interaction.isButton() && interaction.customId.startsWith("dt:")) {
      const decoded = decodeCustomId(interaction.customId);
      if (!decoded || !interaction.guild) return;

      try {
        const embed = await buildTimesEmbed(interaction.guild, {
          map: decoded.map,
          filter: decoded.filter,
        });
        const row = buildFilterButtons(decoded.map, decoded.filter);
        await interaction.update({ embeds: [embed], components: [row] });
      } catch (error) {
        console.error(error);
      }
      return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    }
  });
};
