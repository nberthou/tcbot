import { Client, Collection, GatewayIntentBits } from "discord.js";
import { Command } from "./command";

export class TCBotClient extends Client {
  commands: Collection<string, Command> = new Collection();
}

export const createClient = () =>
  new TCBotClient({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMessageReactions,
    ],
  });
