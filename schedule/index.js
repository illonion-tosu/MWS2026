// DOM Elements
const elements = {
    countdown: {
        minutes: document.getElementById("minutes-number"),
        seconds: document.getElementById("seconds-number"),
        errorMessage: document.getElementById("timer1-error-message"),
    },
    utc: {
        hours: document.getElementById("hours-number-utc"),
        minutes: document.getElementById("minutes-number-utc"),
        errorMessage: document.getElementById("timer2-error-message"),
    },
    display: document.getElementById("timer"),
}

// Helper Functions
/**
 * Format time
 * @constructor
 * @param {...number} parts - Time values to fromat
 * @returns {string} - Fully formatted time string
 */
function formatTime(...parts) {
    return parts.map((part) => String(part).padStart(2, "0")).join(":")
}

/**
 * Converts total seconds to hours, minutes, and seconds, then formats it
 * 
 * @param {number} seconds - Total number of seconds
 * @returns {string} - Fully formatted time string
 */
function secondsToDisplay(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    return hours >= 1
        ? formatTime(hours, minutes, seconds)
        : formatTime(minutes, seconds)
}

/**
 * Displays the specified error message and hides the other.
 *
 * @param {HTMLElement} errorEl - The error element to display.
 */
function showError(errorEl) {
    elements.countdown.errorMessage.style.display = errorEl === elements.countdown.errorMessage ? "block" : "none"
    elements.utc.errorMessage.style.display = errorEl === elements.utc.errorMessage ? "block" : "none"
}

/**
 * Hides all timer error messages.
 */
function hideErrors() {
    elements.countdown.errorMessage.style.display = "none"
    elements.utc.errorMessage.style.display = "none"
}

// Countdown Timer
class CountdownTimer {
    constructor() {
        this.active = false
        this.remainingSeconds = 0
    }

    /**
     * Sets the countdown time from inputs and immediately starts the timer
     */
    setAndStart() {
        this.setTime()
        this.start()
    }

    /**
     * Reads the countdown inputs and updates the remaining time
     *
     * Supports decimal minute input
     * Updates the timer display immediately
     */
    setTime() {
        const minutesValue = Number(elements.countdown.minutes.value)
        const minutesNumber = Math.floor(minutesValue)
        const secondsValue = Number(elements.countdown.seconds.value)

        this.remainingSeconds =
            Math.round(secondsValue) +
            minutesNumber * 60 +
            Math.round((minutesValue - minutesNumber) * 60)

        if (this.remainingSeconds < 0) {
            showError(elements.countdown.errorMessage)
            return
        }

        hideErrors()
        elements.display.textContent = secondsToDisplay(this.remainingSeconds)
        this.stop()
    }

    /**
     * Starts the countdown timer if time remains
     */
    start() {
        this.stop()
        if (this.remainingSeconds > 0) this.active = true
    }

    /**
     * Stops the countdown timer.
     */
    stop() {
        this.active = false
    }

    /**
     * Resets the timer state and display.
     */
    reset() {
        this.stop()
        this.remainingSeconds = 0
        elements.display.textContent = "00:00"
    }

    /**
     * Advances the timer by one second.
     *
     * Stops automatically when the timer reaches zero.
     */
    tick() {
        if (!this.active) return
        this.remainingSeconds--
        elements.display.textContent = secondsToDisplay(this.remainingSeconds)
        if (this.remainingSeconds <= 0) this.stop()
    }
}

// UTC Timer
class UTCTimer {
    constructor() {
        this.active = false
        this.targetTime = null
    }

    /**
     * Starts the UTC countdown timer using the provided UTC hour and minute.
     *
     * If the selected time has already passed today,
     * the timer rolls over to the next UTC day.
     */
    start() {
        this.stop()

        const hours = Number(elements.utc.hours.value) || 0
        const minutes = Number(elements.utc.minutes.value) || 0

        if (hours < 0 || minutes < 0) {
            showError(elements.utc.errorMessage)
            return
        }

        const utcTime = new Date()
        utcTime.setUTCHours(hours, minutes, 0, 0)
        this.targetTime = utcTime.getTime()

        hideErrors()
        this.active = true
        this.tick()
    }

    /**
     * Stops the UTC timer and clears the target time.
     */
    stop() {
        this.active = false
        this.targetTime = null
    }

    /**
     * Updates the display based on the remaining time until the target UTC time.
     *
     * Automatically rolls over to the next day if the target time has passed.
     */
    tick() {
        if (!this.active) return

        let timeDiff = this.targetTime - Date.now()
        if (timeDiff < 0) {
            this.targetTime += 24 * 60 * 60 * 1000
            timeDiff = this.targetTime - Date.now()
        }

        elements.display.textContent = secondsToDisplay(Math.floor(timeDiff / 1000))
    }
}

// Create timer instances
const countdownTimer = new CountdownTimer()
const utcTimer = new UTCTimer()

// Global functions for HTML buttons
window.setAndStartTimer = () => {
    countdownTimer.setAndStart()
    utcTimer.stop()
}
window.setMinuteSecondTimer = () => countdownTimer.setTime()
window.startTimer = () => countdownTimer.start()
window.stopTimer = () => {
    countdownTimer.stop()
    utcTimer.stop()
}
window.resetTimer = () => countdownTimer.reset()
window.startUTCTimer = () => {
    countdownTimer.reset()
    utcTimer.start()
}

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
 * Updates the displayed current date and time using UTC values.
 * The date is formatted as "D Month YYYY" and the time as "HH:MM UTC".
 */
function updateDateTime() {
    let currentTime = new Date()
    currentDateEl.textContent = `${currentTime.getUTCDate()} ${currentTime.toLocaleString('default', { month: 'long', timeZone: "UTC" })} ${currentTime.getUTCFullYear()}`
    currentTimeEl.textContent = `${String(currentTime.getUTCHours()).padStart(2, "0")}:${String(currentTime.getUTCMinutes()).padStart(2, "0")} UTC`
}

setInterval(() => {
    countdownTimer.tick()
    utcTimer.tick()
    filterMatches()
    updateDateTime()
}, 1000)