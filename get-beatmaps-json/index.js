import { delay } from "../_shared/core/utils.js"
import { initialiseOsuApi, getOsuApi } from "../_shared/core/apis.js"

let allBeatmapsJson = []
let fullJson = []

const downloadingDataEl = document.getElementById("downloading-data")

async function getBeatmaps() {
    const response = await fetch("../_data/beatmaps-base.json")
    const responseJson = await response.json()
    const allBeatmaps = responseJson.beatmaps

    for (let i = 0; i < allBeatmaps.length; i++) {
        // Set mod number
        let modNumber = 0
        if (allBeatmaps[i].mod.includes("HR")) modNumber += 16
        if (allBeatmaps[i].mod.includes("EZ")) modNumber += 2
        if (allBeatmaps[i].mod.includes("DT")) modNumber = 64
        
        // Get API response
        const response = await fetch(
          `https://osu.ppy.sh/api/get_beatmaps?k=${getOsuApi()}&b=${allBeatmaps[i].beatmap_id}&mods=${modNumber}`
        )
        await delay(1000)
        let responseJson = await response.json()

        downloadingDataEl.textContent = `Downloading Data: ${i + 1} / ${allBeatmaps.length}`

        responseJson[0] = {
            // "approved": responseJson[0].approved,
            // "approved_date": responseJson[0].approved_date,
            "artist": responseJson[0].artist,
            // "artist_unicode": responseJson[0].artist_unicode,
            // "audio_unavailable": responseJson[0].audio_unavailable,
            "beatmap_id": responseJson[0].beatmap_id,
            "beatmapset_id": responseJson[0].beatmapset_id,
            "bpm": responseJson[0].bpm,
            // "count_normal": responseJson[0].count_normal,
            // "count_slider": responseJson[0].count_slider,
            // "count_spinner": responseJson[0].count_spinner,
            "creator": responseJson[0].creator,
            // "creator_id": responseJson[0].creator_id,
            // "diff_aim": responseJson[0].diff_aim,
            "diff_approach": responseJson[0].diff_approach,
            // "diff_drain": responseJson[0].diff_drain,
            "diff_overall": responseJson[0].diff_overall,
            "diff_size": responseJson[0].diff_size,
            // "diff_speed": responseJson[0].diff_speed,
            "difficultyrating": responseJson[0].difficultyrating,
            // "download_unavailable": responseJson[0].download_unavailable,
            // "favourite_count": responseJson[0].favourite_count,
            // "file_md5": responseJson[0].file_md5,
            // "genre_id": responseJson[0].genre_id,
            // "hit_length": responseJson[0].hit_length,
            // "language_id": responseJson[0].language_id,
            // "last_update": responseJson[0].last_update,
            // "max_combo": responseJson[0].max_combo,
            // "mode": responseJson[0].mode,
            // "packs": responseJson[0].packs,
            // "passcount": responseJson[0].passcount,
            // "playcount": responseJson[0].playcount,
            // "rating": responseJson[0].rating,
            // "source": responseJson[0].source,
            // "storyboard": responseJson[0].storyboard,
            // "submit_date": responseJson[0].submit_date,
            // "tags": responseJson[0].tags,
            "title": responseJson[0].title,
            // "title_unicode": responseJson[0].title_unicode,
            "total_length": responseJson[0].total_length,
            "version": responseJson[0].version,
            // "video": responseJson[0].video
        }

        responseJson[0].mod = allBeatmaps[i].mod
        responseJson[0].order = allBeatmaps[i].order
        responseJson[0].extra_mod = allBeatmaps[i].extra_mod

        allBeatmapsJson.push(responseJson[0])
    }

    fullJson = {
        "roundName": responseJson.roundName,
        "beatmaps": allBeatmapsJson
    }

    const jsonString = JSON.stringify(fullJson, null, 4)
    const blob = new Blob([jsonString], { type: "application/json" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = "beatmaps.json"
    link.click()
}

async function initialise() {
    buttonEl.disabled = true
    await initialiseOsuApi()
    await getBeatmaps()
    buttonEl.disabled = false
}

const buttonEl = document.getElementById("button")
window.addEventListener("load", () => {
    buttonEl.addEventListener("click", initialise)
})