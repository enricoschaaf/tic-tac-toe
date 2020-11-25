import { nanoid } from "https://cdn.jsdelivr.net/npm/nanoid/nanoid.js"

const form = document.querySelector("#join-form")

document.querySelector("#create-room").href = nanoid(5)

form.addEventListener("submit", (event) => {
  event.preventDefault()
  window.location = event.target.id.value
})

