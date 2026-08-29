let playerCounter = 0
let players = []
// Load players
async function loadPlayers() {
    const response = await fetch("../_data/players.json")
    players = await response.json()

    players.sort((a, b) => b.player_seed - a.player_seed)
    displayStats()
}

loadPlayers()

const playerPfpEl = document.getElementById("player-pfp")
const playerFlagEl = document.getElementById("player-flag")
const playerNameEl = document.getElementById("player-name")
const playerRankEl = document.getElementById("player-rank")

function displayStats() {
    const currentPlayer = players[playerCounter]

    playerPfpEl.setAttribute("src", `https://a.ppy.sh/${currentPlayer.player_id}`)
    playerFlagEl.style.backgroundImage = `https://osuflags.omkserver.nl/${currentPlayer.player_flag}-200.png`
    playerNameEl.textContent = currentPlayer.player_name
    playerRankEl.textContent = `#${currentPlayer.player_rank.toLocaleString()}`
}