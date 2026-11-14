// Music-driven presence: shows the currently playing track on the bot's profile
// and reverts to the default presence once nothing is playing.
//
// The bot account has a single global presence, so when several guilds play at
// once we surface the most recently started track and report how many guilds
// are active via the {count} placeholder.

import { logger } from '../../utils/logger.js';
import botConfig, { resolvePresence, resolveMusicPresence } from '../../config/bot.js';

// guildId -> { guildId, title, author, requester, guildName, artwork, startedAt }
const nowPlaying = new Map();

// Signature of the last presence we pushed. Guards against redundant gateway
// updates and makes double-fired stop events (destroy + playerDisconnect)
// harmless.
let lastAppliedKey = null;

function applyPresence(client, presence, key, { force = false } = {}) {
    if (!client?.user) {
        return;
    }
    if (!force && key === lastAppliedKey) {
        return;
    }

    try {
        client.user.setPresence(presence);
        lastAppliedKey = key;
    } catch (error) {
        logger.error('Failed to update music presence:', error);
    }
}

// Recomputes and applies the presence based on the currently tracked tracks.
export function refreshNowPlayingPresence(client, { force = false } = {}) {
    if (!client?.user) {
        return;
    }

    const entries = [...nowPlaying.values()];

    if (!entries.length) {
        applyPresence(client, resolvePresence(client), 'default', { force });
        return;
    }

    const current = entries[entries.length - 1];
    applyPresence(
        client,
        resolveMusicPresence(client, current, entries.length),
        `music:${current.guildId}:${current.title}:${current.startedAt}`,
        { force },
    );
}

// Called on trackStart. Records the track and switches the profile to it.
export function registerNowPlaying(client, player, track) {
    if (!botConfig.presence?.music?.enabled) {
        return;
    }

    const guildId = player?.guildId;
    if (!guildId || !track?.info) {
        return;
    }

    const guild = client.guilds.cache.get(guildId);
    const requester = track.info.requester;

    nowPlaying.set(guildId, {
        guildId,
        title: track.info.title || 'Unknown',
        author: track.info.author || 'Unknown',
        requester: requester?.username || requester?.tag || 'Unknown',
        guildName: guild?.name || 'Unknown',
        artwork: track.info.artworkUrl || track.info.thumbnail || '',
        startedAt: Date.now(),
    });

    refreshNowPlayingPresence(client);
}

// Called when a guild stops (queue end / stop / leave). If other guilds are
// still playing, the presence falls back to one of them.
export function unregisterNowPlaying(client, guildId) {
    if (!nowPlaying.delete(guildId)) {
        return;
    }

    refreshNowPlayingPresence(client);
}
