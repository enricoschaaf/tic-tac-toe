import io from 'https://cdn.skypack.dev/socket.io-client/dist/socket.io.min'

const $ = document.querySelector.bind(document)
const create = (tag, attrs = {}) => Object.assign(document.createElement(tag), attrs)

const socket = io()
const roomId = window.location.pathname.slice(1)

let player = null

document.title += ` (${roomId})`

const $main = $('#main')
const $gameContainer = $('#game-container')
const $restartButton = $('#restart')
const $player = $('#player')
const $loading = $('#loading')
const $currentPlayer = $('#current-player')
const $title = $('#title')
const $buttons = [...Array(9)].map((_, index) => {
  return create('button', {
    className: `w-12 h-12 border border-black disabled:cursor-none disabled:bg-gray-200`,
    onclick: () => socket.emit('TILE_CLICKED', index),
  })
})

$restartButton.addEventListener('click', () => socket.emit('RESTART_GAME'))
$gameContainer.append(...$buttons)

socket.on('connect', () => socket.emit('JOIN_ROOM', roomId))

socket.on('disconnect', () => {
  alert('You are no longer connected to the game room.')
  window.location = '/'
})

socket.on('ROOM_FULL', () => {
  alert('The game room is already full!')
  window.location = '/'
})

socket.on('DELETE_ROOM', () => {
  alert('Your opponent left the game!')
  window.location = '/'
})

socket.on('PLAYER_ASSIGNED', (nextPlayer) => (player = nextPlayer))

socket.on('UPDATE_STATE', (state) => {
  window.state = state
  renderMain(state)
  renderLoading(state)
  renderPlayer(state)
  renderCurrentPlayer(state)
  renderButtons(state)
  renderOver(state)
})

function renderMain({ status }) {
  $main.classList.toggle('hidden', status === 'idle')
  $main.classList.toggle('flex', status !== 'idle')
}

function renderLoading({ status }) {
  $loading.classList.toggle('hidden', status !== 'idle')
  if (status !== 'idle') return

  $loading.textContent = 'Waiting for another player... Your ID: '

  const canCopy = Boolean(navigator.clipboard)

  const id = canCopy ? create('button') : create('span', { className: 'font-bold' })
  id.textContent = roomId

  if (canCopy) {
    id.textContent += ' (copy)'
    id.className += ' font-bold cursor-pointer underline hover:text-blue-400'
    id.addEventListener('click', () => {
      const href = new URL(roomId, window.location).href
      navigator.clipboard.writeText(href).then(() => {
        id.textContent = id.textContent.replace('(copy)', '(copied ✔)')
      })
    })
  }

  $loading.append(id)
}

function renderPlayer({ status }) {
  $player.parentElement.classList.toggle('hidden', status === 'over')
  if (status === 'over') return

  $player.textContent = player
}

function renderCurrentPlayer({ status, currentPlayer }) {
  $currentPlayer.classList.toggle('hidden', status === 'over')
  if (status === 'over') return

  const isCurrentPlayer = player === currentPlayer
  $currentPlayer.textContent = isCurrentPlayer ? "It's your turn." : 'Wait for your turn...'
}

function renderButtons({ status, currentPlayer, tiles }) {
  for (const [index, button] of $buttons.entries()) {
    const tileValue = tiles[index]
    button.disabled = status !== 'started' || currentPlayer !== player || tileValue !== null
    button.textContent = tileValue || ''
  }
}

function renderOver({ status, winningPlayer }) {
  $restartButton.classList.toggle('hidden', status !== 'over')

  let msg = 'Tic Tac Toe'

  if (status === 'over') {
    msg = winningPlayer ? (winningPlayer === player ? 'You won!' : 'You lost.') : 'Nobody won.'
  }

  $title.textContent = msg
}
