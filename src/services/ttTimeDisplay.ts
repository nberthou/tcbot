import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Guild,
} from "discord.js";
import { TtTimeWithPlayer, getAllTimes, getTimesForTrack } from "../db/ttTimes";
import { CUP_ORDER, MAPS, RETRO_CUP, getMapName } from "../constants/maps";
import { getRosterEmoji } from "./discordEmoji";
import { formatMsToTime } from "../utils/ttTime";

export type RosterFilter = "all" | "equipe" | "perle" | "diamant" | "autres";

const FILTER_LABELS: Record<RosterFilter, string> = {
  all: "Tous",
  equipe: "Equipe",
  perle: "Perle",
  diamant: "Diamant",
  autres: "Autres",
};

const NO_MAP = "_all";

const matchesFilter = (roster: string, filter: RosterFilter): boolean => {
  switch (filter) {
    case "all":
      return true;
    case "equipe":
      return roster === "perle" || roster === "diamant";
    case "autres":
      return roster !== "perle" && roster !== "diamant";
    default:
      return roster === filter;
  }
};

const formatEntry = (guild: Guild, rank: number, entry: TtTimeWithPlayer) =>
  `${rank}. ${entry.player.roster !== "autres" ? getRosterEmoji(guild, entry.player.roster) : ""} ${entry.player.pseudo} — ${formatMsToTime(entry.timeMs)}`;

const formatEntryList = (guild: Guild, entries: TtTimeWithPlayer[]) =>
  entries
    .map((entry, index) => formatEntry(guild, index + 1, entry))
    .join("\n");

/**
 * Construit l'embed listant les temps, pour une map précise ou toutes les
 * maps (groupées par map), filtrés par roster.
 */
export const buildTimesEmbed = async (
  guild: Guild,
  { map, filter }: { map: string | null; filter: RosterFilter },
): Promise<EmbedBuilder> => {
  const embed = new EmbedBuilder()
    .setColor(0x00ff00)
    .setTitle(
      map ? `Temps — ${getMapName(map)}` : "Meilleurs temps — toutes les maps",
    )
    .setFooter({ text: `Filtre : ${FILTER_LABELS[filter]}` });

  if (map) {
    const times = (await getTimesForTrack(map)).filter((entry) =>
      matchesFilter(entry.player.roster, filter),
    );

    embed.setDescription(
      times.length
        ? formatEntryList(guild, times)
        : "Aucun temps enregistré pour cette map.",
    );
    return embed;
  }

  const allTimes = (await getAllTimes()).filter((entry) =>
    matchesFilter(entry.player.roster, filter),
  );

  if (!allTimes.length) {
    embed.setDescription("Aucun temps enregistré.");
    return embed;
  }

  const leaderByTrack = new Map<string, TtTimeWithPlayer>();
  for (const entry of allTimes) {
    if (!leaderByTrack.has(entry.track)) leaderByTrack.set(entry.track, entry);
  }

  const sections = [...CUP_ORDER, RETRO_CUP]
    .map((cup) => {
      const lines = MAPS.filter((m) => m.cup === cup)
        .map((m) => leaderByTrack.get(m.id))
        .filter((entry): entry is TtTimeWithPlayer => Boolean(entry))
        .map(
          (entry) =>
            `**${entry.track}:** ${getRosterEmoji(guild, entry.player.roster)} ${entry.player.pseudo} - \`${formatMsToTime(entry.timeMs)}\``,
        );

      return lines.length ? `**__${cup}__**\n${lines.join("\n")}` : null;
    })
    .filter((section): section is string => section !== null);

  embed.setDescription(sections.join("\n\n"));
  return embed;
};

const encodeCustomId = (filter: RosterFilter, map: string | null) =>
  `dt:${filter}:${map ?? NO_MAP}`;

export const decodeCustomId = (
  customId: string,
): { filter: RosterFilter; map: string | null } | null => {
  const parts = customId.split(":");
  if (parts.length !== 3 || parts[0] !== "dt") return null;

  const [, filter, map] = parts;
  return {
    filter: filter as RosterFilter,
    map: map === NO_MAP ? null : map,
  };
};

export const buildFilterButtons = (
  map: string | null,
  activeFilter: RosterFilter,
): ActionRowBuilder<ButtonBuilder> => {
  const filters: RosterFilter[] = [
    "all",
    "equipe",
    "perle",
    "diamant",
    "autres",
  ];

  const row = new ActionRowBuilder<ButtonBuilder>();
  for (const filter of filters) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(encodeCustomId(filter, map))
        .setLabel(FILTER_LABELS[filter])
        .setStyle(
          filter === activeFilter ? ButtonStyle.Primary : ButtonStyle.Secondary,
        ),
    );
  }
  return row;
};

/**
 * Construit l'embed des temps d'un joueur, groupés par coupe, avec son
 * rang et le nombre total de participants sur chaque map, ainsi que son
 * classement moyen. Retourne `null` si le joueur n'a aucun temps.
 */
export const buildPlayerTimesEmbed = async (
  guild: Guild,
  playerId: string,
): Promise<EmbedBuilder | null> => {
  const allTimes = await getAllTimes();

  const byTrack = new Map<string, TtTimeWithPlayer[]>();
  for (const entry of allTimes) {
    const list = byTrack.get(entry.track) ?? [];
    list.push(entry);
    byTrack.set(entry.track, list);
  }

  const playerTimesByTrack = new Map(
    allTimes
      .filter((entry) => entry.player.id === playerId)
      .map((entry) => [entry.track, entry]),
  );

  if (!playerTimesByTrack.size) return null;

  const player = [...playerTimesByTrack.values()][0].player;
  const ranks: number[] = [];

  const sections = [...CUP_ORDER, RETRO_CUP]
    .map((cup) => {
      const lines = MAPS.filter((m) => m.cup === cup)
        .map((m) => playerTimesByTrack.get(m.id))
        .filter((entry): entry is TtTimeWithPlayer => Boolean(entry))
        .map((entry) => {
          const trackTimes = byTrack.get(entry.track) ?? [];
          const rank =
            trackTimes.findIndex((t) => t.player.id === playerId) + 1;
          ranks.push(rank);
          return `**${entry.track}:** \`${formatMsToTime(entry.timeMs)} - ${rank}/${trackTimes.length}\``;
        });

      return lines.length ? `**__${cup}__**\n${lines.join("\n")}` : null;
    })
    .filter((section): section is string => section !== null);

  const averageRanking = ranks.reduce((sum, r) => sum + r, 0) / ranks.length;

  const embed = new EmbedBuilder()
    .setColor(0x00ff00)
    .setTitle(`Temps de ${player.pseudo}`)
    .setDescription(
      `**${getRosterEmoji(guild, player.roster)} Roster ${player.roster}**\n\n${sections.join("\n\n")}\n\n**Classement moyen : ${averageRanking.toFixed(1)}**`,
    );

  return embed;
};
