import { Events } from "discord.js";
import { syncPlayerFromMember } from "../services/playerRoster";
import { TCBotClient } from "./client";

/**
 * Garde la base de joueurs synchronisée dynamiquement : dès qu'un membre
 * rejoint le serveur ou que ses rôles/pseudo changent, son enregistrement
 * de joueur (roster, pseudo) est mis à jour en conséquence.
 */
export const registerPlayerSyncHandler = (client: TCBotClient) => {
  const sync = (member: Parameters<typeof syncPlayerFromMember>[0]) => {
    void syncPlayerFromMember(member).catch((error) =>
      console.error(`Impossible de synchroniser le joueur ${member.id}:`, error),
    );
  };

  client.on(Events.GuildMemberAdd, sync);
  client.on(Events.GuildMemberUpdate, (_oldMember, newMember) => sync(newMember));
};
