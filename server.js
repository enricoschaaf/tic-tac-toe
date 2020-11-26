import express from 'express'
import http from 'http'
import path from 'path'
import socketIo from 'socket.io'

const PORT = process.env.PORT || 3000

const app = express()
const server = http.createServer(app)
const io = socketIo(server, { pingInterval: 2000, pingTimeout: 1000 })

app.use(express.static(path.resolve(__dirname, 'public')))
app.get('/*', (req, res) => res.sendFile(path.resolve(__dirname, 'room.html')))

const rooms = /** @type {Map<string, Room>} */ (new Map())

/**
 * @typedef {'x' | 'o'} Player
 *
 * @typedef {Object} State
 * @prop {'idle' | 'active' | 'over' | 'reconnecting'} status
 * @prop {Array<Player?>} tiles
 * @prop {Player} currentPlayer
 * @prop {Player?} winner
 */

/** @returns {State} */
const getInitialState = () => ({
  status: 'idle',
  tiles: [...Array(9)].map(() => null),
  currentPlayer: Math.random() > 0.5 ? 'x' : 'o',
  winner: null,
})

class Room {
  roomId = ''
  players = /** @type {Map<string, Player>} */ (new Map())
  state = getInitialState()

  constructor(/** @type {string} */ roomId) {
    this.roomId = roomId
  }

  isCurrentPlayer(/** @type {string} */ id) {
    return this.players.get(id) === this.state.currentPlayer
  }

  join(/** @type {string} */ id) {
    const isFirst = this.players.size === 0
    const player = isFirst ? 'x' : 'o'

    this.players.set(id, player)
    io.to(id).emit('PLAYER_ASSIGNED', player)

    this.setState({ status: isFirst ? 'idle' : 'active' })
  }

  rejoin(/** @type {string} */ prevId, /** @type {string} */ id) {
    const player = this.players.get(prevId)

    this.players.delete(prevId)
    this.players.set(id, player)

    this.setState({ status: 'active' })
  }

  selectTile(/** @type {number} */ index) {
    const tiles = [...this.state.tiles]
    tiles[index] = this.state.currentPlayer

    const winner = checkForWinner(tiles)

    const isOver = Boolean(winner) || tiles.every((item) => item !== null)
    const status = isOver ? 'over' : this.state.status

    const nextPlayer = this.state.currentPlayer === 'x' ? 'o' : 'x'

    this.setState({ status, tiles, winner, currentPlayer: nextPlayer })
  }

  setState(/** @type {Partial<State>} */ nextState) {
    this.state = { ...this.state, ...nextState }
    for (const [id] of this.players) io.to(id).emit('UPDATE_STATE', this.state)
  }
}

io.on('connection', (socket) => {
  socket.on('JOIN_ROOM', (/** @type {string} */ roomId, /** @type {string?} */ prevId) => {
    if (!rooms.has(roomId)) rooms.set(roomId, new Room(roomId))

    const room = rooms.get(roomId)

    if (room.state.status === 'reconnecting' && room.players.has(prevId)) {
      room.rejoin(prevId, socket.id)
    } else {
      if (room.state.status !== 'idle') {
        socket.emit('ROOM_FULL')
        return
      }

      room.join(socket.id)
    }

    socket.on('disconnect', () => {
      if (room.state.status === 'active') room.setState({ status: 'reconnecting' })
      else {
        for (const [id] of room.players) io.to(id).emit('ROOM_CLOSED')
        rooms.delete(roomId)
      }
    })

    socket.on('TILE_CLICKED', (/** @type {number} */ tileIndex) => {
      if (room.state.status !== 'active') return
      if (!room.isCurrentPlayer(socket.id)) return

      room.selectTile(tileIndex)
    })

    socket.on('RESTART_GAME', () => {
      if (room.state.status !== 'over') return

      room.setState({ ...getInitialState(), status: 'active' })
    })
  })
})

const winningCombinations = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
]

/** @returns {Player?} */
function checkForWinner(/** @type {State['tiles']} */ tiles) {
  for (const combination of winningCombinations) {
    if (combination.every((i) => tiles[i] === 'x')) {
      return 'x'
    }

    if (combination.every((i) => tiles[i] === 'o')) {
      return 'o'
    }
  }

  return null
}

server.listen(PORT, 0, () => console.log(`Server is running on ${PORT}.`))
