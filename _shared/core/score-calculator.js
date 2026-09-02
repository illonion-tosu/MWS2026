const recipeLogic = {
    2: (p) => ({ ...p, winValue: p.score + 50000 }),
    5: (p) => ({ ...p, winValue: p.score + 100000 }),
    10: (p) => ({ ...p, winValue: p.score + 200000 }),
    12: (p) => ({ ...p, winValue: p.accuracy, isAccWin: true }),
    13: (p) => ({ ...p, winValue: Math.round(p.score * 1.1) }),
    "default": (p) => ({ ...p, winValue: p.score })
}

const externalScoreLogic = {
    "acc": (p) => ({ ...p, winValue: p.accuracy, isAccWin: true, }),
    "miss": (p) => ({ ...p, winValue: p.play.hits["0"], isAccWin: false, isMissWin: true })
}

// Map id from previous tournaments that have acc wincon
const array = [4665741, 4588047, 3476632]

/**
 * @param {number} redRecipeId - Recipe ID for red
 * @param {number} blueRecipeId - Recipe ID for blue
 * @param {Object} redPlay - 'play' object for red
 * @param {Object} bluePlay - 'play' object for blue
 * @param {string} user - 'red' or 'blue'
 */
export function calculateScore(redRecipeId, blueRecipeId, redPlay, bluePlay, currentMap, nowPlayingId) {
    let redModified = { ...redPlay, winValue: redPlay.score };
    let blueModified = { ...bluePlay, winValue: bluePlay.score };

    // Recipe logic
    let redLogic, blueLogic
    if (redRecipeId === 12 || blueRecipeId === 12) {
        let recipeId = 12
        redLogic = recipeLogic[recipeId] ?? recipeLogic["default"]
        blueLogic = recipeLogic[recipeId] ?? recipeLogic["default"]
    } else {
        redLogic = recipeLogic[redRecipeId] ?? recipeLogic["default"]
        blueLogic = recipeLogic[blueRecipeId] ?? recipeLogic["default"]
    }

    // External map logic
    if ((currentMap && currentMap.wincon !== "score") || array.includes(nowPlayingId)) {
        const wincon = currentMap ? currentMap.wincon : "acc"
        redLogic = externalScoreLogic[wincon]
        blueLogic = externalScoreLogic[wincon]
    }

    redModified = redLogic(redModified)
    blueModified = blueLogic(blueModified)

    let winner = "Tie"
    if (currentMap && currentMap.wincon === "miss") {
        if (redModified.winValue < blueModified.winValue) winner = "Red"
        if (blueModified.winValue < redModified.winValue) winner = "Blue"
    } else {
        if (redModified.winValue > blueModified.winValue) winner = "Red"
        if (blueModified.winValue > redModified.winValue) winner = "Blue"
    }

    return {
        winner,
        redFinalScore: redModified.score,
        blueFinalScore: blueModified.score,
        redWinValue: redModified.winValue,
        blueWinValue: blueModified.winValue,
        comparisonMethod: redModified.isAccWin ? "acc" : redModified.isMissWin ? "miss" : "score"
    }
}