// Load osu! api
let osuApi
export async function initialiseOsuApi() {
    const response = await fetch("../_data/osu-api.json")
    const responseJson = await response.json()
    osuApi = responseJson.api
}

// Get osu! api
export function getOsuApi() {
    return osuApi
}