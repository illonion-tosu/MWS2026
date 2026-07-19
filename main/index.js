import { initialiseOsuApi, getOsuApi } from "../_shared/core/apis.js"
import { loadBeatmaps, findBeatmap } from "../_shared/core/beatmaps.js"
import { calculateScore } from "../_shared/core/score-calculator.js"
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

// Score Bar
const leftScoreBarEl = document.getElementById("left-score-bar")
const rightScoreBarEl = document.getElementById("right-score-bar")
// Scores
const scoreLeftScoreEl = document.getElementById("score-left-score")
const scoreRightScoreEl = document.getElementById("score-right-score")
const accLeftScoreEl = document.getElementById("acc-left-score")
const accRightScoreEl = document.getElementById("acc-right-score")
// Score Visibility
let ipcState
// Animation
const animation = {
    scoreLeftScore: new CountUp(scoreLeftScoreEl, 0, 0, 0, 0.2, { useEasing: true, useGrouping: true, separator: ",", decimal: ".", suffix: ""}),
    scoreRightScore: new CountUp(scoreRightScoreEl, 0, 0, 0, 0.2, { useEasing: true, useGrouping: true, separator: ",", decimal: ".", suffix: ""}),
    accLeftScore: new CountUp(accLeftScoreEl, 0, 0, 2, 0.2, { useEasing: true, useGrouping: true, separator: ",", decimal: ".", suffix: "%"}),
    accRightScore: new CountUp(accRightScoreEl, 0, 0, 2, 0.2, { useEasing: true, useGrouping: true, separator: ",", decimal: ".", suffix: "%"}),
}

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

    // Score Visibility
    if (scoreVisible !== data.tourney.scoreVisible) {
        scoreVisible = data.tourney.scoreVisible
        if (scoreVisible) {

        } else {

        }
    }

    // IPC State
    if (ipcState !== data.tourney.ipcState) {
        ipcState = data.tourney.ipcState
    }

    if (scoreVisible) {
        if (ipcState === 4) return
        const leftPlay = data.tourney.clients[0].play
        const rightPlay = data.tourney.clients[1].play
        const scores = calculateScore(previousRedActiveRecipe, previousBlueActiveRecipe, leftPlay, rightPlay)

        // Display correct stuff
        if (scores.comparisonMethod === "acc") {
            // Scores
            scoreLeftScoreEl.style.opacity = 0
            scoreRightScoreEl.style.opacity = 0
            accLeftScoreEl.style.opacity = 1
            accRightScoreEl.style.opacity = 1
        } else {
            // Scores
            scoreLeftScoreEl.style.opacity = 1
            scoreRightScoreEl.style.opacity = 1
            accLeftScoreEl.style.opacity = 0
            accRightScoreEl.style.opacity = 0
        }

        // Update scores
        animation.scoreLeftScore.update(scores.redWinValue)
        animation.scoreRightScore.update(scores.blueWinValue)
        animation.accLeftScore.update(scores.redWinValue)
        animation.accRightScore.update(scores.blueWinValue)

        // Animate score bars
        const scoreDelta = Math.abs(scores.redWinValue - scores.blueWinValue)
        const scoreBarMaxWidth = 902
        let scoreBarRectangleWidth
        if (scores.comparisonMethod === "acc") {
            const scoreBarMaxDifference = 20
            let scoreBarDifferencePercent = Math.min(scoreDelta / scoreBarMaxDifference, 1)
            scoreBarRectangleWidth = Math.min(scoreBarDifferencePercent * scoreBarMaxWidth, scoreBarMaxWidth)
        } else {
		    const scoreBarMaxDifference = 300000
            let scoreBarDifferencePercent = Math.min(scoreDelta / scoreBarMaxDifference, 1)
            scoreBarRectangleWidth = Math.min(Math.pow(scoreBarDifferencePercent, 1.4) * scoreBarMaxWidth, scoreBarMaxWidth)
        }

        if (scores.redWinValue > scores.blueWinValue) {
            leftScoreBarEl.style.width = `${scoreBarRectangleWidth}px`
            rightScoreBarEl.style.width = "0px"
        } else if (scores.redWinValue === scores.blueWinValue) {
            leftScoreBarEl.style.width = "0px"
            rightScoreBarEl.style.width = "0px"
        } else if (scores.redWinValue === scores.blueWinValue) {
            leftScoreBarEl.style.width = "0px"
            rightScoreBarEl.style.width = `${scoreBarRectangleWidth}px`
        }

    } else {
        animation.scoreLeftScore.update(0)
        animation.scoreRightScore.update(0)
        animation.accLeftScore.update(1)
        animation.accRightScore.update(1)
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