import { prisma } from "./prisma";

export interface ActiveWarPostRecord {
  id: string;
  channelId: string;
  messageId: string;
  title: string;
  date: Date;
  color: number;
  expiresAt: Date;
}

export const insertActiveWarPost = async (
  record: Omit<ActiveWarPostRecord, "id">,
): Promise<string> => {
  const created = await prisma.activeWarPost.create({ data: record });
  return created.id;
};

export const getAllActiveWarPosts = async (): Promise<
  ActiveWarPostRecord[]
> => {
  return prisma.activeWarPost.findMany();
};

export const deleteActiveWarPost = async (id: string): Promise<void> => {
  await prisma.activeWarPost.delete({ where: { id } }).catch(() => {});
};
