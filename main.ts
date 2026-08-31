import {
  Client,
  Events,
  GatewayIntentBits,
  TextChannel,
  time,
  EmbedBuilder,
  MessageReaction,
  User,
} from "discord.js";
import dotenv from "dotenv";
dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

type Availability = "can" | "maybe" | "sub" | "can't";

const availabilities: Record<string, Availability> = {
  "✅": "can",
  "🤷": "maybe",
  "❓": "sub",
  "❌": "can't",
};

const availabilityLabels: Record<Availability, string> = {
  can: "Participants",
  maybe: "Maybe",
  sub: "Subs",
  "can't": "Can't",
};

const emptyFieldValue = "Aucun";

const createWarAvailabilityEmbeds = async (channel: TextChannel) => {
  const now = new Date();
  const currentDay = Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
  }).format(now);
  const hoursOfAvailability = [19, 20, 21, 22];
  if (now.getDay() === 0) {
    hoursOfAvailability.unshift(18);
  }

  for (const hour of hoursOfAvailability) {
    const peopleAvailability = new Map<
      string,
      { name: string; availability: Availability }
    >();
    const availabilityTime = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hour,
      0,
      0,
    );
    const embedData = {
      title:
        currentDay === "dimanche" && hour === 18
          ? "SQ 6v6 du dimanche"
          : `Wars du ${currentDay}`,
      description: `Date: ${time(availabilityTime, "F")}, `,
      color: 0x00ff00,
    };
    const buildEmbed = () => {
      const fields = (
        Object.entries(availabilityLabels) as [Availability, string][]
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
                .map((person, index) => `${index + 1}. ${person.name}`)
                .join("\n") || emptyFieldValue,
          },
        ];
      });

      return new EmbedBuilder()
        .setTitle(embedData.title)
        .setDescription(embedData.description)
        .setColor(embedData.color)
        .setFields(fields);
    };

    const mess = await channel.send({ embeds: [buildEmbed()] });

    let updateTimer: NodeJS.Timeout | undefined;
    const scheduleMessageUpdate = () => {
      if (updateTimer) clearTimeout(updateTimer);
      updateTimer = setTimeout(() => {
        updateTimer = undefined;
        void mess.edit({ embeds: [buildEmbed()] }).catch(console.error);
      }, 200);
    };

    const collectorFilter = (reaction: MessageReaction, user: User) => {
      return (
        ["✅", "🤷", "❓", "❌"].includes(reaction.emoji.name ?? "") &&
        !user.bot
      );
    };

    const collector = mess.createReactionCollector({
      filter: collectorFilter,
      time: 60_000 * 1440,
      dispose: true,
    });

    collector.on("collect", (reaction, user) => {
      const currentEmojiName = reaction.emoji.name;
      const availability = availabilities[currentEmojiName ?? ""];
      if (!availability) return;

      peopleAvailability.set(user.id, {
        name: `<@${user.id}> (${user.username})`,
        availability,
      });
      scheduleMessageUpdate();

      for (const eachReaction of reaction.message.reactions.cache.values()) {
        if (eachReaction.emoji.name !== currentEmojiName) {
          void eachReaction.users.remove(user.id).catch(() => {});
        }
      }
    });

    collector.on("remove", (reaction, user) => {
      const availability = availabilities[reaction.emoji.name ?? ""];
      if (peopleAvailability.get(user.id)?.availability !== availability)
        return;

      peopleAvailability.delete(user.id);
      scheduleMessageUpdate();
    });

    collector.once("end", () => {
      if (updateTimer) clearTimeout(updateTimer);
    });

    await Promise.allSettled(
      ["✅", "🤷", "❓", "❌"].map((emoji) => mess.react(emoji)),
    );
  }
};

client.once(Events.ClientReady, (readyClient) => {
  console.log("TCBot is ready! Logged in as " + readyClient.user.tag);

  const scheduleDailyAvailabilityEmbeds = () => {
    const nextRun = new Date();
    nextRun.setHours(9, 0, 0, 0);

    if (nextRun <= new Date()) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    setTimeout(() => {
      void (async () => {
        try {
          const channel = await readyClient.channels.fetch(
            process.env.GUILD_ROOM_ID ?? "",
          );

          if (channel?.isTextBased()) {
            await createWarAvailabilityEmbeds(channel as TextChannel);
          }
        } catch (error) {
          console.error("Impossible d'envoyer les disponibilités:", error);
        } finally {
          scheduleDailyAvailabilityEmbeds();
        }
      })();
    }, nextRun.getTime() - Date.now());
  };

  scheduleDailyAvailabilityEmbeds();
});

client.login(process.env.BOT_TOKEN ?? "");
