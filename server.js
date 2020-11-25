import express from "express"
import http from "http"
import path from "path"
import socketIo from "socket.io"

const isProd = process.env.NODE_ENV === "production"

const app = express()
const server = http.createServer(app)

const PORT = process.env.PORT || 3000

const getInitialState = () => ({
  player: Math.random() > 0.5 ? "x" : "o",
  tiles: Array.from(Array(9), () => null),
  status: "idle",
  winningPlayer: null,
})

class Room {
  players = { x: null, o: null }
  state = getInitialState()
}

const rooms = new Map()

const io = socketIo(server)

app.use(express.static(path.resolve(__dirname, "public")))

app.get("/:roomId", (_req, res) => {
  res.sendFile(path.resolve(__dirname, "room.html"))
})

io.on("connection", (socket) => {
  socket.on("JOIN_ROOM", (roomId, successCallback) => {
    if (!rooms.has(roomId)) {
      socket.join(roomId)
      successCallback()
      const room = new Room()
      socket.emit("PLAYER", "x")
      room.players.x = socket.id
      rooms.set(roomId, room)
    } else {
      const room = rooms.get(roomId)

      if (room.state.status !== "idle") {
        return socket.emit("ROOM_FULL")
      }

      socket.join(roomId)
      successCallback()
      socket.emit("PLAYER", "o")
      room.players.o = socket.id
      room.state.status = "started"

      io.to(roomId).emit("START", room.state)
    }

    socket.on("disconnect", () => {
      io.to(roomId).emit("DELETE_ROOM")
      rooms.delete(roomId)
    })

    socket.on("CLICK", (index) => {
      const room = rooms.get(roomId)
      const player = room.players.x === socket.id ? "x" : "o"

      if (player !== room.state.player) return
      if (room.state.status !== "started") return

      room.state.tiles[index] = player
      room.state.player = player === "x" ? "o" : "x"

      const [status, winningPlayer] = getStatusFromTiles(room.state.tiles)

      room.state.status = status
      room.state.winningPlayer = winningPlayer

      io.to(roomId).emit("UPDATE", room.state)
    })

    socket.on("RESTART", () => {
      const room = rooms.get(roomId)

      if (room.state.status === "over") {
        room.state = getInitialState()
        room.state.status = "started"
        io.to(roomId).emit("UPDATE", room.state)
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
    if (combination.every((index) => tiles[index] === "x")) {
      return ["over", "x"]
    }
    if (combination.every((index) => tiles[index] === "o")) {
      return ["over", "o"]
    }
  }

  if (tiles.every((item) => item !== null)) return ["over"]

  return ["started"]
}

server.listen(
  PORT,
  () => !isProd && console.log(`Server is running on ${PORT}.`),
)
