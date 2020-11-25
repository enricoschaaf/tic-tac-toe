import io from 'https://cdn.skypack.dev/socket.io-client/dist/socket.io.min'

const $ = document.querySelector.bind(document)
const $$ = document.querySelectorAll.bind(document)

const room = window.location.pathname.slice(1)

const main = $('main')
const youAre = $('#player')
const loading = $('#loading')
const currentPlayer = $('#current-player')
const gameContainer = $('#game-container')
const noOverElements = $$('.js-no-over')
const title = $('#title')
const buttons = [...Array(9)].map(() => document.createElement('button'))

document.title += ` (${room})`

const socket = io()

let player

socket.on('connect', () => {
  socket.emit('JOIN_ROOM', room, () => {
    loading.textContent = 'Waiting for another player... Your ID: '
    const id = document.createElement('button')
    id.className = 'font-bold cursor-default'
    id.textContent = room

    if (navigator.clipboard) {
      id.textContent += ' (copy)'
      id.className += ' cursor-pointer underline hover:text-blue-400'
      id.addEventListener('click', () => {
        const href = new URL(room, window.location).href
        navigator.clipboard.writeText(href).then(() => alert('Copied to clipboard'))
      })
    }
    loading.append(id)
  })
})

socket.on('ROOM_FULL', () => {
  alert('Room already full!')
  window.location = '/'
})

socket.on('DELETE_ROOM', () => (window.location = '/'))

socket.on('START', startGame)

socket.on('PLAYER', (nextPlayer) => (player = nextPlayer))

socket.on('UPDATE', render)

function startGame(nextState) {
  loading.remove()
  main.classList.remove('hidden')
  main.classList.add('flex')
  render(nextState)
}

let restartButton
function render(state) {
  if (state.status === 'over') {
    let msg = 'Nobody won.'
    if (state.winningPlayer) {
      msg = state.winningPlayer === player ? 'You won!' : 'You lost.'
    }
    title.textContent = msg

    restartButton = document.createElement('button')
    restartButton.className = 'p-2 px-4 mx-auto mt-4 bg-blue-100 border-2 border-blue-400 rounded'
    restartButton.textContent = 'Restart'
    restartButton.addEventListener('click', () => socket.emit('RESTART'))
    document.body.append(restartButton)
  } else {
    if (restartButton) restartButton.remove()
    title.textContent = 'Tic Tac Toe'
  }

  noOverElements.forEach((el) => el.classList.toggle('hidden', state.status === 'over'))

  youAre.innerHTML = `You play as <span class="font-bold">${player}</span>.`
  currentPlayer.textContent = player === state.player ? "It's your turn." : 'Wait for your turn...'

  for (const [index, button] of buttons.entries()) {
    button.disabled = state.player !== player || state.tiles[index]

    if (state.tiles[index]) {
      button.textContent = state.tiles[index]
    } else {
      button.textContent = ''
    }
  }
}

function handleButtonClick(tileId) {
  socket.emit('CLICK', tileId)
}

for (const [index, button] of buttons.entries()) {
  button.className =
    'w-12 h-12 border border-black grid-row-3 grid-col-3 disabled:cursor-none disabled:bg-gray-200'

  button.addEventListener('click', () => handleButtonClick(index))
  gameContainer.append(button)
}
