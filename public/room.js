import _io from 'https://cdn.skypack.dev/pin/socket.io-client@v4.4.1-pEjk4e0IcGsxDJ4ZWnD7/mode=raw,min/dist/socket.io.esm.min.js'

const io = /** @type {import('socket.io-client')} */ (/** @type {unknown}*/ (_io))

/**
 * @template {keyof HTMLElementTagNameMap} Tag
 * @param {Tag} tag
 * @param {Partial<HTMLElementTagNameMap[Tag]>} attrs
 * @returns {HTMLElementTagNameMap[Tag]}
 */
const create = (tag, attrs = {}) => Object.assign(document.createElement(tag), attrs)

/** @type {Document['querySelector']} */
const $ = document.querySelector.bind(document)

const socket = io()
const roomId = window.location.pathname.slice(1)

let player = /** @type {import('../server').Player} */ (null)

document.title += ` (${roomId})`

const $main = $('#main')
const $gameContainer = $('#game-container')
const $restartButton = $('#restart')
const $player = $('#player')
const $loading = $('#loading')
const $currentPlayer = $('#current-player')
const $title = $('#title')
const $reconnect = document.body.appendChild(create('p', { className: 'text-center font-bold' }))
const $buttons = [...Array(9)].map((_, index) => {
  return create('button', {
    className: `w-12 h-12 border border-black disabled:cursor-none disabled:bg-gray-200`,
    onclick: () => socket.emit('TILE_CLICKED', index),
  })
})

$restartButton.addEventListener('click', () => socket.emit('RESTART_GAME'))
$gameContainer.append(...$buttons)

let prevId = /** @type {string} */ (null)

socket.on('connect', () => {
  socket.emit('JOIN_ROOM', roomId, prevId)
  prevId = socket.id
})

socket.on('disconnect', () => {
  renderReconnect('offline')
  renderButtons({ status: 'over', currentPlayer: 'x', tiles: [], winner: null })
})

socket.on('ROOM_FULL', () => {
  alert('This game room is already full.')
  window.location.href = '/'
})

socket.on('ROOM_CLOSED', () => {
  alert('Your opponent left the game!')
  window.location.href = '/'
})

socket.on('PLAYER_ASSIGNED', (/** @type {import('../server').Player} */ nextPlayer) => {
  player = nextPlayer
})

socket.on('UPDATE_STATE', (/** @type {import('../server').State} */ state) => {
  renderMain(state)
  renderLoading(state)
  renderReconnect(state.status)
  renderPlayer(state)
  renderCurrentPlayer(state)
  renderButtons(state)
  renderOver(state)
})

/** @param {import('../server').State} state */
function renderMain({ status }) {
  $main.classList.toggle('hidden', status === 'idle')
  $main.classList.toggle('flex', status !== 'idle')
}

/** @param {import('../server').State} state */
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
      const { href } = new URL(roomId, window.location.href)
      navigator.clipboard.writeText(href).then(() => {
        id.textContent = id.textContent.replace('(copy)', '(copied ✔)')
      })
    })
  }

  $loading.append(id)
}

/** @param {import('../server').State['status'] | 'offline'} status */
function renderReconnect(status) {
  switch (status) {
    case 'offline':
      return ($reconnect.textContent = 'Trying to reconnect...')
    case 'reconnecting':
      return ($reconnect.textContent = 'Waiting for your opponent to reconnect...')
    default:
      $reconnect.innerHTML = '&nbsp;'
  }
}

/** @param {import('../server').State} state */
function renderPlayer({ status }) {
  $player.parentElement.classList.toggle('hidden', status === 'over')
  if (status === 'over') return

  $player.textContent = player
}

/** @param {import('../server').State} state */
function renderCurrentPlayer({ status, currentPlayer }) {
  $currentPlayer.classList.toggle('hidden', status === 'over')
  if (status === 'over') return

  const isCurrentPlayer = player === currentPlayer
  $currentPlayer.textContent = isCurrentPlayer ? "It's your turn." : 'Wait for your turn...'
}

/** @param {import('../server').State} state */
function renderButtons({ status, currentPlayer, tiles }) {
  for (const [index, button] of $buttons.entries()) {
    const tileValue = tiles[index]
    button.disabled = status !== 'active' || currentPlayer !== player || tileValue !== null
    button.textContent = tileValue || ''
  }
}

/** @param {import('../server').State} state */
function renderOver({ status, winner }) {
  $restartButton.classList.toggle('hidden', status !== 'over')

  if (status === 'over') {
    $title.textContent = winner ? (winner === player ? 'You won!' : 'You lost.') : 'Nobody won.'
  } else $title.textContent = 'Tic Tac Toe'
}
