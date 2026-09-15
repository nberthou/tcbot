import { REST, Routes } from "discord.js";
import dotenv from "dotenv";
dotenv.config();

import { loadCommandModules } from "./src/discord/commandLoader";

const commands = loadCommandModules();

const rest = new REST().setToken(process.env.BOT_TOKEN!);

(async () => {
  try {
    console.log(
      `Started refreshing ${commands.size} application (/) commands.`,
    );

    await rest.put(Routes.applicationCommands(process.env.BOT_ID!), {
      body: Array.from(commands.values()).map((command) =>
        command.data.toJSON(),
      ),
    });

    console.log(
      `Successfully reloaded ${commands.size} application (/) commands.`,
    );
  } catch (error) {
    console.error(error);
  }
})();
