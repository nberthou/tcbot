import { prisma } from "./prisma";

export interface PlayerRoster {
  discordId: string;
  pseudo: string;
  roster: string;
}

export interface PlayerRecord extends PlayerRoster {
  id: string;
}

export const upsertPlayer = async (player: PlayerRoster): Promise<string> => {
  const saved = await prisma.player.upsert({
    where: { discordId: player.discordId },
    update: { pseudo: player.pseudo, roster: player.roster },
    create: player,
  });
  return saved.id;
};

export const getAllPlayers = async (): Promise<PlayerRecord[]> => {
  return prisma.player.findMany();
};

export const getPlayerById = async (
  id: string,
): Promise<PlayerRecord | null> => {
  return prisma.player.findUnique({ where: { id } });
};
