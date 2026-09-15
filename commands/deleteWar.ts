import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
} from "discord.js";
import { getAllRecurringWars } from "../src/db/recurringWars";
import { cancelRecurringWarSchedule } from "../src/scheduler/recurringWarScheduler";
import { WEEKDAY_LABELS } from "../src/utils/date";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("deletewar")
    .setDescription("Supprime une war récurrente de ce salon")
    .addStringOption((option) =>
      option
        .setName("war")
        .setDescription("La war récurrente à supprimer")
        .setRequired(true)
        .setAutocomplete(true),
    ),
  async autocomplete(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused().toLowerCase();

    const wars = await getAllRecurringWars();
    const choices = wars
      .filter((war) => war.channelId === interaction.channelId)
      .map((war) => {
        const publishNote =
          war.publishDaysBefore > 0
            ? `, publiée ${war.publishDaysBefore}j avant`
            : "";
        return {
          name: `${war.title} — ${WEEKDAY_LABELS[war.weekday] ?? war.weekday} à ${war.hours.join(", ")}${publishNote}`,
          value: war.id,
        };
      })
      .filter((choice) => choice.name.toLowerCase().includes(focused))
      .slice(0, 25);

    await interaction.respond(choices);
  },
  async execute(interaction: ChatInputCommandInteraction) {
    const id = interaction.options.getString("war", true);
    const deleted = await cancelRecurringWarSchedule(id);

    await interaction.reply({
      content: deleted
        ? "La war récurrente a été supprimée."
        : "Cette war récurrente n'existe plus (déjà supprimée ?).",
      ephemeral: true,
    });
  },
};
