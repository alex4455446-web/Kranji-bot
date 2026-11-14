import { Events } from "discord.js";
import { logger, startupLog } from "../utils/logger.js";
import { resolvePresence } from "../config/bot.js";
import { initRiffyAfterReady } from "../services/music/riffySetup.js";

export default {
  name: Events.ClientReady,
  once: true,

  async execute(client) {
    try {
      client.user.setPresence(resolvePresence(client));

      startupLog(`Ready! Logged in as ${client.user.tag}`);
      startupLog(`Serving ${client.guilds.cache.size} guild(s)`);
      startupLog(`Loaded ${client.commands.size} commands`);

      if (client.config?.features?.music) {
        initRiffyAfterReady(client);
      }
    } catch (error) {
      logger.error("Error in ready event:", error);
    }
  },
};
