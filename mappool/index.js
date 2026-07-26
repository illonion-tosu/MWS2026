import { initialiseOsuApi, getOsuApi } from "../_shared/core/apis.js"
import { loadBeatmaps, findBeatmap } from "../_shared/core/beatmaps.js"
import { updateChat } from "../_shared/core/chat.js"
import { calculateScore } from "../_shared/core/score-calculator.js"
import { apiIntegrationSetBestOf, apiIntegrationUpdateStars, setDefaultStarCount, updateStarCount } from "../_shared/core/stars.js"
import { getModDetails } from "../_shared/core/utils.js"
import { createTosuWsSocket } from "../_shared/core/websocket.js"

initialiseOsuApi()
getBeatmaps()
getRecipes()

/**
 * Loads recipes into recipes variable
 */
let allRecipes = []
async function getRecipes() {
    const response = await fetch("../_data/recipes.json")
    allRecipes = await response.json()
}

/**
 * Returns the recipe based on the Recipe ID
 * @param {*} id - Recipe ID
 * @returns {Object} - Recipe
 */
export function findRecipe(id) {
    return allRecipes.find(r => Number(r.id) === id)
}

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
        case "Round of 64": case "Round of 32": case "Round of 16":
            bestOf = 9
            break
        case "Quarterfinals": case "Semifinals":
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
 * @param {string} beatmapInfo.beatmap_id - Beatmap ID
 * @param {string} beatmapInfo.beatmapset_id - Beatmapset ID
 * @param {string} beatmapInfo.mod - The mod acronym
 * @param {number} beatmapInfo.order - The sequence number within the mod group
 * @param {string} beatmapInfo.artist - Name of song artist
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
    mapTile.setAttribute("id", beatmapInfo.beatmap_id)

    // Map background
    const mapBackground = document.createElement("div")
    mapBackground.classList.add("map-background")

    // Find image and set background image
    mapBackground.style.backgroundImage = `url("https://assets.ppy.sh/beatmaps/${beatmapInfo.beatmapset_id}/covers/cover.jpg")`
    
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

// Player Names
const leftProfilePictureEl = document.getElementById("left-profile-picture")
const rightProfilePictureEl = document.getElementById("right-profile-picture")
const leftPlayerNameEl = document.getElementById("left-player-name")
const rightPlayerNameEl = document.getElementById("right-player-name")
let currentLeftPlayer, currentRightPlayer

// Now Playing
const nowPlayingBackgroundEl = document.getElementById("now-playing-background")
let nowPlayingId, nowPlayingChecksum
let awaitingLiveStats = false
let liveStatsReadyAt = 0

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
 * Handles Winner information
 *
 * @param {MessageEvent<string>} event - Websocket message event containing JSON data.
 * @returns {Promise<void>}
 */
const socket = createTosuWsSocket()
socket.onmessage = async event => {
    const data = JSON.parse(event.data)

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
    if (nowPlayingId !== beatmapData.id || nowPlayingChecksum !== beatmapData.checksum) {
        nowPlayingId = beatmapData.id
        nowPlayingChecksum = beatmapData.checksum

        const bg = data.directPath.beatmapBackground
            .replace(/\\/g, "/")
            // eslint-disable-next-line no-control-regex
            .replace(/[\u0000-\u001F\u007F]/g, "")

        nowPlayingBackgroundEl.style.backgroundImage = `url("http://127.0.0.1:24050/Songs/${bg}")`

        // Current Map — use pool data if available, otherwise wait for fresh tosu stats
        currentMap = findBeatmap(nowPlayingId)
        if (currentMap) {
            awaitingLiveStats = false
            const { cs, ar, od, bpm } = getModDetails(currentMap.diff_size, currentMap.diff_approach, currentMap.diff_overall, currentMap.bpm, currentMap.total_length, currentMap.mod === "PS" ? currentMap.extra_mod : currentMap.mod)

            nowPlayingStatNumberSrEl.textContent = Number(currentMap.difficultyrating).toFixed(2)
            nowPlayingStatNumberBpmEl.textContent = bpm
            nowPlayingStatNumberCsEl.textContent = cs
            nowPlayingStatNumberArEl.textContent = ar
            nowPlayingStatNumberOdEl.textContent = od

            // Click on map
            const mapElement = document.getElementById(nowPlayingId)
            if (mapElement && isAutopickOn) {
                const clickEvent = new MouseEvent("mousedown", {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                    button: 0
                })
                mapElement.dispatchEvent(clickEvent)
            }
        } else {
            // Not in the pool: tosu's converted stats aren't settled yet on map change.
            // Defer reading them so a later message supplies fresher values.
            awaitingLiveStats = true
            liveStatsReadyAt = Date.now() + 250
        }
    }

    // Pick up fresh live stats from a later message once tosu has had time to recompute.
    if (awaitingLiveStats && Date.now() >= liveStatsReadyAt) {
        awaitingLiveStats = false
        const stats = data.beatmap.stats
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
    if (ipcState === 4 && (currentMap || redPlayerManager.activeRecipe.id === 21 || bluePlayerManager.activeRecipe.id === 21) && !setWinner) {
        console.log("do we set winner")
        setWinner = true

        // Get scores
        const isRecipe7Active = redPlayerManager.activeRecipe.id === 7 || bluePlayerManager.activeRecipe.id === 7
        const isRecipe16Active = redPlayerManager.activeRecipe.id === 16 || bluePlayerManager.activeRecipe.id === 16
        const isRecipe21Active = redPlayerManager.activeRecipe.id === 21 || bluePlayerManager.activeRecipe.id === 21
        const accRecipeActive = redPlayerManager.activeRecipe.id === 12 || bluePlayerManager.activeRecipe.id === 12
        const scores = calculateScore(redPlayerManager.activeRecipe.id, bluePlayerManager.activeRecipe.id, data.tourney.clients[0].play, data.tourney.clients[1].play)
        
        // Determine if a winner is to be set
        let requiredToSetWinner = true
        if (isRecipe7Active && !accRecipeActive) {
            if (redPlayerManager.activeRecipe.id === 7) {
                redPlayerManager.mapsRemaining--
                if (redPlayerManager.mapsRemaining > 0) {
                    requiredToSetWinner = false
                    redPlayerManager.savedScore = scores.redFinalScore
                    bluePlayerManager.savedScore = scores.blueFinalScore
                }
            }
            else if (bluePlayerManager.activeRecipe.id === 7) {
                bluePlayerManager.mapsRemaining--
                if (bluePlayerManager.mapsRemaining > 0) {
                    requiredToSetWinner = false
                    redPlayerManager.savedScore = scores.redFinalScore
                    bluePlayerManager.savedScore = scores.blueFinalScore
                }
            }
        } else if (isRecipe16Active && !accRecipeActive) {
            if (Math.abs(scores.redFinalScore - scores.blueFinalScore) <= 10000) requiredToSetWinner = false
        } 

        // For Active Recipe 7 only, set scores
        if (isRecipe7Active && bluePlayerManager.savedScore === 0 && redPlayerManager.savedScore === 0 && !accRecipeActive) {
            bluePlayerManager.savedScore = scores.blueFinalScore
            redPlayerManager.savedScore = scores.redFinalScore
        }

        // Set winner
        if (requiredToSetWinner) {
            let winner
            if (isRecipe7Active && !accRecipeActive) {
                const maxScore = Math.max(bluePlayerManager.savedScore, redPlayerManager.savedScore, scores.redFinalScore, scores.blueFinalScore)
                winner = (bluePlayerManager.savedScore === maxScore || scores.blueFinalScore === maxScore) ? "blue" : "red"
            } else {
                winner = scores.blueFinalScore > scores.redFinalScore ? "blue" : "red"
            }

            // Set the star count
            updateStarCount(winner, "plus", leftPlayerScoreEl, rightPlayerScoreEl)

            if (!isRecipe21Active) {
                // RECIPE APPLICATION SECTION (determining which recipes to give to people)
                // Give ingredients based on win
                let winnerPlayerManager = winner === "red" ? redPlayerManager : bluePlayerManager
                addIngredient(winnerPlayerManager, currentMap.mod)
            
                // Handles 24 - Shortbread
                if (winnerPlayerManager.activeRecipe.id === 24) {
                    addIngredient(winnerPlayerManager, currentMap.mod)
                }

                // Give ingredients based on home base ingredient
                handleHomeBaseCondition(redPlayerManager, currentMap.mod)
                handleHomeBaseCondition(bluePlayerManager, currentMap.mod)

                // 23 Hot chocolate
                handleHotChocolateCondition(redPlayerManager, currentMap.mod)
                handleHotChocolateCondition(bluePlayerManager, currentMap.mod)
            }

            // Consume recipes at the end
            redPlayerManager.consumeRecipe()
            bluePlayerManager.consumeRecipe()

            // Display recipe
            displayActiveRecipe()
        }
    }
}

/**
 * Handles adding of ingredients based on hot chocolate 
 * @param {PlayerManager} playerManager - Player Manager
 * @param {string} currentMapMod - Mod of current map
 */
function handleHotChocolateCondition(playerManager, currentMapMod) {
    if (playerManager.mod !== currentMapMod && playerManager.activeRecipe.id === 23) {
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
        const response = await fetch(`https://osu.ppy.sh/api/get_user?k=${getOsuApi()}&u=${currentPlayer}`);
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
// const nextAutopickerEl = document.getElementById("next-auto-picker-team")
// let nextPicker
// function updateNextAutoPicker(team) {
//     nextAutopickerEl.innerText = team === "red" ? "Red" : "Blue"
//     nextPicker = team
// }

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
        this.activeRecipe = { id: null }
        this.lastCraftedRecipe = { id: null }
        this.craftedRecipeId = null
        this.usedMagicCake = false
        this.copiedRecipeId = null
        this.opponent = null
        this.savedScore = 0
        this.mod = mod

        this.mapsRemaining = 0
        this.condition = null
    }

    /**
     * API Integration set Ingredients
     */
    apiIntegrationSetIngredients(ingredients) {
        this.ingredients = ingredients
        this.displayIngredientList()
    }

    /**
     * @param {Object} recipe - The recipe JSON
     * @param {number|string} duration - A number (maps) or string (condition name)
     */
    craftRecipe(recipe, duration = 1) {
        // Pay the cost of the recipe you're actually crafting.
        // (Crafting Magic Cake pays Magic Cake's cost, NOT the copied recipe's.)
        const costs = recipe.data_points
        for (const [ing, cost] of Object.entries(costs)) {
            this.ingredients[ing] = Math.max(0, this.ingredients[ing] - (cost || 0))
        }

        // Record what was literally crafted; reset Magic Cake tracking (set below if a copy happens).
        this.craftedRecipeId = recipe.id
        this.usedMagicCake = false
        this.copiedRecipeId = null

        // Work out which effect actually gets applied.
        let effectRecipe = recipe
        let effectDuration = duration

        // 18 - Magic Cake: apply the opponent's last crafted recipe effect instead.
        if (recipe.id === 18) {
            const copied = this.opponent && this.opponent.lastCraftedRecipe
            if (!copied || !copied.id) {
                console.log(`${this.color.toUpperCase()} crafted Magic Cake, but the opponent has no recipe to copy.`)
                this.activeRecipe = { id: null }
                this.craftedRecipeId = null
                this.usedMagicCake = false
                this.copiedRecipeId = null
                this.mapsRemaining = 0
                this.condition = null
                this.displayIngredientList()
                displayActiveRecipe()
                return
            }
            // Clone so consumeRecipe nulling the id later can't corrupt the stored copy.
            effectRecipe = { ...copied }
            effectDuration = copied.duration === "Infinity" ? Infinity : copied.duration
            this.usedMagicCake = true
            this.copiedRecipeId = copied.id
            console.log(`${this.color.toUpperCase()} used Magic Cake to copy ${effectRecipe.recipe} (id ${copied.id}).`)
        }

        // Apply the effect. Clone so consumeRecipe never mutates the shared recipes list.
        this.activeRecipe = { ...effectRecipe }

        if (typeof effectDuration === 'number') {
            this.mapsRemaining = effectDuration
            this.condition = null
        } else {
            this.mapsRemaining = Infinity
            this.condition = effectDuration
        }

        // Remember the effect this player actually got, so Magic Cake can copy it later.
        this.lastCraftedRecipe = { ...effectRecipe }

        this.displayIngredientList()
        console.log(`${this.color.toUpperCase()} crafted ${recipe.recipe}. Duration: ${effectDuration}`)
        displayActiveRecipe()
    }

    /**
     * Clears the active recipe after it has been used in a map
     */
    consumeRecipe() {
        const used = this.activeRecipe.id
        this.activeRecipe = { id: null }
        this.craftedRecipeId = null
        this.usedMagicCake = false
        this.copiedRecipeId = null
        this.mapsRemaining = 0
        this.condition = null
        this.savedScore = 0
        displayActiveRecipe()
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
            const div = document.createElement("div")
            div.classList.add("ingredient-container")

            const image = document.createElement("img")
            image.setAttribute("src", `static/ingredients/${ingredient}.png`)
            imagesHTML.append(div)

            const amountDiv = document.createElement("div")
            amountDiv.classList.add("ingredient-amount")
            amountDiv.textContent = amount

            div.append(image, amountDiv)
        }
        this.ingredientDisplayEl.append(imagesHTML)
        displayActiveRecipe()
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
        displayActiveRecipe()
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
        displayActiveRecipe()
    }
}

const redActiveRecipeEl = document.getElementById("red-active-recipe")
const blueActiveRecipeEl = document.getElementById("blue-active-recipe")
const redPreviousRecipeEl = document.getElementById("red-previous-recipe")
const bluePreviousRecipeEl = document.getElementById("blue-previous-recipe")
/**
 * Display Active Recipe
 */
function displayActiveRecipe() {
    redActiveRecipeEl.textContent = describeActiveRecipe(redPlayerManager)
    blueActiveRecipeEl.textContent = describeActiveRecipe(bluePlayerManager)
    redPreviousRecipeEl.textContent = describeLastCraftedRecipe(redPlayerManager)
    bluePreviousRecipeEl.textContent = describeLastCraftedRecipe(bluePlayerManager)
}

/**
 * Builds the display string for a player's active recipe,
 * annotating when the effect was copied via Magic Cake.
 * @param {PlayerManager} pm
 * @returns {string}
 */
function describeActiveRecipe(pm) {
    if (!pm.activeRecipe || !pm.activeRecipe.id) return "None"
    const name = findRecipe(pm.activeRecipe.id)?.recipe ?? "None"
    return pm.usedMagicCake ? `${name} (Magic Cake)` : name
}

/**
 * Builds the display string for a player's last crafted recipe,
 * annotating when the effect was copied via Magic Cake.
 * @param {PlayerManager} pm
 * @returns {string}
 */
function describeLastCraftedRecipe(pm) {
    if (!pm.lastCraftedRecipe || !pm.lastCraftedRecipe.id) return "None"
    const name = findRecipe(pm.lastCraftedRecipe.id)?.recipe ?? "None"
    return pm.usedMagicCake ? `${name} (Magic Cake)` : name
}

// Ingredient Lists
const redIngredientsEl = document.getElementById("red-ingredients")
const blueIngredientsEl = document.getElementById("blue-ingredients")
// Ingredients Display
const leftIngredientsDisplayEl = document.getElementById("left-ingredients-display")
const rightIngredientsDisplayEl = document.getElementById("right-ingredients-display")

// Player Managers
const redPlayerManager = new PlayerManager("red", redIngredientsEl, leftIngredientsDisplayEl, "DT")
const bluePlayerManager = new PlayerManager("blue", blueIngredientsEl, rightIngredientsDisplayEl, "HR")
redPlayerManager.opponent = bluePlayerManager
bluePlayerManager.opponent = redPlayerManager
redPlayerManager.displayIngredientList()
bluePlayerManager.displayIngredientList()

// Select elements
const whichActionEl = document.getElementById("which-action")
const whichTeamEl = document.getElementById("which-team")
const whichIngredientEl = document.getElementById("which-ingredient")

/**
 * Adds and Subtracts Recipes
 */
function applyChanges() {
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

// Select Elements Recipe
const whichTeamRecipeEl = document.getElementById("which-team-recipe")
const whichActionRecipeEl = document.getElementById("which-action-recipe")
const selectRecipeEl = document.getElementById("select-recipe")
const applyChangesRecipeEl = document.getElementById("apply-changes-recipe")

function applyChangesRecipe() {
    if (!whichTeamRecipeEl.value || !whichActionRecipeEl.value) return

    const playerManager = whichTeamRecipeEl.value === "red" ? redPlayerManager : bluePlayerManager

    // Add Recipe
    if (whichActionRecipeEl.value === "add-active-recipe" && !selectRecipeEl.value) return
    else if (whichActionRecipeEl.value === "add-active-recipe") {
        // Set active recipe
        const currentRecipe = findRecipe(Number(selectRecipeEl.value))
        if (!currentRecipe) return
        playerManager.craftRecipe(currentRecipe, currentRecipe.duration === "Infinity" ? Infinity : currentRecipe.duration)
    } else if (whichActionRecipeEl.value === "remove-active-recipe") {
        playerManager.consumeRecipe()
    }

    // Add Previous Recipe
    else if (whichActionRecipeEl.value === "add-previous-recipe" && !selectRecipeEl.value) return
    else if (whichActionRecipeEl.value === "add-previous-recipe") {
        const currentRecipe = findRecipe(Number(selectRecipeEl.value))
        if (!currentRecipe) return
        playerManager.lastCraftedRecipe = { ...currentRecipe }
        displayActiveRecipe()
    } 
    
    // Remove Previous Recipe
    else if (whichActionRecipeEl.value === "remove-previous-recipe") {
        playerManager.lastCraftedRecipe = { id: null }
        displayActiveRecipe()
    }
}

// API Integration Toggle
const sidebarEl = document.getElementById("sidebar")
const apiIntegrationToggleEl = document.getElementById("api-integration-toggle")
let apiIntegration = false
function apiIntegrationToggle() {
    apiIntegration = !apiIntegration
    if (apiIntegration) {
        apiIntegrationToggleEl.textContent = "ON"
        apiIntegrationToggleEl.classList.remove("api-integration-off")
        apiIntegrationToggleEl.classList.add("api-integration-on")
        sidebarEl.style.width = "250px"
    } else {
        apiIntegrationToggleEl.textContent = "OFF"
        apiIntegrationToggleEl.classList.add("api-integration-off")
        apiIntegrationToggleEl.classList.remove("api-integration-on")
        sidebarEl.style.width = "1000px"
    }
}

// Buttons
const updateStarRedMinusEl = document.getElementById("update-star-red-minus")
const updateStarRedPlusEl = document.getElementById("update-star-red-plus")
const updateStarBlueMinusEl = document.getElementById("update-star-blue-minus")
const updateStarBluePlusEl = document.getElementById("update-star-blue-plus")
// const updateNextAutopickerRedEl = document.getElementById("update-next-autopicker-red")
// const updateNextAutopickerBlueEl = document.getElementById("update-next-autopicker-blue")
const applyChangesEl = document.getElementById("apply-changes")
document.addEventListener("DOMContentLoaded", () => {
    apiIntegrationToggleEl.addEventListener("click", () => apiIntegrationToggle())
    updateStarRedMinusEl.addEventListener("click", () => updateStarCount("red", "minus", leftPlayerScoreEl, rightPlayerScoreEl))
    updateStarRedPlusEl.addEventListener("click", () => updateStarCount("red", "plus", leftPlayerScoreEl, rightPlayerScoreEl))
    updateStarBlueMinusEl.addEventListener("click", () => updateStarCount("blue", "minus", leftPlayerScoreEl, rightPlayerScoreEl))
    updateStarBluePlusEl.addEventListener("click", () => updateStarCount("blue", "plus", leftPlayerScoreEl, rightPlayerScoreEl))
    // updateNextAutopickerRedEl.addEventListener("click", () => updateNextAutoPicker('red'))
    // updateNextAutopickerBlueEl.addEventListener("click", () => updateNextAutoPicker('blue'))
    toggleAutopickEl.addEventListener("click", toggleAutopick)
    applyChangesEl.addEventListener("click", applyChanges)
    applyChangesRecipeEl.addEventListener("click", applyChangesRecipe)
})

// 200ms
setInterval(() => {
    // Setting cookie information
    document.cookie = `redActiveRecipeId=${redPlayerManager.activeRecipe.id}; path=/`
    document.cookie = `blueActiveRecipeId=${bluePlayerManager.activeRecipe.id}; path=/`
    document.cookie = `redCraftedRecipeId=${redPlayerManager.craftedRecipeId}; path=/`
    document.cookie = `blueCraftedRecipeId=${bluePlayerManager.craftedRecipeId}; path=/`
    document.cookie = `redUsedMagicCake=${redPlayerManager.usedMagicCake}; path=/`
    document.cookie = `blueUsedMagicCake=${bluePlayerManager.usedMagicCake}; path=/`
    document.cookie = `redCopiedRecipeId=${redPlayerManager.copiedRecipeId}; path=/`
    document.cookie = `blueCopiedRecipeId=${bluePlayerManager.copiedRecipeId}; path=/`
}, 200)


let currentApiIntegrationBestOf, previousApiIntegrationBestOf
let currentApiIntegrationStars, previousApiIntegrationStars
let currentApiIntegrationIngredients, preivousApiIntegrationIngredients
// 5 seconds
setInterval(async () => {
    if (!apiIntegration) return

    // API Integration
    const response = await fetch(
        "https://mws-ref-dashboard.pages.dev/api/public/match/67/snapshot",
        { credentials: "omit" }
    )
    const match = await response.json()
    console.log(match)

    // Stars
    currentApiIntegrationBestOf = match.bestOf
    if (previousApiIntegrationBestOf !== currentApiIntegrationBestOf) {
        previousApiIntegrationBestOf = currentApiIntegrationBestOf
        apiIntegrationSetBestOf(currentApiIntegrationBestOf)
    }
    currentApiIntegrationStars = match.stars
    if (previousApiIntegrationStars !== currentApiIntegrationStars) {
        previousApiIntegrationStars = currentApiIntegrationStars
        apiIntegrationUpdateStars(currentApiIntegrationStars, leftPlayerScoreEl, rightPlayerScoreEl)
    }

    currentApiIntegrationIngredients = match.ingredients
    if (preivousApiIntegrationIngredients !== currentApiIntegrationIngredients) {
        preivousApiIntegrationIngredients = currentApiIntegrationIngredients
        redPlayerManager.apiIntegrationSetIngredients(match.ingredients.red)
        bluePlayerManager.apiIntegrationSetIngredients(match.ingredients.blue)
    }
}, 7000)