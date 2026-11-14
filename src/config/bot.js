import { logger } from '../utils/logger.js';

// Captured once at process start; the elapsed-timer origin for the default
// presence, so the counter doesn't reset every time presence is re-applied.
const PRESENCE_STARTED_AT = Date.now();

export const botConfig = {
  // =========================
  // BOT PRESENCE (what users see under the bot name)
  // =========================
  // `status` options:
  // - "online"    = green dot
  // - "idle"      = yellow moon
  // - "dnd"       = red do-not-disturb
  // - "invisible" = appears offline
  presence: {
    // Current online state shown on Discord.
    // "online" | "idle" | "dnd" | "invisible"
    status: "online",

    // Rich activity shown under the bot name.
    // `type` number mapping from Discord:
    // 0 = Playing
    // 1 = Streaming
    // 2 = Listening
    // 3 = Watching
    // 4 = Custom      (renders only `state`, single line)
    // 5 = Competing
    //
    // NOTE: `details` + `state` (the two extra lines) only render for
    // non-custom types (0/1/2/3/5). `buttons` is NOT supported on bot
    // presences (RPC only).
    activities: [
      {
        name: "TitanBot", // header line: "Playing TitanBot"
        type: 0, // Playing
        url: null, // required only when type = 1 (Streaming)

        // Two lines under the header. Supports placeholders:
        // {guilds} | {users} | {commands}  (resolved live on ready)
        details: "/help • /play • /queue",
        state: "{guilds} servers • {users} members",

        // Elapsed timer. `start: true` = start counting when the bot goes
        // ready. Set to false/null to hide the timer.
        timestamps: { start: true },

        // Images. Use a Rich Presence art-asset key (uploaded in the Discord
        // Developer Portal) OR a direct https image URL. Set to null to hide.
        assets: {
          largeImage:
            "https://i.supaimg.com/e6a0e633-3e0b-472f-bba3-c79e34b9385b/3515d830-3a29-42a2-a11b-3402185666ad.png",
          largeText: "TitanBot",
          smallImage: null,
          smallText: null,
        },
      },
    ],

    // Special presence shown while music is playing in ANY guild. Reverts to
    // the `activities` above once nothing is playing.
    music: {
      enabled: true,

      // "online" | "idle" | "dnd" | "invisible"
      status: "online",

      // 2 = Listening ("Listening to {name}"). 0 = Playing works too.
      type: 2,

      // Placeholders: {title} {author} {requester} {guild} {count} {artwork}
      name: "{title}",
      details: "{guild}",
      state: "by {author} • {count} playing",

      // Timer starts counting when the current track started.
      timestamps: { start: true },

      // Large image = bot logo, small (mini) image = track cover.
      // {artwork} resolves to the track thumbnail (empty -> image hidden).
      assets: {
        largeImage:
          "https://i.supaimg.com/e6a0e633-3e0b-472f-bba3-c79e34b9385b/3515d830-3a29-42a2-a11b-3402185666ad.png",
        largeText: "TitanBot",
        smallImage: "{artwork}",
        smallText: "{title}",
      },
    },
  },

  // =========================
  // COMMAND BEHAVIOR
  // =========================
  commands: {
    // Bot owner user IDs (comma-separated in OWNER_IDS env var).
    // Owners can access owner/admin-level bot commands.
    owners: process.env.OWNER_IDS?.split(",").map((id) => id.trim()).filter(Boolean) || [],

    // Default wait time between command uses (in seconds).
    defaultCooldown: 3,

    // If true, old commands are removed before re-registering.
    deleteCommands: false,

    // Optional server ID retained for tutorial compatibility; not used for command registration.
    testGuildId: process.env.TEST_GUILD_ID,

    // When true (or MAINTENANCE_MODE=true), only bot owners can run commands.
    maintenanceMode: process.env.MAINTENANCE_MODE === "true",

    // Command prefix for text-based commands (e.g., "!" for "!ping").
    // Supports both slash commands and prefix commands.
    prefix: process.env.PREFIX || "!",
  },

  // =========================
  // EMBED COLORS & BRANDING
  // =========================
  // IMPORTANT: This is the SINGLE SOURCE OF TRUTH for all bot colors
  embeds: {
    colors: {
      // Main brand colors.
      primary: "#f47fff",
      secondary: "#2F3136",

      // Standard status colors for success/error/warning/info messages.
      success: "#57F287",
      error: "#ED4245",
      warning: "#FEE75C",
      info: "#3498DB",

      // Neutral utility colors.
      light: "#FFFFFF",
      dark: "#202225",
      gray: "#99AAB5",

      // Discord-style palette shortcuts.
      blurple: "#5865F2",
      green: "#57F287",
      yellow: "#FEE75C",
      fuchsia: "#EB459E",
      red: "#ED4245",
      black: "#000000",
    },
    footer: {
      // Default footer text used in bot embeds.
      text: "Titan Bot",
      // Footer icon URL (null = no icon).
      icon: null,
    },
    // Default thumbnail URL for embeds (null = no thumbnail).
    thumbnail: null,
    author: {
      // Optional default embed author block.
      name: null,
      icon: null,
      url: null,
    },
  },

  // =========================
  // GENERIC BOT MESSAGES
  // =========================
  messages: {
    noPermission: "You do not have permission to use this command.",
    cooldownActive: "Please wait {time} before using this command again.",
    errorOccurred: "An error occurred while executing this command.",
    missingPermissions:
      "I am missing required permissions to perform this action.",
    commandDisabled: "This command has been disabled.",
    maintenanceMode: "The bot is currently in maintenance mode.",
  },

  // =========================
  // FEATURE TOGGLES
  // =========================
  // Set any feature to `false` to disable it globally.
  features: {
    music: true,
  },
};

export function validateConfig(config) {
  const errors = [];

  if (process.env.NODE_ENV !== 'production') {
    logger.debug('Environment variables check:');
    logger.debug('DISCORD_TOKEN exists:', !!process.env.DISCORD_TOKEN);
    logger.debug('TOKEN exists:', !!process.env.TOKEN);
    logger.debug('CLIENT_ID exists:', !!process.env.CLIENT_ID);
    logger.debug('GUILD_ID exists:', !!process.env.GUILD_ID);
    logger.debug('POSTGRES_HOST exists:', !!process.env.POSTGRES_HOST);
    logger.debug('NODE_ENV:', process.env.NODE_ENV);
  }

  if (!process.env.DISCORD_TOKEN && !process.env.TOKEN) {
    errors.push("Bot token is required (DISCORD_TOKEN or TOKEN environment variable)");
  }

  if (!process.env.CLIENT_ID) {
    errors.push("Client ID is required (CLIENT_ID environment variable)");
  }

  if (process.env.NODE_ENV === 'production') {
    // A full connection URL (DATABASE_URL / POSTGRES_URL) satisfies all Postgres
    // requirements, matching how src/config/database/postgres.js resolves the pool config.
    const hasConnectionUrl = Boolean(process.env.POSTGRES_URL || process.env.DATABASE_URL);

    if (!hasConnectionUrl) {
      if (!process.env.POSTGRES_HOST) {
        errors.push("PostgreSQL connection is required in production (set DATABASE_URL/POSTGRES_URL, or POSTGRES_HOST)");
      }
      if (!process.env.POSTGRES_USER) {
        errors.push("PostgreSQL user is required in production (set DATABASE_URL/POSTGRES_URL, or POSTGRES_USER)");
      }
      if (!process.env.POSTGRES_PASSWORD) {
        errors.push("PostgreSQL password is required in production (set DATABASE_URL/POSTGRES_URL, or POSTGRES_PASSWORD)");
      }
    }
  }

  return errors;
}

const configErrors = validateConfig(botConfig);
if (configErrors.length > 0) {
  logger.error("Bot configuration errors:", configErrors.join("\n"));
  if (process.env.NODE_ENV === "production") {
    process.exit(1);
  }
}

export const BotConfig = botConfig;

const COMMAND_CATEGORY_FEATURE_MAP = {
  music: "music",
};

function normalizeCategoryKey(category) {
  return String(category || "").trim().toLowerCase().replace(/\s+/g, "_");
}

export function getCommandPrefix() {
  return botConfig.commands?.prefix ?? "!";
}

// Fills {placeholder} tokens in a string using the given replacements map.
// Unknown tokens are left untouched.
function fillPlaceholders(value, replacements) {
  return typeof value === "string"
    ? value.replace(/\{(\w+)\}/g, (match, key) =>
        key in replacements ? replacements[key] : match,
      )
    : value;
}

// Turns a presence-activity template into the payload Discord receives,
// resolving placeholders and building the timestamps/assets blocks.
function buildActivity(template, replacements, { startTime } = {}) {
  const activity = {
    name: fillPlaceholders(template.name, replacements),
    type: template.type ?? 0,
  };

  if (template.url) activity.url = template.url;
  if (template.details != null) {
    activity.details = fillPlaceholders(template.details, replacements);
  }
  if (template.state != null) {
    activity.state = fillPlaceholders(template.state, replacements);
  }

  if (template.timestamps) {
    const { start, end } = template.timestamps;
    const timestamps = {};
    if (start === true) timestamps.start = startTime ?? Date.now();
    else if (start) timestamps.start = start;
    if (end === true) timestamps.end = Date.now();
    else if (end) timestamps.end = end;
    if (Object.keys(timestamps).length) activity.timestamps = timestamps;
  }

  if (template.assets) {
    const assets = {};
    const largeImage = fillPlaceholders(template.assets.largeImage, replacements);
    const smallImage = fillPlaceholders(template.assets.smallImage, replacements);
    if (largeImage) {
      assets.largeImage = largeImage;
      if (template.assets.largeText) {
        assets.largeText = fillPlaceholders(template.assets.largeText, replacements);
      }
    }
    if (smallImage) {
      assets.smallImage = smallImage;
      if (template.assets.smallText) {
        assets.smallText = fillPlaceholders(template.assets.smallText, replacements);
      }
    }
    if (Object.keys(assets).length) activity.assets = assets;
  }

  return activity;
}

// Builds the default (non-music) presence Discord actually receives. Resolves
// dynamic placeholders ({guilds}/{users}/{commands}) against the live client.
export function resolvePresence(client) {
  const presence = botConfig.presence;

  if (!presence?.activities?.length) {
    return presence;
  }

  const guilds = client?.guilds?.cache;
  const replacements = {
    guilds: (guilds?.size ?? 0).toLocaleString("en-US"),
    users: (
      guilds?.reduce((total, guild) => total + (guild.memberCount ?? 0), 0) ?? 0
    ).toLocaleString("en-US"),
    commands: String(client?.commands?.size ?? 0),
  };

  const activities = presence.activities.map((activity) =>
    buildActivity(activity, replacements, { startTime: PRESENCE_STARTED_AT }),
  );

  return { status: presence.status, activities };
}

// Builds the "music is playing" presence from `presence.music`. `track` is the
// entry tracked by services/music/musicPresence.js; `activeCount` is how many
// guilds are currently playing.
export function resolveMusicPresence(client, track, activeCount = 1) {
  const music = botConfig.presence?.music;

  if (!music?.enabled) {
    return resolvePresence(client);
  }

  const replacements = {
    title: track?.title ?? "Unknown",
    author: track?.author ?? "Unknown",
    requester: track?.requester ?? "Unknown",
    guild: track?.guildName ?? "Unknown",
    count: String(activeCount ?? 1),
    artwork: track?.artwork ?? "",
  };

  return {
    status: music.status ?? "online",
    activities: [
      buildActivity(music, replacements, { startTime: track?.startedAt }),
    ],
  };
}

export function getBotOwners() {
  return (botConfig.commands?.owners ?? [])
    .map((id) => String(id).trim())
    .filter(Boolean);
}

export function isBotOwner(userId) {
  if (!userId) {
    return false;
  }

  return getBotOwners().includes(String(userId));
}

export function isMaintenanceMode() {
  return botConfig.commands?.maintenanceMode === true;
}

export function getBotMessage(key, replacements = {}) {
  let message = botConfig.messages?.[key] || key;

  for (const [placeholder, value] of Object.entries(replacements)) {
    message = message.replace(new RegExp(`\\{${placeholder}\\}`, "g"), String(value));
  }

  return message;
}

export function isFeatureEnabled(featureKey) {
  if (!featureKey) {
    return true;
  }

  return botConfig.features?.[featureKey] !== false;
}

export function isCommandCategoryEnabled(category) {
  const normalized = normalizeCategoryKey(category);

  if (!normalized || normalized === "core") {
    return true;
  }

  const featureKey = COMMAND_CATEGORY_FEATURE_MAP[normalized];
  if (!featureKey) {
    return true;
  }

  return isFeatureEnabled(featureKey);
}

export function getColor(path, fallback = "#99AAB5") {
  
  if (typeof path === "number") return path;
  if (typeof path === "string" && path.startsWith("#")) {
    
    return parseInt(path.replace("#", ""), 16);
  }
  const result = path
    .split(".")
    .reduce(
      (obj, key) => (obj && obj[key] !== undefined ? obj[key] : fallback),
      botConfig.embeds.colors,
    );
  
  if (typeof result === "string" && result.startsWith("#")) {
    return parseInt(result.replace("#", ""), 16);
  }
  return result;
}

export function getRandomColor() {
  const colors = Object.values(botConfig.embeds.colors).flatMap((color) =>
    typeof color === "string" ? color : Object.values(color),
  );
  return colors[Math.floor(Math.random() * colors.length)];
}

export default botConfig;
