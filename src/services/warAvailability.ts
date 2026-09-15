import {
  Client,
  EmbedBuilder,
  Guild,
  Message,
  MessageReaction,
  TextChannel,
  User,
  time,
} from "discord.js";
import {
  deleteActiveWarPost,
  getAllActiveWarPosts,
  insertActiveWarPost,
} from "../db/activeWarPosts";
import {
  AVAILABILITY_BY_EMOJI,
  AVAILABILITY_EMOJIS,
  AVAILABILITY_LABELS,
  Availability,
  EMPTY_FIELD_VALUE,
} from "../types";
import { getRosterEmoji } from "./discordEmoji";

export interface WarSlot {
  title: string;
  date: Date;
  color?: number;
}

type PeopleAvailability = Map<
  string,
  { name: string; availability: Availability }
>;

/** Durée pendant laquelle un message de war accepte des réactions. */
const COLLECTOR_DURATION_MS = 60_000 * 1440;

const getUserRoster = async (guild: Guild, userId: string) => {
  const member = await guild.members.fetch(userId).catch(() => undefined);
  const rosterRole = member?.roles.cache.find(
    (role) => role.name.startsWith("Roster") || role.name.startsWith("Test"),
  );
  if (!rosterRole) return "mixte";
  const parts = rosterRole.name.split(" ");
  return (parts[1] ?? "mixte").toLowerCase();
};

const buildAvailabilityName = async (guild: Guild, user: User) => {
  const userRoster = await getUserRoster(guild, user.id);
  return `${getRosterEmoji(guild, userRoster)} <@${user.id}> (${user.username})`;
};

const buildEmbed = (
  title: string,
  date: Date,
  color: number,
  peopleAvailability: PeopleAvailability,
) => {
  const fields = (
    Object.entries(AVAILABILITY_LABELS) as [Availability, string][]
  ).flatMap(([availability, label]) => {
    const people = [...peopleAvailability.values()].filter(
      (person) => person.availability === availability,
    );

    if (availability !== "can" && people.length === 0) return [];

    return [
      {
        name: `${label} (${people.length})`,
        value:
          people
            .map(
              (person, index) =>
                `${index + 1}. ${String(person.name ?? "Inconnu")}`,
            )
            .join("\n") || EMPTY_FIELD_VALUE,
      },
    ];
  });

  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(`Date: ${time(date, "F")}, `)
    .setColor(color)
    .setFields(fields);
};

/**
 * Relit les réactions actuellement présentes sur un message pour
 * reconstruire l'état de disponibilité (utilisé après un redémarrage, où
 * l'état en mémoire a été perdu mais les réactions Discord restent la
 * source de vérité).
 */
const collectExistingAvailability = async (
  message: Message,
): Promise<PeopleAvailability> => {
  const peopleAvailability: PeopleAvailability = new Map();
  const guild = message.guild;
  if (!guild) return peopleAvailability;

  for (const emoji of AVAILABILITY_EMOJIS) {
    const reaction = message.reactions.cache.find(
      (r) => r.emoji.name === emoji,
    );
    if (!reaction) continue;

    const users = await reaction.users.fetch();
    for (const user of users.values()) {
      if (user.bot) continue;
      peopleAvailability.set(user.id, {
        name: await buildAvailabilityName(guild, user),
        availability: AVAILABILITY_BY_EMOJI[emoji],
      });
    }
  }

  return peopleAvailability;
};

/**
 * Attache le suivi des réactions de disponibilité (✅/❓/❕/❌) à un message
 * déjà envoyé, avec un état de départ éventuel. Utilisé aussi bien pour un
 * message tout juste créé que pour un message restauré après redémarrage.
 */
const attachAvailabilityTracking = (
  message: Message,
  {
    dbId,
    title,
    date,
    color,
    remainingMs,
    peopleAvailability,
  }: {
    dbId: string;
    title: string;
    date: Date;
    color: number;
    remainingMs: number;
    peopleAvailability: PeopleAvailability;
  },
) => {
  const guild = message.guild;
  if (!guild) return;

  let updateTimer: NodeJS.Timeout | undefined;
  const scheduleMessageUpdate = () => {
    if (updateTimer) clearTimeout(updateTimer);
    updateTimer = setTimeout(() => {
      updateTimer = undefined;
      void message
        .edit({ embeds: [buildEmbed(title, date, color, peopleAvailability)] })
        .catch(console.error);
    }, 200);
  };

  const collectorFilter = (reaction: MessageReaction, user: User) => {
    return AVAILABILITY_EMOJIS.includes(reaction.emoji.name ?? "") && !user.bot;
  };

  const collector = message.createReactionCollector({
    filter: collectorFilter,
    time: Math.max(remainingMs, 0),
    dispose: true,
  });

  collector.on("collect", (reaction, user) => {
    const currentEmojiName = reaction.emoji.name;
    const availability = AVAILABILITY_BY_EMOJI[currentEmojiName ?? ""];
    if (!availability) return;

    void buildAvailabilityName(guild, user).then((name) => {
      peopleAvailability.set(user.id, { name, availability });
      scheduleMessageUpdate();
    });

    for (const eachReaction of reaction.message.reactions.cache.values()) {
      if (eachReaction.emoji.name !== currentEmojiName) {
        void eachReaction.users.remove(user.id).catch(() => {});
      }
    }
  });

  collector.on("remove", (reaction, user) => {
    const availability = AVAILABILITY_BY_EMOJI[reaction.emoji.name ?? ""];
    if (peopleAvailability.get(user.id)?.availability !== availability)
      return;

    peopleAvailability.delete(user.id);
    scheduleMessageUpdate();
  });

  collector.once("end", () => {
    if (updateTimer) clearTimeout(updateTimer);
    void deleteActiveWarPost(dbId);
  });
};

/**
 * Publie un embed de disponibilité pour un créneau de war donné et gère la
 * collecte des réactions des membres (✅/❓/❕/❌) sur ce message. Le message
 * est enregistré en base pour pouvoir restaurer le suivi des réactions si
 * le bot redémarre avant la fin de la fenêtre de collecte (24h).
 */
export const postWarAvailability = async (
  channel: TextChannel,
  { title, date, color = 0x00ff00 }: WarSlot,
) => {
  const peopleAvailability: PeopleAvailability = new Map();

  const mess = await channel.send({
    embeds: [buildEmbed(title, date, color, peopleAvailability)],
  });

  const dbId = await insertActiveWarPost({
    channelId: channel.id,
    messageId: mess.id,
    title,
    date,
    color,
    expiresAt: new Date(Date.now() + COLLECTOR_DURATION_MS),
  });

  attachAvailabilityTracking(mess, {
    dbId,
    title,
    date,
    color,
    remainingMs: COLLECTOR_DURATION_MS,
    peopleAvailability,
  });

  await Promise.allSettled(
    AVAILABILITY_EMOJIS.map((emoji) => mess.react(emoji)),
  );

  return mess;
};

/**
 * Publie plusieurs créneaux de war à la suite dans un salon.
 */
export const postWarAvailabilityBatch = async (
  channel: TextChannel,
  slots: WarSlot[],
) => {
  for (const slot of slots) {
    await postWarAvailability(channel, slot);
  }
};

/**
 * Recharge depuis la base tous les messages de war encore actifs (postés
 * il y a moins de 24h) et réattache leur suivi de réactions, en
 * reconstruisant l'état de disponibilité à partir des réactions actuelles
 * sur Discord. À appeler une fois au démarrage du bot.
 */
export const restoreActiveWarPosts = async (client: Client) => {
  for (const record of await getAllActiveWarPosts()) {
    const remainingMs = record.expiresAt.getTime() - Date.now();
    if (remainingMs <= 0) {
      await deleteActiveWarPost(record.id);
      continue;
    }

    try {
      const channel = await client.channels.fetch(record.channelId);
      if (!channel || !channel.isTextBased() || channel.isDMBased()) {
        await deleteActiveWarPost(record.id);
        continue;
      }

      const textChannel = channel as TextChannel;
      const message = await textChannel.messages.fetch(record.messageId);
      const peopleAvailability = await collectExistingAvailability(message);

      await message.edit({
        embeds: [
          buildEmbed(record.title, record.date, record.color, peopleAvailability),
        ],
      });

      attachAvailabilityTracking(message, {
        dbId: record.id,
        title: record.title,
        date: record.date,
        color: record.color,
        remainingMs,
        peopleAvailability,
      });
    } catch (error) {
      console.error(
        `Impossible de restaurer le message de war #${record.id}:`,
        error,
      );
      await deleteActiveWarPost(record.id);
    }
  }
};
