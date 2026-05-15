// Load in matches
let allMatches = []
/**
 * Fetches match data from the JSON file and populates the {@link allMatches} array.
 * @async
 * @returns {Promise<void>}
 */
async function getMatches() {
    const response = await fetch("../_data/matches.json")
    const responseJson = await response.json()
    allMatches = responseJson
}
getMatches()

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