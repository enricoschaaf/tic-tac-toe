import express from 'express'
import http from 'http'
import path from 'path'
import socketIo from 'socket.io'

const app = express()
const server = http.createServer(app)

const PORT = process.env.PORT || 3000

const getInitialState = () => ({
  status: 'idle',
  tiles: [...Array(9)].map(() => null),
  currentPlayer: Math.random() > 0.5 ? 'x' : 'o',
  winningPlayer: null,
})

class Room {
  playerIds = { x: null, o: null }
  state = getInitialState()
}

const rooms = new Map()

const io = socketIo(server)

app.use(express.static(path.resolve(__dirname, 'public')))

app.get('/:roomId', (_req, res) => {
  res.sendFile(path.resolve(__dirname, 'room.html'))
})

io.on('connection', (socket) => {
  socket.on('JOIN_ROOM', (roomId) => {
    if (!rooms.has(roomId)) {
      socket.join(roomId)
      const room = new Room()
      socket.emit('PLAYER_ASSIGNED', 'x')
      rooms.set(roomId, room)
      room.playerIds.x = socket.id
      io.to(roomId).emit('UPDATE_STATE', room.state)
    } else {
      const room = rooms.get(roomId)

      if (room.state.status !== 'idle') {
        return socket.emit('ROOM_FULL')
      }

      socket.join(roomId)
      socket.emit('PLAYER_ASSIGNED', 'o')
      room.playerIds.o = socket.id
      room.state.status = 'started'
      io.to(roomId).emit('UPDATE_STATE', room.state)
    }

    socket.on('disconnect', () => {
      io.to(roomId).emit('DELETE_ROOM')
      rooms.delete(roomId)
    })

    socket.on('TILE_CLICKED', (index) => {
      const room = rooms.get(roomId)
      const player = room.playerIds.x === socket.id ? 'x' : 'o'

      if (player !== room.state.currentPlayer) return
      if (room.state.status !== 'started') return

      room.state.tiles[index] = player
      room.state.currentPlayer = player === 'x' ? 'o' : 'x'

      const [status, winningPlayer] = getStatusFromTiles(room.state.tiles)

      room.state.status = status
      room.state.winningPlayer = winningPlayer

      io.to(roomId).emit('UPDATE_STATE', room.state)
    })

    socket.on('RESTART_GAME', () => {
      const room = rooms.get(roomId)

      if (room.state.status === 'over') {
        room.state = getInitialState()
        room.state.status = 'started'
        io.to(roomId).emit('UPDATE_STATE', room.state)
      }
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

function getStatusFromTiles(tiles) {
  for (const combination of winningCombinations) {
    if (combination.every((index) => tiles[index] === 'x')) {
      return ['over', 'x']
    }
    if (combination.every((index) => tiles[index] === 'o')) {
      return ['over', 'o']
    }
  }

  if (tiles.every((item) => item !== null)) return ['over', null]

  return ['started', null]
}

server.listen(PORT, () => console.log(`Server is running on ${PORT}.`))
