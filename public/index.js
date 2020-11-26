const form = document.querySelector('#join-form')
const input = form.querySelector('input')

/** @type {HTMLAnchorElement} */
const createRoom = document.querySelector('#create-room')

createRoom.href = nanoid(5)

form.addEventListener('submit', (evt) => {
  evt.preventDefault()

  let id = input.value
  if (id.match(/^https?:\/\//)) {
    id = new URL(id).pathname.slice(1)
  }

  window.location.href = id
})

function nanoid(t = 21) {
  let e = ''
  let r = crypto.getRandomValues(new Uint8Array(t))

  for (; t--; ) {
    let n = 63 & r[t]
    e += n < 36 ? n.toString(36) : n < 62 ? (n - 26).toString(36).toUpperCase() : n < 63 ? '_' : '-'
  }
  return e
}
