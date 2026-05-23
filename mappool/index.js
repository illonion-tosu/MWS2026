import { initialiseOsuApi, getOsuApi } from "../_shared/core/apis.js"
import { loadBeatmaps, findBeatmap } from "../_shared/core/beatmaps.js"
import { updateChat } from "../_shared/core/chat.js"
import { setDefaultStarCount, updateStarCount } from "../_shared/core/stars.js"
import { delay, getModDetails } from "../_shared/core/utils.js"
import { createTosuWsSocket } from "../_shared/core/websocket.js"

// Player Scores
const leftPlayerScoreEl = document.getElementById("left-player-score")
const rightPlayerScoreEl = document.getElementById("right-player-score")

// Mappool Container Sections
const mappoolContainerLeftEl = document.getElementById("mappool-container-left")
const mappoolContainerRightEl = document.getElementById("mappool-container-right")
const chatDisplayEl = document.getElementById("chat-display")
let allBeatmaps = [], currentMap
/**
 * Loads beatmaps into allBeatmaps variable
 */
async function getBeatmaps() {
    const data = await loadBeatmaps()
    allBeatmaps = data.beatmaps

    let i = 0
    for (i; i < Math.min(allBeatmaps.length, 8); i++) {
        createTile(allBeatmaps[i]).then(mapTile => {
            mappoolContainerLeftEl.append(mapTile)
        })
    }
    for (i; i < allBeatmaps.length; i++) {
        createTile(allBeatmaps[i]).then(mapTile => {
            mappoolContainerRightEl.append(mapTile)
        })
    }

    // Check if chat display needs to be adjusted
    if (mappoolContainerRightEl.childElementCount >= 14) {
        chatDisplayEl.style.gridColumn = "3 / 5"
    }

    // Set default star count
    let bestOf
    switch (data.roundName) {
        case "RO64": case "RO32": case "RO16":
            bestOf = 9
            break
        case "QF": case "SF":
            bestOf = 11
            break
        default:
            bestOf = 13
    }
    setDefaultStarCount(bestOf, leftPlayerScoreEl, rightPlayerScoreEl, "mappool")
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
async function createTile(beatmapInfo) {
    // Map Tile
    const mapTile = document.createElement("div")
    mapTile.classList.add("map-tile")

    // Map background
    const mapBackground = document.createElement("div")
    mapBackground.classList.add("map-background")

    // Find image and set background image
    const folderName = `${beatmapInfo.beatmapset_id} ${beatmapInfo.artist} - ${beatmapInfo.title}`;
    const encodedFolder = encodeURIComponent(folderName);
    const finalUrl = `http://127.0.0.1:24050/Songs/${encodedFolder}/`
    const image = await findImage(finalUrl)

    if (image) {
        mapBackground.style.backgroundImage = `url("${image}")`
    } else {
        mapBackground.style.backgroundImage = `url("https://assets.ppy.sh/beatmaps/${beatmapInfo.beatmapset_id}/covers/cover.jpg")`
    }
    
    // Image overlay
    const imageOverlay = document.createElement("div")
    imageOverlay.classList.add("image-overlay")

    // Pick ban border
    const pickBanBorder = document.createElement("div")
    pickBanBorder.classList.add("pick-ban-border")

    // Map mod id
    const mapModId = document.createElement("div")
    mapModId.classList.add("map-mod-id", `map-mod-${beatmapInfo.mod.toLowerCase()}`)
    mapModId.textContent = `${beatmapInfo.mod}${beatmapInfo.order}`
    
    // Ingredient
    const ingredientImg = document.createElement("img")
    ingredientImg.classList.add("ingredient")
    let ingredient
    switch (beatmapInfo.mod) {
        case "NM":
            ingredient = "egg"
            break
        case "PS":
            ingredient = "sugar"
            break
        case "HR":
            ingredient = "butter"
            break
        case "DT":
            ingredient = "flour"
            break
        case "FM":
            ingredient = "milk"
            break
        default:
            ingredient
    }
    if (beatmapInfo.mod !== "TB") {
        ingredientImg.setAttribute("src", `static/ingredients/${ingredient}.png`)
    }

    // Metadata
    const mapMetadata = document.createElement("div")
    mapMetadata.classList.add("map-metadata")
    mapMetadata.textContent = `${beatmapInfo.artist} - ${beatmapInfo.title} [${beatmapInfo.version}]`

    // Append everything together
    mapBackground.append(imageOverlay, pickBanBorder, mapModId)
    mapTile.append(mapBackground, ingredientImg, mapMetadata)

    // Map Tile
    mapTile.addEventListener("mousedown", mapClickEvent)
    mapTile.addEventListener("contextmenu", event => event.preventDefault())

    return mapTile
}

/**
 * Scans a single directory URL and stops after finding the first image.
 * @param {string} url - The URL of the directory to scan.
 */
async function findImage(url) {
    try {
        const response = await fetch(url)
        const text = await response.text()

        const parser = new DOMParser()
        const htmlDoc = parser.parseFromString(text, "text/html")
        const links = Array.from(htmlDoc.querySelectorAll("a"))

        // Find the image
        for (const link of links) {
            const href = link.getAttribute("href")
            if (href === "../" || href.startsWith("?")) continue
            const fullPath = new URL(href, url).href

            if (href.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
                console.log("First Image Found:", fullPath)
                return fullPath
            }
        }
        
        console.log("No images found in this directory.")
    } catch (err) {
        console.error("Could not read directory:", url, err)
    }
}

/**
 * Handles map selection logic based on mouse clicks and modifier keys.
 *
 * @param {MouseEvent} event - The mouse event triggered by the user.
 * @this {HTMLElement} - The map element that received the click.
 */
function mapClickEvent(event) {
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

// Chat Display
const chatDisplayContainerEl = document.getElementById("chat-display-container")
let chatLen

// IPC State
let ipcState, setWinner = false

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
    const teamInfo = data.tourney.team
    if (currentLeftPlayer !== teamInfo.left) {
        currentLeftPlayer = teamInfo.left
        setPlayerDetails(currentLeftPlayer, leftPlayerNameEl, leftProfilePictureEl)
    }
    if (currentRightPlayer !== teamInfo.right) {
        currentRightPlayer = teamInfo.right
        setPlayerDetails(currentRightPlayer, rightPlayerNameEl, rightProfilePictureEl)
    }

    // Now Playing Information
    const beatmapData = data.beatmap
    if ((nowPlayingId !== beatmapData.id || nowPlayingChecksum !== beatmapData.checksum && allBeatmaps)) {
        nowPlayingId = beatmapData.id
        nowPlayingChecksum = beatmapData.checksum
        updateStats = true
 
        const bg = data.directPath.beatmapBackground
            .replace(/\\/g, "/")
            // eslint-disable-next-line no-control-regex
            .replace(/[\u0000-\u001F\u007F]/g, "")

        nowPlayingBackgroundEl.style.backgroundImage = `url("http://127.0.0.1:24050/Songs/${bg}")`

        // Current Map
        currentMap = findBeatmap(nowPlayingId)
        if (currentMap) {
            updateStats = false;
            const { cs, ar, od, bpm } = getModDetails(currentMap.diff_size, currentMap.diff_approach, currentMap.diff_overall, currentMap.bpm, currentMap.total_length, currentMap.mod === "PS"? currentMap.extra_mod : currentMap.mod)
            
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

    // Update stats if not from mappool
    if (updateStats) {
        const stats = data.beatmap.stats
        updateStats = false
        nowPlayingStatNumberSrEl.textContent = stats.stars.total.toFixed(2)
        nowPlayingStatNumberBpmEl.textContent = Math.round(stats.bpm.common)
        nowPlayingStatNumberCsEl.textContent = stats.cs.converted.toFixed(2)
        nowPlayingStatNumberArEl.textContent = stats.ar.converted.toFixed(2)
        nowPlayingStatNumberOdEl.textContent = stats.od.converted.toFixed(2)
    }

    // Chat Display
    const chatData = data.tourney.chat
    if (chatLen !== chatData.length) {
        chatLen = updateChat(chatLen, chatData, chatDisplayContainerEl)
    }

    // IPC State
    if (data.tourney.ipcState !== ipcState) {
        ipcState = data.tourney.ipcState
        setWinner = true
        if (ipcState === 4) {
            setWinner = false
        }
    }

    // Check winner
    if (ipcState === 4 && (currentMap || redPlayerManager.activeRecipe === 21 || bluePlayerManager.activeRecipe === 21) && setWinner) {
        setWinner = true

        // Get scores
        let currentActiveRecipe = redPlayerManager.activeRecipe ?? bluePlayerManager.activeRecipe ?? null
        const scores = calculateScore(currentActiveRecipe, data.tourney.clients[0].play, data.tourney.clients[1].play, "red")
        
        // Determine if a winner is to be set
        let requiredToSetWinner = true
        if (currentActiveRecipe === 16) {
            if (Math.abs(scores.redFinalScore - scores.blueFinalScore) <= 10000) requiredToSetWinner = false
        } else if (currentActiveRecipe === 7) {
            if (redPlayerManager.activeRecipe === 7) {
                redPlayerManager.mapsRemaining--
                if (redPlayerManager.mapsRemaining > 0) {
                    requiredToSetWinner = false
                    redPlayerManager.savedScore = scores.redFinalScore
                }
            }
            else if (bluePlayerManager.activeRecipe === 7) {
                bluePlayerManager.mapsRemaining--
                if (bluePlayerManager.mapsRemaining > 0) {
                    requiredToSetWinner = false
                    bluePlayerManager.savedScore = scores.blueFinalScore
                }
            }
        }

        // For Active Recipe 7 only, set scores
        if (currentActiveRecipe === 7 && bluePlayerManager.savedScore === 0 && redPlayerManager.savedScore === 0) {
            bluePlayerManager.savedSCore = scores.blueFinalScore
            redPlayerManager.savedSCore = scores.redFinalScore
        }

        // Set winner
        if (requiredToSetWinner && currentActiveRecipe !== 21) {
            let winner
            if (currentActiveRecipe === 7) {
                const maxScore = Math.max(bluePlayerManager.savedScore, redPlayerManager.savedScore, scores.redFinalScore, scores.blueFinalScore)
                winner = (bluePlayerManager.savedScore === maxScore || scores.blueFinalScore === maxScore) ? "blue" : "red"
            } else {
                winner = scores.blueFinalScore > scores.redFinalScore
            }

            // Consume recipes at the end
            redPlayerManager.consumeRecipe()
            bluePlayerManager.consumeRecipe()

            // RECIPE APPLICATION SECTION (determining which recipes to give to people)
            // Give ingredients based on win
            let winnerPlayerManager = winner === "red" ? redPlayerManager : bluePlayerManager
            addIngredient(winnerPlayerManager, currentMap.mod)
            // Handles 24 - Shortbread
            if (winnerPlayerManager.activeRecipe === 24) {
                addIngredient(winnerPlayerManager, currentMap.mod)
            }

            // Give ingredients based on home base ingredient
            handleHomeBaseCondition(redPlayerManager)
            handleHomeBaseCondition(bluePlayerManager)

            // 23 Hot chocolate
            handleHotChocolateCondition(redPlayerManager, currentMap.mod)
            handleHotChocolateCondition(bluePlayerManager, currentMap.mod)
        }
    }
}

/**
 * Handles adding of ingredients based on hot chocolate 
 * @param {PlayerManager} playerManager - Player Manager
 * @param {string} currentMapMod - Mod of current map
 */
function handleHotChocolateCondition(playerManager, currentMapMod) {
    if (playerManager.mod !== currentMapMod && playerManager.activeRecipe === 23) {
        addIngredient(playerManager, playerManager.mod)
    }
}

/**
 * Handles adding of ingredients based on home base mod
 * @param {PlayerManager} playerManager - Player Manager
 * @param {string} currentMapMod - Mod of current map
 */
function handleHomeBaseCondition(playerManager, currentMapMod) {
    if (playerManager.mod === currentMapMod) {
        addIngredient(playerManager, playerManager.mod)
    }
}

/**
 * Adds ingredients to player manager
 * @param {playerManager} playerManager  - Player Manager
 * @param {string} mod - Mod to be checked against
 */
function addIngredient(playerManager, mod) {
    if (mod === "NM") playerManager.addIngredient("egg", 1)
    if (mod === "HR") playerManager.addIngredient("sugar", 1)
    if (mod === "PS") playerManager.addIngredient("butter", 1)
    if (mod === "DT") playerManager.addIngredient("flour", 1)
    if (mod === "FM") playerManager.addIngredient("milk", 1)
}

/**
 * Fetches and updates a player's displayed name and profile picture.
 *
 * If the player name is empty, clears the UI elements instead.
 *
 * @param {string} currentPlayer - The player name to look up.
 * @param {HTMLElement} playerNameEl - Element used to display the player's name.
 * @param {HTMLElement} profilePictureEl - Element used to display the player's profile picture.
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
        console.error(error.message)
    }
}

/**
 * Updates the next auto picker
 * 
 * @param {string} team - The current side that will be assigned as the next picker
 */
const nextAutopickerEl = document.getElementById("next-auto-picker-team")
let nextPicker
function updateNextAutoPicker(team) {
    nextAutopickerEl.innerText = team === "red" ? "Red" : "Blue"
    nextPicker = team
}

/**
 * Toggles autopick on and off
 */
const toggleAutopickEl = document.getElementById("toggle-autopick")
let isAutopickOn = false
function toggleAutopick() {
    isAutopickOn = !isAutopickOn
    toggleAutopickEl.innerText = `Toggle Autopick: ${isAutopickOn? "ON" : "OFF"}`
}

class PlayerManager {
    constructor(color, ingredientListEl, ingredientDisplayEl, mod) {
        this.color = color
        this.ingredientListEl = ingredientListEl
        this.ingredientDisplayEl = ingredientDisplayEl
        this.ingredients = {
            egg: 0,
            sugar: 0,
            butter: 0,
            flour: 0,
            milk: 0
        }
        this.activeRecipe = null
        this.savedScore = 0
        this.mod = mod

        this.mapsRemaining = 0
        this.condition = null
    }

    /**
     * @param {Object} recipe - The recipe JSON
     * @param {number|string} duration - A number (maps) or string (condition name)
     */
    craftRecipe(recipe, duration = 1) {
        // Ingredients draining
        const costs = recipe.data_points
        for (const [ing, cost] of Object.entries(costs)) {
            this.ingredients[ing] = Math.max(0, this.ingredients[ing] - (cost || 0))
        }

        this.activeRecipe = recipe

        if (typeof duration === 'number') {
            this.mapsRemaining = duration
            this.condition = null
        } else {
            this.mapsRemaining = Infinity
            this.condition = duration
        }

        console.log(`${this.color.toUpperCase()} crafted ${recipe.recipe}. Duration: ${duration}`)
    }

    /**
     * Clears the active recipe after it has been used in a map
     */
    consumeRecipe() {
        const used = this.activeRecipe
        this.activeRecipe = null
        this.mapsRemaining = 0
        this.condition = null
        this.savedScore = 0
        return used
    }

    /**
     * Display Ingredient List
     */
    displayIngredientList() {
        // Display text on the side
        const ingredientsText = Object.entries(this.ingredients).map(([ingredient, amount]) => `${ingredient.charAt(0).toUpperCase()}${ingredient.slice(1)}: ${amount}`).join('<br>')
        this.ingredientListEl.innerHTML = ingredientsText

        // Display images
        this.ingredientDisplayEl.innerHTML = ""
        let imagesHTML = document.createDocumentFragment()
        for (const [ingredient, amount] of Object.entries(this.ingredients)) {
            for (let i = 0; i < amount; i++) {
                const image = document.createElement("img")
                image.setAttribute("src", `static/ingredients/${ingredient}.png`)
                imagesHTML.append(image)
            }
        }
        this.ingredientDisplayEl.append(imagesHTML)
    }

    /**
     * Adds the amount to the ingredient
     * 
     * @param {string} ingredient - name of ingredient
     * @param {number} amount -amount to add
     */
    addIngredient(ingredient, amount) {
        this.ingredients[ingredient] += amount
        this.displayIngredientList()
    }

    /**
     * Minuses the amount to the ingredient
     * 
     * @param {string} ingredient - name of ingredient
     * @param {number} amount -amount to add
     */
    subtractIngredient(ingredient, amount) {
        this.ingredients[ingredient] = Math.max(0, this.ingredients[ingredient] - amount)
        this.displayIngredientList()
    }
}

// Ingredient Lists
const redIngredientsEl = document.getElementById("red-ingredients")
const blueIngredientsEl = document.getElementById("blue-ingredients")
// Ingredients Display
const leftIngredientsDisplayEl = document.getElementById("left-ingredients-display")
const rightIngredientsDisplayEl = document.getElementById("right-ingredients-display")

// Player Managers
const redPlayerManager = new PlayerManager("red", redIngredientsEl, leftIngredientsDisplayEl, "HD")
const bluePlayerManager = new PlayerManager("blue", blueIngredientsEl, rightIngredientsDisplayEl, "HR")
redPlayerManager.displayIngredientList()
bluePlayerManager.displayIngredientList()

// Select elements
const whichActionEl = document.getElementById("which-action")
const whichTeamEl = document.getElementById("which-team")
const whichIngredientEl = document.getElementById("which-ingredient")

/**
 * Toggles autopick on and off
 */
function applyChanges() {
    whichActionEl.value
    whichTeamEl.value
    whichIngredientEl.value

    // Set Team
    let team
    if (whichTeamEl.value === "red") {
        team = redPlayerManager
    } else if (whichTeamEl.value === "blue") {
        team = bluePlayerManager
    }
    if (!team) return

    // See if ingredient exists
    if (!whichIngredientEl.value) return

    // Set Action
    if (whichActionEl.value === "add") {
        team.addIngredient(whichIngredientEl.value, 1)
    } else if (whichActionEl.value === "remove") {
        team.subtractIngredient(whichIngredientEl.value, 1)
    }
}

// Buttons
const updateStarRedMinusEl = document.getElementById("update-star-red-minus")
const updateStarRedPlusEl = document.getElementById("update-star-red-plus")
const updateStarBlueMinusEl = document.getElementById("update-star-blue-minus")
const updateStarBluePlusEl = document.getElementById("update-star-blue-plus")
const updateNextAutopickerRedEl = document.getElementById("update-next-autopicker-red")
const updateNextAutopickerBlueEl = document.getElementById("update-next-autopicker-blue")
const applyChangesEl = document.getElementById("apply-changes")
document.addEventListener("DOMContentLoaded", () => {
    updateStarRedMinusEl.addEventListener("click", () => updateStarCount("red", "minus", leftPlayerScoreEl, rightPlayerScoreEl))
    updateStarRedPlusEl.addEventListener("click", () => updateStarCount("red", "plus", leftPlayerScoreEl, rightPlayerScoreEl))
    updateStarBlueMinusEl.addEventListener("click", () => updateStarCount("blue", "minus", leftPlayerScoreEl, rightPlayerScoreEl))
    updateStarBluePlusEl.addEventListener("click", () => updateStarCount("blue", "plus", leftPlayerScoreEl, rightPlayerScoreEl))
    updateNextAutopickerRedEl.addEventListener("click", () => updateNextAutoPicker('red'))
    updateNextAutopickerBlueEl.addEventListener("click", () => updateNextAutoPicker('blue'))
    toggleAutopickEl.addEventListener("click", toggleAutopick)
    applyChangesEl.addEventListener("click", applyChanges)
})