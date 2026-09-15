import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ModalBuilder,
  LabelBuilder,
  TextInputBuilder,
  TextInputStyle,
  CheckboxGroupBuilder,
  StringSelectMenuBuilder,
  TextChannel,
} from "discord.js";
import { postWarAvailability } from "../src/services/warAvailability";
import { scheduleRecurringWarAvailability } from "../src/scheduler/recurringWarScheduler";
import {
  WEEKDAY_LABELS,
  getNextDateForWeekday,
  withTime,
} from "../src/utils/date";

const DAY_OPTIONS = [
  { label: "Lundi", value: "monday" },
  { label: "Mardi", value: "tuesday" },
  { label: "Mercredi", value: "wednesday" },
  { label: "Jeudi", value: "thursday" },
  { label: "Vendredi", value: "friday" },
  { label: "Samedi", value: "saturday" },
  { label: "Dimanche", value: "sunday" },
];

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
  label: `${i < 10 ? "0" : ""}${i}:00`,
  value: `${i < 10 ? "0" : ""}${i}:00`,
}));

module.exports = {
  data: new SlashCommandBuilder()
    .setName("createwar")
    .setDescription("Crée de nouvelles dispos pour des wars"),
  async execute(interaction: ChatInputCommandInteraction) {
    const daysSelectInput = new StringSelectMenuBuilder()
      .setCustomId("daysSelectInput")
      .setPlaceholder("Choisissez un ou plusieurs jours")
      .setMinValues(1)
      .setMaxValues(7)
      .addOptions(DAY_OPTIONS);

    const daysSelectLabel = new LabelBuilder()
      .setLabel("Jours disponibles")
      .setDescription("Sélectionnez les jours où vous voulez créer les wars.")
      .setStringSelectMenuComponent(daysSelectInput);

    const recurringCheckbox = new CheckboxGroupBuilder()
      .setCustomId("recurringCheckbox")
      .addOptions([{ label: "Récurrent", value: "recurring" }])
      .setRequired(false);
    const recurringCheckboxLabel = new LabelBuilder()
      .setLabel("Récurrence")
      .setDescription(
        "Cochez pour republier ces wars chaque semaine, les jours choisis à 9h.",
      )
      .setCheckboxGroupComponent(recurringCheckbox);

    const hoursSelectInput = new StringSelectMenuBuilder()
      .setCustomId("hoursSelectInput")
      .setPlaceholder("Choisissez un ou plusieurs créneaux horaires")
      .setMinValues(1)
      .setMaxValues(4)
      .addOptions(HOUR_OPTIONS);

    const hoursSelectLabel = new LabelBuilder()
      .setLabel("Créneaux horaires disponibles")
      .setDescription(
        "Sélectionnez les créneaux horaires où vous voulez créer les wars.",
      )
      .setStringSelectMenuComponent(hoursSelectInput);

    const warNameInput = new TextInputBuilder()
      .setCustomId("warNameInput")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("Entrez le titre de la war")
      .setRequired(true);

    const warNameLabel = new LabelBuilder()
      .setLabel("Titre de la war")
      .setDescription("Entrez le titre de la war que vous voulez créer.")
      .setTextInputComponent(warNameInput);

    const publishDaysBeforeInput = new TextInputBuilder()
      .setCustomId("publishDaysBeforeInput")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("0")
      .setRequired(false);

    const publishDaysBeforeLabel = new LabelBuilder()
      .setLabel("Publier combien de jours avant")
      .setDescription(
        "Récurrent uniquement : nombre de jours avant la war pour publier les dispos (0 = le jour même).",
      )
      .setTextInputComponent(publishDaysBeforeInput);

    const modal = new ModalBuilder()
      .setCustomId("createWarModal")
      .setTitle("Création de wars")
      .addLabelComponents(
        daysSelectLabel,
        recurringCheckboxLabel,
        hoursSelectLabel,
        warNameLabel,
        publishDaysBeforeLabel,
      );

    await interaction.showModal(modal);

    try {
      const collected = await interaction.awaitModalSubmit({
        time: 60_000,
        filter: (i) => i.customId === "createWarModal",
      });

      const isRecurring = collected.fields
        .getCheckboxGroup("recurringCheckbox")
        .includes("recurring");

      const channel = collected.channel;
      if (!channel || !channel.isTextBased() || channel.isDMBased()) {
        await collected.reply({
          content:
            "Cette commande doit être utilisée dans un salon de serveur.",
          ephemeral: true,
        });
        return;
      }

      // La création des embeds (envoi + réactions par créneau) peut prendre
      // plus de 3s, on doit donc accuser réception tout de suite pour éviter
      // que le token d'interaction n'expire (DiscordAPIError 10062).
      await collected.deferReply({ ephemeral: true });

      const warName = collected.fields.getTextInputValue("warNameInput");
      const days = collected.fields.getStringSelectValues("daysSelectInput");
      const hours = [
        ...collected.fields.getStringSelectValues("hoursSelectInput"),
      ].sort((a, b) => Number(a.split(":")[0]) - Number(b.split(":")[0]));

      if (isRecurring) {
        const rawPublishDaysBefore = Number(
          collected.fields.getTextInputValue("publishDaysBeforeInput"),
        );
        const publishDaysBefore = Number.isInteger(rawPublishDaysBefore)
          ? Math.min(6, Math.max(0, rawPublishDaysBefore))
          : 0;

        for (const day of days) {
          await scheduleRecurringWarAvailability({
            channel: channel as TextChannel,
            weekday: day,
            hours,
            title: warName,
            publishDaysBefore,
          });
        }

        const publishNote =
          publishDaysBefore > 0
            ? ` (publiées ${publishDaysBefore} jour${publishDaysBefore > 1 ? "s" : ""} avant, à 9h)`
            : " (publiées le jour même, à 9h)";

        await collected.editReply({
          content: `Les wars récurrentes ont été programmées : chaque ${days
            .map((day) => WEEKDAY_LABELS[day])
            .join(", ")}${publishNote}.`,
        });
        return;
      }

      for (const day of days) {
        const date = getNextDateForWeekday(day);
        for (const hour of hours) {
          await postWarAvailability(channel as TextChannel, {
            title: warName,
            date: withTime(date, hour),
          });
        }
      }

      await collected.editReply({
        content: "Les wars ont été créées.",
      });
    } catch (err) {
      console.error(err);
    }
  },
};
