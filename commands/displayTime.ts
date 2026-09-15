import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  EmbedBuilder,
} from "discord.js";
import { MAPS, getMapName } from "../src/constants/maps";
import { getAllPlayers } from "../src/db/players";
import { getTimesForPlayer } from "../src/db/ttTimes";
import {
  buildFilterButtons,
  buildPlayerTimesEmbed,
  buildTimesEmbed,
} from "../src/services/ttTimeDisplay";
import { getRosterEmoji } from "../src/services/discordEmoji";
import { formatMsToTime } from "../src/utils/ttTime";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("display_time")
    .setDescription("Affiche les temps en Contre La Montre")
    .addStringOption((option) =>
      option
        .setName("map")
        .setDescription("Filtrer sur une map précise")
        .setRequired(false)
        .setAutocomplete(true),
    )
    .addStringOption((option) =>
      option
        .setName("joueur")
        .setDescription("Voir les temps d'un joueur sur toutes ses maps")
        .setRequired(false)
        .setAutocomplete(true),
    ),
  async autocomplete(interaction: AutocompleteInteraction) {
    const focusedOption = interaction.options.getFocused(true);
    const focused = focusedOption.value.toLowerCase();

    if (focusedOption.name === "map") {
      const choices = MAPS.filter(
        (map) =>
          map.name.toLowerCase().includes(focused) ||
          map.id.toLowerCase().includes(focused),
      )
        .slice(0, 25)
        .map((map) => ({ name: `${map.name} (${map.id})`, value: map.id }));

      await interaction.respond(choices);
      return;
    }

    const players = await getAllPlayers();
    const choices = players
      .filter((player) => player.pseudo.toLowerCase().includes(focused))
      .slice(0, 25)
      .map((player) => ({
        name: `${player.pseudo} (${player.roster})`,
        value: player.id,
      }));

    await interaction.respond(choices);
  },
  async execute(interaction: ChatInputCommandInteraction) {
    const playerId = interaction.options.getString("joueur");
    const mapId = interaction.options.getString("map");

    if (!interaction.guild) {
      await interaction.reply({
        content: "Cette commande doit être utilisée dans un serveur.",
        ephemeral: true,
      });
      return;
    }

    if (playerId && mapId) {
      const times = await getTimesForPlayer(playerId);
      const entry = times.find((t) => t.track === mapId);

      if (!entry) {
        await interaction.reply({
          content: "Ce joueur n'a pas enregistré de temps sur cette map.",
          ephemeral: true,
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle(`Temps de ${entry.player.pseudo} — ${getMapName(mapId)}`)
        .setDescription(
          `${getRosterEmoji(interaction.guild, entry.player.roster)} ${formatMsToTime(entry.timeMs)}`,
        );

      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (playerId) {
      const embed = await buildPlayerTimesEmbed(interaction.guild, playerId);

      if (!embed) {
        await interaction.reply({
          content: "Ce joueur n'a enregistré aucun temps.",
          ephemeral: true,
        });
        return;
      }

      await interaction.reply({ embeds: [embed] });
      return;
    }

    const embed = await buildTimesEmbed(interaction.guild, {
      map: mapId,
      filter: "equipe",
    });
    const row = buildFilterButtons(mapId, "equipe");

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};
