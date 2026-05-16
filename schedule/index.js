// Load in matches
let allMatches = []

/**
 * Fetches match data from the JSON file and populates the {@link allMatches} array
 * @async
 * @returns {Promise<void>}
 */
async function getMatches() {
    const response = await fetch("../_data/matches.json")
    const responseJson = await response.json()
    allMatches = responseJson
    filterMatches()
}
getMatches()

// Filter matches
let previousFilteredMatches = []
let currentFilteredMatches = []

/**
 * Filters matches to only include those within the last 30 minutes,
 * sorts them by time, and displays them if the results have changed\
 */
function filterMatches() {
    const currentTime = Date.now();
    currentFilteredMatches = allMatches
        .filter(match => match.matchTime >= currentTime - 1800000) // 30 minutes
        .sort((a, b) => a.matchTime - b.matchTime)
        .slice(0, 3)

    const hasChanged =
        currentFilteredMatches.length !== previousFilteredMatches.length ||
        currentFilteredMatches.some((match, i) => match !== previousFilteredMatches[i])

    if (hasChanged) {
        previousFilteredMatches = currentFilteredMatches
        displayMatches()
    }
}

// Display matches
const matchDisplayContainerEl = document.getElementById("match-display-container")

/**
 * Clears the match display container and renders the current filtered matches,
 * with separators between each match
 */
function displayMatches() {
    matchDisplayContainerEl.innerHTML = ""
    for (let i = 0; i < currentFilteredMatches.length; i++) {
        matchDisplayContainerEl.append(createMatchDisplay(currentFilteredMatches[i]))
        if (i < currentFilteredMatches.length - 1) matchDisplayContainerEl.append(createMatchSeparator())
    }
}

/**
 * Creates a match display element for the given match
 * @param {Object} match - The match data object
 * @param {number} match.id - The match ID
 * @param {number} match.matchTime - The match time as a Unix timestamp (ms)
 * @param {number} match.player1 - The user ID of player 1
 * @param {number} match.player2 - The user ID of player 2
 * @returns {HTMLDivElement} The match display element
 */
function createMatchDisplay(match) {
    // Container
    const matchDisplay = document.createElement("div")
    matchDisplay.classList.add("match-display")

    // Left details
    const matchDetails = document.createElement("div")
    matchDetails.classList.add("match-details")

    // Match Number
    const matchNumber = document.createElement("div")
    matchNumber.classList.add("match-number")
    matchNumber.textContent = `MATCH ${match.id}`

    // Match Time
    let matchTime = new Date(match.matchTime)
    const matchTimeDiv = document.createElement("div")
    matchTimeDiv.classList.add("match-time")
    matchTimeDiv.textContent = `${String(matchTime.getUTCHours()).padStart(2, "0")}:${String(matchTime.getUTCMinutes()).padStart(2, "0")} UTC`

    // Match Players
    const player1 = createMatchPlayer(match.player1, 1)
    const player2 = createMatchPlayer(match.player2, 2)

    // Match Vs
    const matchVs = document.createElement("div")
    matchVs.classList.add("match-vs")
    matchVs.textContent = "vs"

    // Append everything together
    matchDetails.append(matchNumber, matchTimeDiv)
    matchDisplay.append(matchDetails, player1, matchVs, player2)
    return matchDisplay
}

/**
 * Creates an image element for a match player using their osu! avatar
 * @param {number} playerId - The osu! user ID of the player
 * @param {1 | 2} playerNumber - The player's position in the match (1 or 2)
 * @returns {HTMLImageElement} The player image element
 */
function createMatchPlayer(playerId, playerNumber) {
    const matchPlayer = document.createElement("img")
    matchPlayer.classList.add("match-player", `match-player-${playerNumber}`)
    matchPlayer.setAttribute("src", `https://a.ppy.sh/${playerId}`)
    return matchPlayer
}

/**
 * Creates a separator element to be placed between match displays
 * @returns {HTMLDivElement} The separator element
 */
function createMatchSeparator() {
    const matchDisplaySeparator = document.createElement("div")
    matchDisplaySeparator.classList.add("match-display-separator")
    return matchDisplaySeparator
}

// Current Date and Time
const currentDateEl = document.getElementById("current-date")
const currentTimeEl = document.getElementById("current-time")

/**
 * Updates the current date and time display elements every second.
 * Displays the date in "DD Month YYYY" format and time in "HH:MM UTC" format,
 * both based on UTC.
 * @type {number} The interval ID returned by setInterval.
 */
setInterval(() => {
    let currentTime = new Date()
    currentDateEl.textContent = `${currentTime.getUTCDate()} ${currentTime.toLocaleString('default', { month: 'long', timeZone: "UTC" })} ${currentTime.getUTCFullYear()}`
    currentTimeEl.textContent = `${String(currentTime.getUTCHours()).padStart(2, "0")}:${String(currentTime.getUTCMinutes()).padStart(2, "0")} UTC`
}, 1000)