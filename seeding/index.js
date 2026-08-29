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
    playerFlagEl.style.backgroundImage = `https://osuflags.omkserver.nl/${currentPlayer.player_flag}-200.png`
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
            document.getElementById(`${modName}${j + 1}`).children[2].textContent = currentPlayer[`#${modName}${j + 1}_rank`].toLocaleString()
        }
    }
}