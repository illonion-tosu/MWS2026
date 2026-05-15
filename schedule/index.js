// Current Date and Time
const currentDateEl = document.getElementById("current-date")
const currentTimeEl = document.getElementById("current-time")
setInterval(() => {
    let currentTime = new Date()
    currentDateEl.textContent = `${currentTime.getUTCDate()} ${currentTime.toLocaleString('default', { month: 'long', timeZone: "UTC" })} ${currentTime.getUTCFullYear()}`
    currentTimeEl.textContent = `${String(currentTime.getUTCHours()).padStart(2, "0")}:${String(currentTime.getUTCMinutes()).padStart(2, "0")} UTC`
}, 1000)