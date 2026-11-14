import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { getPaginationRow } from '../../utils/components.js';

const QUEUE_PAGE_SIZE = 10;

export const MUSIC_BUTTON_IDS = {
    PAUSE: 'music_pause',
    RESUME: 'music_resume',
    SKIP: 'music_skip',
    STOP: 'music_stop',
    SHUFFLE: 'music_shuffle',
    LOOP: 'music_loop',
    VOL_DOWN: 'music_vol_down',
    VOL_UP: 'music_vol_up',
    QUEUE: 'music_queue',
    QUEUE_FIRST: 'music_queue_first',
    QUEUE_PREV: 'music_queue_prev',
    QUEUE_NEXT: 'music_queue_next',
    QUEUE_LAST: 'music_queue_last',
};

export function formatDuration(ms) {
    if (!ms || Number.isNaN(ms)) {
        return 'Live';
    }
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function getTrackArtwork(track) {
    return track?.info?.artworkUrl || track?.info?.thumbnail || null;
}

// Block characters (not emoji) so the embed text sanitizer keeps them intact.
function buildProgressBar(current, total, size = 14) {
    if (!total || Number.isNaN(total)) {
        return '░'.repeat(size);
    }
    const ratio = Math.min(Math.max(current / total, 0), 1);
    const filled = Math.round(size * ratio);
    return `${'█'.repeat(filled)}${'░'.repeat(size - filled)}`;
}

function buildTitleLine(info) {
    const title = info?.title || 'Unknown track';
    return info?.uri ? `[**${title}**](${info.uri})` : `**${title}**`;
}

function getRequesterLabel(requester) {
    return requester ? (requester.username || requester.tag || 'Unknown') : 'Unknown';
}

function getLoopLabel(loop) {
    switch (loop) {
        case 'track':
            return 'Track';
        case 'queue':
            return 'Queue';
        default:
            return 'Off';
    }
}

export function buildNowPlayingEmbed(track, player, guildData) {
    const info = track?.info || {};
    const position = player?.position || 0;
    const duration = info.length || 0;
    const status = player?.paused ? 'Paused' : (player?.playing ? 'Playing' : 'Idle');

    return createEmbed({
        title: 'Now Playing',
        description: [
            buildTitleLine(info),
            `${buildProgressBar(position, duration)} \`${formatDuration(position)} / ${formatDuration(duration)}\``,
        ].join('\n'),
        color: player?.paused ? 'warning' : 'primary',
        fields: [
            { name: 'Artist', value: info.author || 'Unknown', inline: true },
            { name: 'Requester', value: getRequesterLabel(info.requester), inline: true },
            { name: 'Status', value: status, inline: true },
            { name: 'Volume', value: `${guildData?.volume ?? 75}%`, inline: true },
            { name: 'Loop', value: getLoopLabel(guildData?.loop), inline: true },
            { name: 'Queue', value: `${player?.queue?.length || 0} track(s)`, inline: true },
        ],
        thumbnail: getTrackArtwork(track),
    });
}

export function buildAddedTrackEmbed(track, { position = null, playNow = false } = {}) {
    const info = track?.info || {};
    const fields = [
        { name: 'Artist', value: info.author || 'Unknown', inline: true },
        { name: 'Duration', value: formatDuration(info.length || 0), inline: true },
        { name: 'Requester', value: getRequesterLabel(info.requester), inline: true },
    ];
    if (!playNow && position != null) {
        fields.push({ name: 'Position', value: `#${position} in queue`, inline: true });
    }

    return createEmbed({
        title: playNow ? 'Now Playing' : 'Added to Queue',
        description: buildTitleLine(info),
        color: playNow ? 'primary' : 'success',
        fields,
        thumbnail: getTrackArtwork(track),
    });
}

export function buildPlaylistAddedEmbed(playlistInfo, { added = 0, total = 0, skipped = 0 } = {}) {
    return createEmbed({
        title: 'Playlist Added',
        description: `**${playlistInfo?.name || 'Playlist'}**`,
        color: 'success',
        fields: [
            { name: 'Added', value: `${added} track(s)`, inline: true },
            { name: 'Requested', value: `${total} track(s)`, inline: true },
            { name: 'Skipped', value: `${skipped} duplicate(s)`, inline: true },
        ],
    });
}

export function buildQueueEmbed(queue, currentTrack, page = 0) {
    const tracks = Array.from(queue || []);
    const totalTracks = tracks.length;
    const totalPages = Math.max(1, Math.ceil(totalTracks / QUEUE_PAGE_SIZE));
    const safePage = Math.min(Math.max(page, 0), totalPages - 1);
    const start = safePage * QUEUE_PAGE_SIZE;
    const slice = tracks.slice(start, start + QUEUE_PAGE_SIZE);
    const totalDuration = tracks.reduce((sum, track) => sum + (track?.info?.length || 0), 0);

    const lines = [];
    if (currentTrack) {
        const info = currentTrack.info || {};
        lines.push(
            '**Now Playing**',
            `> ${buildTitleLine(info)} — ${info.author || 'Unknown'} \`${formatDuration(info.length || 0)}\``,
            '',
        );
    }

    if (slice.length === 0) {
        lines.push('*The queue is empty.*');
    } else {
        slice.forEach((track, index) => {
            const info = track?.info || {};
            lines.push(`${start + index + 1}. ${buildTitleLine(info)} — ${info.author || 'Unknown'} \`${formatDuration(info.length || 0)}\``);
        });
    }

    return createEmbed({
        title: 'Music Queue',
        description: lines.join('\n').substring(0, 4096),
        color: 'info',
        thumbnail: getTrackArtwork(currentTrack),
        footer: `Page ${safePage + 1} of ${totalPages} • ${totalTracks} queued • ${formatDuration(totalDuration)} total`,
    });
}

export function buildPlayerButtonRows(player, guildData) {
    const paused = player?.paused;
    const loopMode = guildData?.loop || 'none';

    // Row 1 — transport controls (play state, skip, stop)
    const transportRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(MUSIC_BUTTON_IDS.PAUSE)
            .setLabel('Pause')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('⏸️')
            .setDisabled(Boolean(paused)),
        new ButtonBuilder()
            .setCustomId(MUSIC_BUTTON_IDS.RESUME)
            .setLabel('Resume')
            .setStyle(ButtonStyle.Success)
            .setEmoji('▶️')
            .setDisabled(!paused),
        new ButtonBuilder()
            .setCustomId(MUSIC_BUTTON_IDS.SKIP)
            .setLabel('Skip')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('⏭️'),
        new ButtonBuilder()
            .setCustomId(MUSIC_BUTTON_IDS.STOP)
            .setLabel('Stop')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('⏹️'),
    );

    // Row 2 — queue & audio settings
    const settingsRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(MUSIC_BUTTON_IDS.SHUFFLE)
            .setLabel('Shuffle')
            .setStyle(guildData?.shuffle ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setEmoji('🔀'),
        new ButtonBuilder()
            .setCustomId(MUSIC_BUTTON_IDS.LOOP)
            .setLabel(`Loop: ${getLoopLabel(loopMode)}`)
            .setStyle(loopMode !== 'none' ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setEmoji('🔁'),
        new ButtonBuilder()
            .setCustomId(MUSIC_BUTTON_IDS.VOL_DOWN)
            .setLabel('Vol -')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🔉'),
        new ButtonBuilder()
            .setCustomId(MUSIC_BUTTON_IDS.VOL_UP)
            .setLabel('Vol +')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🔊'),
        new ButtonBuilder()
            .setCustomId(MUSIC_BUTTON_IDS.QUEUE)
            .setLabel('Queue')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📋'),
    );

    return [transportRow, settingsRow];
}

export function buildQueuePaginationRow(page, totalPages) {
    return getPaginationRow('music_queue', page + 1, totalPages);
}

export function getQueuePageSize() {
    return QUEUE_PAGE_SIZE;
}
