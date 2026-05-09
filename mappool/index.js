import { createTosuWsSocket } from "../_shared/core/websocket.js"
import { initialiseOsuApi, getOsuApi } from "../_shared/core/apis.js"

initialiseOsuApi()

// Player Names
const leftProfilePictureEl = document.getElementById("left-profile-picture")
const rightProfilePictureEl = document.getElementById("right-profile-picture")
const leftPlayerNameEl = document.getElementById("left-player-name")
const rightPlayerNameEl = document.getElementById("right-player-name")
let currentLeftPlayer, currentRightPlayer

const socket = createTosuWsSocket()
socket.onmessage = async event => {
    const data = JSON.parse(event.data)
    console.log(data)

    if (currentLeftPlayer !== data.tourney.team.left) {
        currentLeftPlayer = data.tourney.team.left
        setPlayerDetails(currentLeftPlayer, leftPlayerNameEl, leftProfilePictureEl)
    }
    if (currentRightPlayer !== data.tourney.team.right) {
        currentRightPlayer = data.tourney.team.right
        setPlayerDetails(currentRightPlayer, rightPlayerNameEl, rightProfilePictureEl)
    }
}

async function setPlayerDetails(currentPlayer, playerNameEl, profilePictureEl) {
    if (currentPlayer === "") {
        playerNameEl.textContent = ""
        profilePictureEl.style.backgroundImage = "url()"
        return
    }

    try {
        const response = await fetch(`https://fairybread-cloud-vps.chickenkiller.com/api/get_user?k=${getOsuApi()}&u=${currentPlayer}`);
        if (!response.ok) { throw new Error(`Response status: ${response.status}`); }
        const result = await response.json();

        playerNameEl.textContent = result[0].username
        profilePictureEl.style.backgroundImage = `url("https://a.ppy.sh/${result[0].user_id}")`
    } catch(error) {
        console.error(error.message);
    }
}