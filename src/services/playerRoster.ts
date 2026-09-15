import { Guild, GuildMember } from "discord.js";
import { upsertPlayer } from "../db/players";

const VALID_ROSTERS = ["perle", "diamant"];

/**
 * Détermine le roster (perle/diamant) d'un membre à partir de son rôle
 * "Roster <Nom>". Retourne `null` si le membre n'a pas de rôle de roster
 * valide (les membres hors roster ne sont pas enregistrés).
 */
export const extractRosterFromMember = (member: GuildMember): string | null => {
  const rosterRole = member.roles.cache.find(
    (role) => role.name.startsWith("Roster") || role.name.startsWith("Test"),
  );
  if (!rosterRole) return null;

  const roster = rosterRole.name.split(" ")[1]?.toLowerCase();
  return roster && VALID_ROSTERS.includes(roster) ? roster : null;
};

/**
 * Enregistre ou met à jour un membre en tant que joueur si son rôle de
 * roster actuel est valide. Retourne `true` si le membre a été synchronisé.
 */
export const syncPlayerFromMember = async (
  member: GuildMember,
): Promise<boolean> => {
  const roster = extractRosterFromMember(member);
  if (!roster) return false;

  await upsertPlayer({
    discordId: member.id,
    pseudo: member.displayName,
    roster,
  });
  return true;
};

/**
 * Comme `extractRosterFromMember`, mais retourne "autres" au lieu de
 * `null` quand le membre n'a pas de rôle de roster valide. Utilisé lors de
 * l'ajout d'un temps TT, pour que n'importe quel membre puisse enregistrer
 * un temps même sans rôle Roster Perle/Diamant.
 */
export const resolveRosterForTimeEntry = (member: GuildMember): string =>
  extractRosterFromMember(member) ?? "autres";

/**
 * Synchronise tous les membres d'un serveur ayant un rôle de roster valide.
 * Retourne le nombre de joueurs synchronisés.
 */
export const syncAllPlayersInGuild = async (guild: Guild): Promise<number> => {
  const members = await guild.members.fetch();

  let synced = 0;
  for (const member of members.values()) {
    if (await syncPlayerFromMember(member)) synced++;
  }
  return synced;
};
