import { initialiseOsuApi, getOsuApi } from "../_shared/core/apis.js"
import { loadBeatmaps, findBeatmap } from "../_shared/core/beatmaps.js"
import { delay, getModDetails } from "../_shared/core/utils.js"
import { createTosuWsSocket } from "../_shared/core/websocket.js"

// Load beatmaps
let allBeatmaps = []
async function getBeatmaps() {
    const data = await loadBeatmaps()
    allBeatmaps = data.beatmaps
}

initialiseOsuApi()
getBeatmaps()

// Player Names
const leftProfilePictureEl = document.getElementById("left-profile-picture")
const rightProfilePictureEl = document.getElementById("right-profile-picture")
const leftPlayerNameEl = document.getElementById("left-player-name")
const rightPlayerNameEl = document.getElementById("right-player-name")
let currentLeftPlayer, currentRightPlayer

// Now Playing
const nowPlayingBackgroundEl = document.getElementById("now-playing-background")
let nowPlayingId, nowPlayingChecksum
let updateStats

// Now Playing Stats
const nowPlayingStatNumberSrEl = document.getElementById("now-playing-stat-number-sr")
const nowPlayingStatNumberBpmEl = document.getElementById("now-playing-stat-number-bpm")
const nowPlayingStatNumberCsEl = document.getElementById("now-playing-stat-number-cs")
const nowPlayingStatNumberArEl = document.getElementById("now-playing-stat-number-ar")
const nowPlayingStatNumberOdEl = document.getElementById("now-playing-stat-number-od")
let cs, ar, od, bpm, len, mod

/**
 * Handles incoming websocket messages from Tosu.
 *
 * Updates player information when the left/right team names change
 * Updates now playing background when the beatmap changes.
 *
 * @param {MessageEvent<string>} event - Websocket message event containing JSON data.
 * @returns {Promise<void>}
 */
const socket = createTosuWsSocket()
socket.onmessage = async event => {
    const data = JSON.parse(event.data)
    console.log(data)

    // Player information
    if (currentLeftPlayer !== data.tourney.team.left) {
        currentLeftPlayer = data.tourney.team.left
        setPlayerDetails(currentLeftPlayer, leftPlayerNameEl, leftProfilePictureEl)
    }
    if (currentRightPlayer !== data.tourney.team.right) {
        currentRightPlayer = data.tourney.team.right
        setPlayerDetails(currentRightPlayer, rightPlayerNameEl, rightProfilePictureEl)
    }

    // Now Playing Information
    if ((nowPlayingId !== data.beatmap.id || nowPlayingChecksum !== data.beatmap.checksum && allBeatmaps)) {
        nowPlayingId = data.beatmap.id
        nowPlayingChecksum = data.beatmap.checksum
        updateStats = true
 
        const bg = data.directPath.beatmapBackground
            .replace(/\\/g, "/")
            // eslint-disable-next-line no-control-regex
            .replace(/[\u0000-\u001F\u007F]/g, "")
        nowPlayingBackgroundEl.style.backgroundImage = `url("http://127.0.0.1:24050/Songs/${bg}")`

        // Current Map
        const currentMap = findBeatmap(nowPlayingId)
        if (currentMap) {
            updateStats = false;
            [cs, ar, od, bpm, len, mod] = getModDetails(currentMap.diff_size, currentMap.diff_approach, currentMap.diff_overall, currentMap.bpm, currentMap.total_length, currentMap.mod === "PS"? currentMap.extra_mod : currentMap.mod)
            
            nowPlayingStatNumberSrEl.textContent = Number(currentMap.difficultyrating).toFixed(2)
            nowPlayingStatNumberBpmEl.textContent = bpm
            nowPlayingStatNumberCsEl.textContent = cs
            nowPlayingStatNumberArEl.textContent = ar
            nowPlayingStatNumberOdEl.textContent = od
        }

        // Update stats
        if (updateStats) {
            await delay(250)
        }
    }

    if (updateStats) {
        updateStats = false
        nowPlayingStatNumberSrEl.textContent = data.beatmap.stats.stars.total.toFixed(2)
        nowPlayingStatNumberBpmEl.textContent = Math.round(data.beatmap.stats.bpm.common)
        nowPlayingStatNumberCsEl.textContent = data.beatmap.stats.cs.converted.toFixed(2)
        nowPlayingStatNumberArEl.textContent = data.beatmap.stats.ar.converted.toFixed(2)
        nowPlayingStatNumberOdEl.textContent = data.beatmap.stats.od.converted.toFixed(2)
    }
}

/**
 * Fetches and updates a player's displayed name and profile picture.
 *
 * If the player name is empty, clears the UI elements instead.
 *
 * @param {string} currentPlayer - The player name to look up.
 * @param {HTMLElement | null} playerNameEl - Element used to display the player's name.
 * @param {HTMLElement | null} profilePictureEl - Element used to display the player's profile picture.
 * @returns {Promise<void>}
 */
async function setPlayerDetails(currentPlayer, playerNameEl, profilePictureEl) {
    if (currentPlayer === "") {
        playerNameEl.textContent = ""
        profilePictureEl.style.backgroundImage = "url()"
        return
    }

    try {
        const response = await fetch(`https://fairybread-cloud-vps.chickenkiller.com/api/get_user?k=${getOsuApi()}&u=${currentPlayer}`);
        if (!response.ok) { throw new Error(`Response status: ${response.status}`); }
        const result = await response.json();

        playerNameEl.textContent = result[0].username
        profilePictureEl.style.backgroundImage = `url("https://a.ppy.sh/${result[0].user_id}")`
    } catch(error) {
        console.error(error.message);
    }
}