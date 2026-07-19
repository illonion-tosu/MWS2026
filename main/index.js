import { initialiseOsuApi, getOsuApi } from "../_shared/core/apis.js"
import { loadBeatmaps, findBeatmap } from "../_shared/core/beatmaps.js"
import { getCookie } from "../_shared/core/utils.js"
import { createTosuWsSocket } from "../_shared/core/websocket.js"

getBeatmaps()
initialiseOsuApi()
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
    return allRecipes.find(r => Number(r.id) === Number(id))
}

const roundNameEl = document.getElementById("round-name")
let allBeatmaps = [], currentMap
/**
 * Loads beatmaps into allBeatmaps variable
 */
async function getBeatmaps() {
    const data = await loadBeatmaps()
    roundNameEl.textContent = data.roundName
    allBeatmaps = data.beatmaps
}

// Player Names
const leftProfilePictureEl = document.getElementById("left-profile-picture")
const rightProfilePictureEl = document.getElementById("right-profile-picture")
const leftPlayerNameEl = document.getElementById("left-player-name")
const rightPlayerNameEl = document.getElementById("right-player-name")
let currentLeftPlayer, currentRightPlayer

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
    // console.log(data)

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

const redActiveRecipeEl = document.getElementById("left-active-recipe")
console.log("redActiveRecipeEl:", redActiveRecipeEl)
const blueActiveRecipeEl = document.getElementById("right-active-recipe")
// What is currently active
let currentRedActiveRecipe, previousRedActiveRecipe
let currentBlueActiveRecipe, previousBlueActiveRecipe

// What the player selected
let currentRedCraftedRecipe, previousRedCraftedRecipe
let currentBlueCraftedRecipe, previousBlueCraftedRecipe

// Did they use magic cake
let currentRedUsedMagicCake, previousRedUsedMagicCake
let currentBlueUsedMagicCake, previousBlueUsedMagicCake

// What is the copied recipe
let currentRedCopiedRecipe, previousRedCopiedRecipe
let currentBlueCopiedRecipe, previousBlueCopiedRecipe

setInterval(() => {
    currentRedActiveRecipe = getCookie("redActiveRecipeId")
    currentBlueActiveRecipe = getCookie("blueActiveRecipeId")

    currentRedCraftedRecipe = getCookie("redCraftedRecipeId")
    currentBlueCraftedRecipe = getCookie("blueCraftedRecipeId")

    currentRedUsedMagicCake = getCookie("redUsedMagicCake")
    currentBlueUsedMagicCake = getCookie("blueUsedMagicCake")

    currentRedCopiedRecipe = getCookie("redCopiedRecipeId")
    currentBlueCopiedRecipe = getCookie("blueCopiedRecipeId")

    const changed =
        previousRedActiveRecipe !== currentRedActiveRecipe ||
        previousBlueActiveRecipe !== currentBlueActiveRecipe ||
        previousRedCraftedRecipe !== currentRedCraftedRecipe ||
        previousBlueCraftedRecipe !== currentBlueCraftedRecipe ||
        previousRedUsedMagicCake !== currentRedUsedMagicCake ||
        previousBlueUsedMagicCake !== currentBlueUsedMagicCake ||
        previousRedCopiedRecipe !== currentRedCopiedRecipe ||
        previousBlueCopiedRecipe !== currentBlueCopiedRecipe

    if (changed) {
        previousRedActiveRecipe = currentRedActiveRecipe
        previousBlueActiveRecipe = currentBlueActiveRecipe
        previousRedCraftedRecipe = currentRedCraftedRecipe
        previousBlueCraftedRecipe = currentBlueCraftedRecipe
        previousRedUsedMagicCake = currentRedUsedMagicCake
        previousBlueUsedMagicCake = currentBlueUsedMagicCake
        previousRedCopiedRecipe = currentRedCopiedRecipe
        previousBlueCopiedRecipe = currentBlueCopiedRecipe

        redActiveRecipeEl.textContent = formatActiveRecipe(currentRedActiveRecipe, currentRedUsedMagicCake)
        blueActiveRecipeEl.textContent = formatActiveRecipe(currentBlueActiveRecipe, currentBlueUsedMagicCake)
    }
}, 200)

/**
 * Builds the display string for an active recipe cookie value.
 * @param {string} activeRecipeId - cookie value (may be "null" or an id string)
 * @param {string} usedMagicCake - cookie value, the string "true" or "false"
 * @returns {string}
 */
function formatActiveRecipe(activeRecipeId, usedMagicCake) {
    if (!activeRecipeId || activeRecipeId === "null") return "None"

    const recipe = findRecipe(activeRecipeId)
    if (!recipe) return "None"

    return usedMagicCake === "true" ? `${recipe.recipe} (Magic Cake)` : recipe.recipe
}