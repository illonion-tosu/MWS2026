let playerCounter = 0
let players = []
// Load players
async function loadPlayers() {
    const response = await fetch("../_data/players.json")
    players = await response.json()

    // Sort and get right images
    players.sort((a, b) => b.player_seed - a.player_seed)
    players = players.slice(-33)

    // Preload images
    for (let i = 0; i < players.length; i++) {
        const img = new Image()
        img.src = `https://osuflags.omkserver.nl/${players[i].player_flag}-200.png`
    }
    displayStats()
}

loadPlayers()

const playerPfpEl = document.getElementById("player-pfp")
const playerFlagEl = document.getElementById("player-flag")
const playerNameEl = document.getElementById("player-name")
const playerRankEl = document.getElementById("player-rank")
const playerSeedEl = document.getElementById("player-seed")
const mods = [
    {
        mod: "nm",
        count: 5
    },
    {
        mod: "hr",
        count: 3
    },
    {
        mod: "dt",
        count: 3
    }
]

function displayStats() {
    const currentPlayer = players[playerCounter]

    playerPfpEl.setAttribute("src", `https://a.ppy.sh/${currentPlayer.player_id}`)
    playerFlagEl.style.backgroundImage = `url("https://osuflags.omkserver.nl/${currentPlayer.player_flag}-200.png")`
    playerNameEl.textContent = currentPlayer.player_name
    playerRankEl.textContent = `#${currentPlayer.player_rank.toLocaleString()}`
    playerSeedEl.textContent = `#${currentPlayer.player_seed.toLocaleString()}`

    // Mod ranks
    for (let i = 0; i < mods.length; i++) {
        const currentMod = mods[i]
        const modName = currentMod.mod
        document.getElementById(`${modName}-rank`).textContent = currentPlayer[`${modName}_rank`]

        for (let j = 0; j < currentMod.count; j++) {
            document.getElementById(`${modName}${j + 1}`).children[1].textContent = currentPlayer[`${modName}${j + 1}_score`].toLocaleString()
            document.getElementById(`${modName}${j + 1}`).children[2].textContent = `#${currentPlayer[`${modName}${j + 1}_rank`].toLocaleString()}`
        }
    }
}

function iteratePlayerCounter(action) {
    if (action === "plus") playerCounter++
    else playerCounter--

    if (playerCounter >= players.length) playerCounter = 0
    else if (playerCounter < 0) playerCounter = players.length - 1

    displayStats()
}

// Buttons
const previousPageEl = document.getElementById("previous-page")
const nextPageEl = document.getElementById("next-page")
document.addEventListener("DOMContentLoaded", () => {
    previousPageEl.addEventListener("click", () => iteratePlayerCounter("minus"))
    nextPageEl.addEventListener("click", () => iteratePlayerCounter("plus"))
})