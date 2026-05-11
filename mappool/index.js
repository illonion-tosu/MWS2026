import { initialiseOsuApi, getOsuApi } from "../_shared/core/apis.js"
import { loadBeatmaps, findBeatmap } from "../_shared/core/beatmaps.js"
import { delay, getModDetails } from "../_shared/core/utils.js"
import { createTosuWsSocket } from "../_shared/core/websocket.js"

const mappoolContainerLeftEl = document.getElementById("mappool-container-left")
const mappoolContainerRightEl = document.getElementById("mappool-container-right")
const chatDisplayEl = document.getElementById("chat-display")
let allBeatmaps = []
/**
 * Loads beatmaps into allBeatmaps variable
 */
async function getBeatmaps() {
    const data = await loadBeatmaps()
    allBeatmaps = data.beatmaps
    console.log(allBeatmaps.length)

    let i = 0
    for (i; i < Math.min(allBeatmaps.length, 8); i++) {
        mappoolContainerLeftEl.append(createTile(allBeatmaps[i]))
    }
    for (i; i < allBeatmaps.length; i++) {
        mappoolContainerRightEl.append(createTile(allBeatmaps[i]))
    }

    // Check if chat display needs to be adjusted
    if (mappoolContainerRightEl.childElementCount >= 14) {
        chatDisplayEl.style.gridColumn = "3 / 5"
    }
}

/**
 * Creates a DOM element representing a beatmap tile
 * 
 * @param {Object} beatmapInfo - The data object containing beatmap details
 * @param {string} beatmapInfo.beatmapset_id - Beatmapset ID
 * @param {string} beatmapInfo.mod - The mod acronym
 * @param {number} beatmapInfo.order - The sequence number within the mod group
 * @param {string} beatmapInfo.artist - Name of song artyist
 * @param {string} beatmapInfo.title - Title of song
 * @param {string} beatmapInfo.version - Difficulty name
 * 
 * @returns {HTMLDivElement} A 'map-tile' div element containing the background,
 * overlay, mod ID, ingredient icon, and metadata text
 */
function createTile(beatmapInfo) {
    // Map Tile
    const mapTile = document.createElement("div")
    mapTile.classList.add("map-tile")

    // Map background
    const mapBackground = document.createElement("div")
    mapBackground.classList.add("map-background")
    mapBackground.style.backgroundImage = `url("https://assets.ppy.sh/beatmaps/${beatmapInfo.beatmapset_id}/covers/cover.jpg")`

    const imageOverlay = document.createElement("div")
    imageOverlay.classList.add("image-overlay")

    const pickBanBorder = document.createElement("div")
    pickBanBorder.classList.add("pick-ban-border")

    const mapModId = document.createElement("div")
    mapModId.classList.add("map-mod-id", `map-mod-${beatmapInfo.mod.toLowerCase()}`)
    mapModId.textContent = `${beatmapInfo.mod}${beatmapInfo.order}`
    
    // Ingredient
    const ingredient = document.createElement("img")
    ingredient.classList.add("ingredient")
    ingredient.setAttribute("src", "static/ingredients/ingredient-1.png")

    // Metadata
    const mapMetadata = document.createElement("div")
    mapMetadata.classList.add("map-metadata")
    mapMetadata.textContent = `${beatmapInfo.artist} - ${beatmapInfo.title} [${beatmapInfo.version}]`

    // Append everything together
    mapBackground.append(imageOverlay, pickBanBorder, mapModId)
    mapTile.append(mapBackground, ingredient, mapMetadata)

    // Map Tile
    mapTile.addEventListener("mousedown", mapClickEvent)
    mapTile.addEventListener("contextmenu", event => event.preventDefault())

    return mapTile
}

// Map Click Event
function mapClickEvent(event) {
    // Team
    let team
    if (event.button === 0) team = "red"
    else if (event.button === 2) team = "blue"
    if (!team) return

    // Action
    let action = "pick"
    if (event.ctrlKey) action = "ban"
    if (event.altKey) action = "clear"

    const pickBanBorder = this.children[0].children[1]
    pickBanBorder.classList.remove("pick-border")
    pickBanBorder.classList.remove("ban-border")

    if (action === "clear") return
    else if (action === "pick") pickBanBorder.classList.add("pick-border")
    else if (action === "ban") pickBanBorder.classList.add("ban-border")
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
let cs, ar, od, bpm

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
            [cs, ar, od, bpm] = getModDetails(currentMap.diff_size, currentMap.diff_approach, currentMap.diff_overall, currentMap.bpm, currentMap.total_length, currentMap.mod === "PS"? currentMap.extra_mod : currentMap.mod)
            
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