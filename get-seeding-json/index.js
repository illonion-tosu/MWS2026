let fullJson = []
async function getBeatmaps() {
    const textarea = document.getElementById("textarea")
    const playerDetails = textarea.value.split("\n")
    
    for (let i = 0; i < playerDetails.length; i++) {
        const playerDetailsIndividual = playerDetails[i].split("\t")

        if (!playerDetailsIndividual[3]) continue
        fullJson.push({
            "player_name": playerDetailsIndividual[0],
            "player_flag": playerDetailsIndividual[1],
            "player_rank": Number(playerDetailsIndividual[2]),
            "player_id": Number(playerDetailsIndividual[19]),
            "player_seed": Number(playerDetailsIndividual[14]),
            "nm_rank": Number(playerDetailsIndividual[15]),
            "hr_rank": Number(playerDetailsIndividual[16]),
            "dt_rank": Number(playerDetailsIndividual[17]),
            "nm1_score": Number(playerDetailsIndividual[3]),
            "nm2_score": Number(playerDetailsIndividual[4]),
            "nm3_score": Number(playerDetailsIndividual[5]),
            "nm4_score": Number(playerDetailsIndividual[6]),
            "nm5_score": Number(playerDetailsIndividual[7]),
            "hr1_score": Number(playerDetailsIndividual[8]),
            "hr2_score": Number(playerDetailsIndividual[9]),
            "hr3_score": Number(playerDetailsIndividual[10]),
            "dt1_score": Number(playerDetailsIndividual[11]),
            "dt2_score": Number(playerDetailsIndividual[12]),
            "dt3_score": Number(playerDetailsIndividual[13]),
        })
    }

    const jsonString = JSON.stringify(fullJson, null, 4)
    const blob = new Blob([jsonString], { type: "application/json" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = "players.json"
    link.click()
}

const buttonEl = document.getElementById("button")
window.addEventListener("load", () => {
    buttonEl.addEventListener("click", getBeatmaps)
})