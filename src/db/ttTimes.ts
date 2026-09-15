import { prisma } from "./prisma";

export interface TtTimeWithPlayer {
  id: string;
  track: string;
  timeMs: number;
  recordedAt: Date;
  player: {
    id: string;
    discordId: string;
    pseudo: string;
    roster: string;
  };
}

/**
 * Enregistre un temps s'il s'agit d'un nouveau record personnel pour ce
 * joueur sur cette map (ou du premier temps enregistré). Ne fait rien si le
 * temps existant est déjà meilleur ou égal.
 */
export const recordPersonalBestIfFaster = async (
  playerId: string,
  track: string,
  timeMs: number,
): Promise<{ saved: boolean; bestMs: number; previousBestMs: number | null }> => {
  const existing = await prisma.ttTime.findUnique({
    where: { playerId_track: { playerId, track } },
  });

  if (existing && existing.timeMs <= timeMs) {
    return { saved: false, bestMs: existing.timeMs, previousBestMs: existing.timeMs };
  }

  const result = await prisma.ttTime.upsert({
    where: { playerId_track: { playerId, track } },
    update: { timeMs, recordedAt: new Date() },
    create: { playerId, track, timeMs },
  });

  return {
    saved: true,
    bestMs: result.timeMs,
    previousBestMs: existing?.timeMs ?? null,
  };
};

export const getTimesForTrack = async (
  track: string,
): Promise<TtTimeWithPlayer[]> => {
  return prisma.ttTime.findMany({
    where: { track },
    include: { player: true },
    orderBy: { timeMs: "asc" },
  });
};

export const getAllTimes = async (): Promise<TtTimeWithPlayer[]> => {
  return prisma.ttTime.findMany({
    include: { player: true },
    orderBy: { timeMs: "asc" },
  });
};

export const getTimesForPlayer = async (
  playerId: string,
): Promise<TtTimeWithPlayer[]> => {
  return prisma.ttTime.findMany({
    where: { playerId },
    include: { player: true },
    orderBy: { track: "asc" },
  });
};
