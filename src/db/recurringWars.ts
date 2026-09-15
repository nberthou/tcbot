import { prisma } from "./prisma";

export interface RecurringWarRecord {
  id: string;
  channelId: string;
  weekday: string;
  hours: string[];
  title: string;
  publishDaysBefore: number;
}

export const insertRecurringWar = async (
  record: Omit<RecurringWarRecord, "id">,
): Promise<string> => {
  const created = await prisma.recurringWar.create({ data: record });
  return created.id;
};

export const getAllRecurringWars = async (): Promise<RecurringWarRecord[]> => {
  return prisma.recurringWar.findMany();
};

/**
 * Supprime une war récurrente. Retourne `false` si l'id n'existait pas.
 */
export const deleteRecurringWar = async (id: string): Promise<boolean> => {
  try {
    await prisma.recurringWar.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
};
