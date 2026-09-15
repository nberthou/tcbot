import fs from "fs";
import path from "node:path";
import { Command } from "./command";

const COMMANDS_DIR = path.join(__dirname, "..", "..", "commands");

/**
 * Charge tous les modules de commande présents dans le dossier `commands/`.
 */
export const loadCommandModules = (): Map<string, Command> => {
  const commands = new Map<string, Command>();
  const commandFiles = fs.readdirSync(COMMANDS_DIR);

  for (const file of commandFiles) {
    const filePath = path.join(COMMANDS_DIR, file);
    const command = require(filePath) as Partial<Command>;

    if (command.data && command.execute) {
      commands.set(command.data.name, command as Command);
    } else {
      console.log(
        `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`,
      );
    }
  }

  return commands;
};
