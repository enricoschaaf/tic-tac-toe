import { nanoid } from 'https://cdn.skypack.dev/nanoid/nanoid.js'

const form = document.querySelector('#join-form')

document.querySelector('#create-room').href = nanoid(5)

form.addEventListener('submit', (event) => {
  event.preventDefault()

  let id = event.target.id.value

  if (id.match(/^https?:\/\//)) {
    id = new URL(id).pathname.slice(1)
  }

  window.location = id
})
