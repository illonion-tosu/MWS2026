import { initialiseOsuApi, getOsuApi } from "../_shared/core/apis.js"
import { loadBeatmaps, findBeatmap } from "../_shared/core/beatmaps.js"
import { updateChat } from "../_shared/core/chat.js"
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
let currentMap
/**
 * Loads beatmaps into allBeatmaps variable
 */
async function getBeatmaps() {
    const data = await loadBeatmaps()
    roundNameEl.textContent = data.roundName
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
const missLeftScoreEl = document.getElementById("miss-left-score")
const missRightScoreEl = document.getElementById("miss-right-score")
// Score Visibility
let ipcState
let scoreVisible
// Animation
const animation = {
    scoreLeftScore: new CountUp(scoreLeftScoreEl, 0, 0, 0, 0.2, { useEasing: true, useGrouping: true, separator: ",", decimal: ".", suffix: ""}),
    scoreRightScore: new CountUp(scoreRightScoreEl, 0, 0, 0, 0.2, { useEasing: true, useGrouping: true, separator: ",", decimal: ".", suffix: ""}),
    accLeftScore: new CountUp(accLeftScoreEl, 0, 0, 2, 0.2, { useEasing: true, useGrouping: true, separator: ",", decimal: ".", suffix: "%"}),
    accRightScore: new CountUp(accRightScoreEl, 0, 0, 2, 0.2, { useEasing: true, useGrouping: true, separator: ",", decimal: ".", suffix: "%"}),
    missLeftScore: new CountUp(missLeftScoreEl, 0, 0, 0, 0.2, { useEasing: true, useGrouping: true, separator: ",", decimal: ".", suffix: "x"}),
    missRightScore: new CountUp(missRightScoreEl, 0, 0, 0, 0.2, { useEasing: true, useGrouping: true, separator: ",", decimal: ".", suffix: "x"}),
}

// Now Playing Information
const nowPlayingBackgroundEl = document.getElementById("now-playing-background")
const nowPlayingBannerEl = document.getElementById("now-playing-banner")
const nowPlayingCustomEl = document.getElementById("now-playing-custom")
const nowPlayingDottedLinesEl = document.getElementById("now-playing-dotted-lines")
// Now Playing Metadata
const nowPlayingArtistTitleEl = document.getElementById("now-playing-artist-title")
const nowPlayingMapperEl = document.getElementById("now-playing-mapper")
const nowPlayingDifficultyEl = document.getElementById("now-playing-difficulty")
let nowPlayingId, nowPlayingChecksum

// Chat
const chatDisplayEl = document.getElementById("chat-display")
const chatDisplayContainerEl = document.getElementById("chat-display-container")
let chatLen

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
            chatDisplayEl.style.opacity = 0
            scoreLeftScoreEl.style.opacity = 1
            scoreRightScoreEl.style.opacity = 1
            accLeftScoreEl.style.opacity = 1
            accRightScoreEl.style.opacity = 1
        } else {
            chatDisplayEl.style.opacity = 1
            animation.scoreLeftScore.update(0)
            animation.scoreRightScore.update(0)
            animation.accLeftScore.update(0)
            animation.accRightScore.update(0)
            scoreLeftScoreEl.style.opacity = 0
            scoreRightScoreEl.style.opacity = 0
            accLeftScoreEl.style.opacity = 0
            accRightScoreEl.style.opacity = 0
            leftScoreBarEl.style.width = "0px"
            rightScoreBarEl.style.width = "0px"
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
        const scores = calculateScore(previousRedActiveRecipe, previousBlueActiveRecipe, leftPlay, rightPlay, currentMap, nowPlayingId)

        // Display correct stuff
        if (scores.comparisonMethod === "acc") {
            // Scores
            scoreLeftScoreEl.style.opacity = 0
            scoreRightScoreEl.style.opacity = 0
            accLeftScoreEl.style.opacity = 1
            accRightScoreEl.style.opacity = 1
            missLeftScoreEl.style.opacity = 0
            missRightScoreEl.style.opacity = 0
        } else if (scores.comparisonMethod === "miss") {
            // Scores
            scoreLeftScoreEl.style.opacity = 0
            scoreRightScoreEl.style.opacity = 0
            accLeftScoreEl.style.opacity = 0
            accRightScoreEl.style.opacity = 0
            missLeftScoreEl.style.opacity = 1
            missRightScoreEl.style.opacity = 1
        } else {
            // Scores
            scoreLeftScoreEl.style.opacity = 1
            scoreRightScoreEl.style.opacity = 1
            accLeftScoreEl.style.opacity = 0
            accRightScoreEl.style.opacity = 0
            missLeftScoreEl.style.opacity = 0
            missRightScoreEl.style.opacity = 0
        }

        // Update scores
        animation.scoreLeftScore.update(scores.redWinValue)
        animation.scoreRightScore.update(scores.blueWinValue)
        animation.accLeftScore.update(scores.redWinValue)
        animation.accRightScore.update(scores.blueWinValue)
        animation.missLeftScore.update(scores.redWinValue)
        animation.missRightScore.update(scores.blueWinValue)

        // Animate score bars
        const scoreDelta = Math.abs(scores.redWinValue - scores.blueWinValue)
        const scoreBarMaxWidth = 902
        let scoreBarRectangleWidth
        if (scores.comparisonMethod === "acc" || scores.comparisonMethod === "miss") {
            const scoreBarMaxDifference = 20
            let scoreBarDifferencePercent = Math.min(scoreDelta / scoreBarMaxDifference, 1)
            scoreBarRectangleWidth = Math.min(scoreBarDifferencePercent * scoreBarMaxWidth, scoreBarMaxWidth)
        } else {
		    const scoreBarMaxDifference = 300000
            let scoreBarDifferencePercent = Math.min(scoreDelta / scoreBarMaxDifference, 1)
            scoreBarRectangleWidth = Math.min(Math.pow(scoreBarDifferencePercent, 1.4) * scoreBarMaxWidth, scoreBarMaxWidth)
        }

        if (currentMap && currentMap.wincon === "miss") {
            if (scores.redWinValue < scores.blueWinValue) {
                leftScoreBarEl.style.width = `${scoreBarRectangleWidth}px`
                rightScoreBarEl.style.width = "0px"
            } else if (scores.redWinValue === scores.blueWinValue) {
                leftScoreBarEl.style.width = "0px"
                rightScoreBarEl.style.width = "0px"
            } else if (scores.redWinValue > scores.blueWinValue) {
                leftScoreBarEl.style.width = "0px"
                rightScoreBarEl.style.width = `${scoreBarRectangleWidth}px`
            }
        } else {
            if (scores.redWinValue > scores.blueWinValue) {
                leftScoreBarEl.style.width = `${scoreBarRectangleWidth}px`
                rightScoreBarEl.style.width = "0px"
            } else if (scores.redWinValue === scores.blueWinValue) {
                leftScoreBarEl.style.width = "0px"
                rightScoreBarEl.style.width = "0px"
            } else if (scores.redWinValue < scores.blueWinValue) {
                leftScoreBarEl.style.width = "0px"
                rightScoreBarEl.style.width = `${scoreBarRectangleWidth}px`
            }
        }


    } else {
        animation.scoreLeftScore.update(0)
        animation.scoreRightScore.update(0)
        animation.accLeftScore.update(1)
        animation.accRightScore.update(1)
        animation.missLeftScore.update(0)
        animation.missRightScore.update(0)
    }

    // Now Playing Information
    const beatmapData = data.beatmap
    if (nowPlayingId !== beatmapData.id || nowPlayingChecksum !== beatmapData.checksum) {
        nowPlayingId = beatmapData.id
        nowPlayingChecksum = beatmapData.checksum

        // Background Image
        const url = `${window.location.origin}/Songs/${data.directPath.beatmapBackground}`
        const fixedUrl = encodeURI(url.replaceAll("\\", "/"));
        nowPlayingBackgroundEl.style.backgroundImage = `url("${fixedUrl}")`

        // Metadata
        nowPlayingArtistTitleEl.textContent = `${beatmapData.artist} - ${beatmapData.title}`
        nowPlayingMapperEl.textContent = beatmapData.mapper
        nowPlayingDifficultyEl.textContent = beatmapData.version

        currentMap = findBeatmap(nowPlayingId)
        if (currentMap) {
            nowPlayingBannerEl.style.display = "block"
            nowPlayingDottedLinesEl.style.display = "block"
            nowPlayingCustomEl.style.display = currentMap.MWSCustom ? "block" : "none"

            nowPlayingBannerEl.style.backgroundColor = `var(--${currentMap.mod.toLowerCase()}-colour)`
            nowPlayingCustomEl.style.backgroundColor = `var(--${currentMap.mod.toLowerCase()}-colour)`
            nowPlayingBannerEl.textContent = `${currentMap.mod}${currentMap.order}`
        } else {
            nowPlayingBannerEl.style.display = "none"
            nowPlayingDottedLinesEl.style.display = "none"
            nowPlayingCustomEl.style.display = "none"
        }
    }

    // Chat Display
    const chatData = data.tourney.chat
    if (chatLen !== chatData.length) {
        chatLen = updateChat(chatLen, chatData, chatDisplayContainerEl)
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

// Stars
const leftPlayerStarContainerEl = document.getElementById("left-player-star-container")
const rightPlayerStarContainerEl = document.getElementById("right-player-star-container")
let currentRedStarCount, previousRedStarCount
let currentBlueStarCount, previousBlueStarCount
let currentTotalBestOf, previousTotalBestOf
let currentFirstTo, previousFirstTo

// API Integration
let currentApiIntegration, previousApiIntegration

// Player Details
let currentApiIntegrationLeftPlayerName, previousApiIntegrationLeftPlayerName
let currentApiIntegrationLeftPlayerOsuId, previousApiIntegrationLeftPlayerOsuId
let currentApiIntegrationRightPlayerName, previousApiIntegrationRightPlayerName
let currentApiIntegrationRightPlayerOsuId, previousApiIntegrationRightPlayerOsuId

/**
 * Reads a recipe-id cookie written by the mappool page (e.g. `${recipe.id}`
 * or the literal string "null") and converts it back into the same shape
 * the mappool page works with: a number, or null.
 *
 * @param {string} name - Cookie name
 * @returns {number|null}
 */
function getRecipeIdCookie(name) {
    const value = getCookie(name)
    if (value === undefined || value === null || value === "null" || value === "") return null
    const num = Number(value)
    return Number.isNaN(num) ? null : num
}

/**
 * Reads a boolean cookie written by the mappool page (the stringified
 * "true"/"false") back into an actual boolean.
 *
 * @param {string} name - Cookie name
 * @returns {boolean}
 */
function getBooleanCookie(name) {
    return getCookie(name) === "true"
}

setInterval(() => {
    currentRedActiveRecipe = getRecipeIdCookie("redActiveRecipeId")
    currentBlueActiveRecipe = getRecipeIdCookie("blueActiveRecipeId")

    currentRedCraftedRecipe = getRecipeIdCookie("redCraftedRecipeId")
    currentBlueCraftedRecipe = getRecipeIdCookie("blueCraftedRecipeId")

    currentRedUsedMagicCake = getBooleanCookie("redUsedMagicCake")
    currentBlueUsedMagicCake = getBooleanCookie("blueUsedMagicCake")

    currentRedCopiedRecipe = getRecipeIdCookie("redCopiedRecipeId")
    currentBlueCopiedRecipe = getRecipeIdCookie("blueCopiedRecipeId")

    const recipeChanged =
        previousRedActiveRecipe !== currentRedActiveRecipe ||
        previousBlueActiveRecipe !== currentBlueActiveRecipe ||
        previousRedCraftedRecipe !== currentRedCraftedRecipe ||
        previousBlueCraftedRecipe !== currentBlueCraftedRecipe ||
        previousRedUsedMagicCake !== currentRedUsedMagicCake ||
        previousBlueUsedMagicCake !== currentBlueUsedMagicCake ||
        previousRedCopiedRecipe !== currentRedCopiedRecipe ||
        previousBlueCopiedRecipe !== currentBlueCopiedRecipe

    if (recipeChanged) {
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

    // Stars
    currentRedStarCount = Number(getCookie("redStarCount"))
    currentBlueStarCount = Number(getCookie("blueStarCount"))
    currentTotalBestOf = Number(getCookie("totalBestOf"))
    currentFirstTo = Number(getCookie("firstTo"))

    const starsChanged = 
        previousRedStarCount !== currentRedStarCount ||
        previousBlueStarCount !== currentBlueStarCount ||
        previousTotalBestOf !== currentTotalBestOf ||
        previousFirstTo !== currentFirstTo

    if (starsChanged) {
        previousRedStarCount = currentRedStarCount
        previousBlueStarCount = currentBlueStarCount
        previousTotalBestOf = currentTotalBestOf
        previousFirstTo = currentFirstTo

        leftPlayerStarContainerEl.innerHTML = ""
        rightPlayerStarContainerEl.innerHTML = ""

        for (let i = 0; i < currentFirstTo; i++) {
            leftPlayerStarContainerEl.append(createStar(i < currentRedStarCount ? "fill" : "empty"))
            rightPlayerStarContainerEl.append(createStar(i < currentBlueStarCount ? "fill" : "empty"))
        }

        function createStar(status) {
            const image = document.createElement("img")
            image.setAttribute("src", `static/stars/star-${status}.png`)
            return image
        }
    }

    // API Integration
    currentApiIntegration = getBooleanCookie("apiIntegration")
    if (currentApiIntegration !== previousApiIntegration) {
        previousApiIntegration = currentApiIntegration
    }

    currentApiIntegrationLeftPlayerName = getCookie("apiIntegrationLeftPlayerName")
    currentApiIntegrationLeftPlayerOsuId = getCookie("apiIntegrationLeftPlayerOsuId")
    currentApiIntegrationRightPlayerName = getCookie("apiIntegrationRightPlayerName")
    currentApiIntegrationRightPlayerOsuId = getCookie("apiIntegrationRightPlayerOsuId")

    // Player Changed
    const playerDetailsChanged = 
        previousApiIntegrationLeftPlayerName !== currentApiIntegrationLeftPlayerName ||
        previousApiIntegrationLeftPlayerOsuId !== currentApiIntegrationLeftPlayerOsuId ||
        previousApiIntegrationRightPlayerName !== currentApiIntegrationRightPlayerName ||
        previousApiIntegrationRightPlayerOsuId !== currentApiIntegrationRightPlayerOsuId

    if (playerDetailsChanged && currentApiIntegration) {
        previousApiIntegrationLeftPlayerName = currentApiIntegrationLeftPlayerName
        previousApiIntegrationLeftPlayerOsuId = currentApiIntegrationLeftPlayerOsuId
        previousApiIntegrationRightPlayerName = currentApiIntegrationRightPlayerName
        previousApiIntegrationRightPlayerOsuId = currentApiIntegrationRightPlayerOsuId

        leftPlayerNameEl.textContent = previousApiIntegrationLeftPlayerName
        leftProfilePictureEl.style.backgroundImage = `url("https://a.ppy.sh/${previousApiIntegrationLeftPlayerOsuId}")`
        rightPlayerNameEl.textContent = previousApiIntegrationRightPlayerName
        rightProfilePictureEl.style.backgroundImage = `url("https://a.ppy.sh/${previousApiIntegrationRightPlayerOsuId}")`
    }
}, 200)

/**
 * Builds the display string for an active recipe.
 * @param {number|null} activeRecipeId - recipe id, or null when nothing's active
 * @param {boolean} usedMagicCake - whether the effect was copied via Magic Cake
 * @returns {string}
 */
function formatActiveRecipe(activeRecipeId, usedMagicCake) {
    if (activeRecipeId === null) return "None"

    const recipe = findRecipe(activeRecipeId)
    if (!recipe) return "None"

    return usedMagicCake ? `${recipe.recipe} (Magic Cake)` : recipe.recipe
}