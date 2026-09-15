import { Guild } from "discord.js";

/**
 * Retourne l'emote custom du serveur portant ce nom, ou le nom brut si
 * l'emote n'existe pas (repli affiché tel quel).
 */
export const getEmoji = (guild: Guild, name: string) => {
  const emoji = guild.emojis.cache.find((e) => e.name === name);
  return emoji ? emoji.toString() : name;
};

/**
 * Emote correspondant à un roster (perle/diamant/mixte/autres...), suivant
 * la convention de nommage `tc_<roster>` des emotes custom du serveur.
 */
export const getRosterEmoji = (guild: Guild, roster: string) =>
  getEmoji(guild, `tc_${roster === "autres" ? "autres" : roster}`);
