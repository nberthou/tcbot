import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  EmbedBuilder,
} from "discord.js";
import { MAPS } from "../src/constants/maps";
import { upsertPlayer } from "../src/db/players";
import { recordPersonalBestIfFaster } from "../src/db/ttTimes";
import { resolveRosterForTimeEntry } from "../src/services/playerRoster";
import { formatMsToTime, parseTimeToMs } from "../src/utils/ttTime";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("add_time")
    .setDescription("Enregistre votre temps en Time Trial sur une map")
    .addStringOption((option) =>
      option
        .setName("map")
        .setDescription("La map sur laquelle vous avez fait ce temps")
        .setRequired(true)
        .setAutocomplete(true),
    )
    .addStringOption((option) =>
      option
        .setName("temps")
        .setDescription("Votre temps, au format X:XX.XXX (ex: 1:23.456)")
        .setRequired(true),
    ),
  async autocomplete(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused().toLowerCase();

    const choices = MAPS.filter(
      (map) =>
        map.name.toLowerCase().includes(focused) ||
        map.id.toLowerCase().includes(focused),
    )
      .slice(0, 25)
      .map((map) => ({ name: `${map.name} (${map.id})`, value: map.id }));

    await interaction.respond(choices);
  },
  async execute(interaction: ChatInputCommandInteraction) {
    const mapId = interaction.options.getString("map", true);
    const rawTime = interaction.options.getString("temps", true);

    const map = MAPS.find((m) => m.id === mapId);
    if (!map) {
      await interaction.reply({
        content: "Map inconnue, sélectionnez-en une dans la liste proposée.",
        ephemeral: true,
      });
      return;
    }

    const timeMs = parseTimeToMs(rawTime);
    if (timeMs === null) {
      await interaction.reply({
        content:
          "Format de temps invalide. Utilisez le format X:XX.XXX (ex: 1:23.456).",
        ephemeral: true,
      });
      return;
    }

    if (!interaction.guild) {
      await interaction.reply({
        content: "Cette commande doit être utilisée dans un serveur.",
        ephemeral: true,
      });
      return;
    }

    const member = await interaction.guild.members.fetch(interaction.user.id);
    const roster = resolveRosterForTimeEntry(member);

    const playerId = await upsertPlayer({
      discordId: member.id,
      pseudo: member.displayName,
      roster,
    });

    const { saved, bestMs, previousBestMs } = await recordPersonalBestIfFaster(
      playerId,
      map.id,
      timeMs,
    );

    if (!saved) {
      await interaction.reply({
        content: `Ce n'est pas un nouveau record sur **${map.name}** — votre meilleur temps reste \`${formatMsToTime(bestMs)}\`.`,
        ephemeral: true,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle(`Temps enregistré sur ${map.id}`)
      .setDescription(
        `**${member.displayName}** a enregistré \`${formatMsToTime(timeMs)}\` sur **${map.name} (${map.id})**`,
      );

    if (previousBestMs !== null) {
      embed.addFields({
        name: "Amélioration",
        value: `\`${formatMsToTime(previousBestMs - timeMs)}\` !`,
      });
    }

    await interaction.reply({ embeds: [embed] });
  },
};
