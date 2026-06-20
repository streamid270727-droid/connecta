import { createServer } from "http"
import { Server, Socket } from "socket.io"

const httpServer = createServer()
const io = new Server(httpServer, {
  // DO NOT change the path, it is used by Caddy to forward the request to the correct port
  path: "/",
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// Map of userId -> Set<socketId> (a user can have multiple connections)
const userSockets = new Map<string, Set<string>>()
// Map of socketId -> userId
const socketUser = new Map<string, string>()
// Map of userId -> { name, username, avatarUrl }
const userProfiles = new Map<
  string,
  { name?: string; username?: string; avatarUrl?: string }
>()

function joinUser(userId: string, socketId: string) {
  if (!userSockets.has(userId)) userSockets.set(userId, new Set())
  userSockets.get(userId)!.add(socketId)
  socketUser.set(socketId, userId)
}

function leaveUser(socketId: string) {
  const userId = socketUser.get(socketId)
  if (userId) {
    const sockets = userSockets.get(userId)
    if (sockets) {
      sockets.delete(socketId)
      if (sockets.size === 0) {
        userSockets.delete(userId)
        userProfiles.delete(userId)
        io.emit("user:offline", { userId })
      }
    }
    socketUser.delete(socketId)
  }
}

function emitToUser(userId: string, event: string, data: any) {
  const sockets = userSockets.get(userId)
  if (!sockets) return
  for (const sid of sockets) {
    io.to(sid).emit(event, data)
  }
}

function isUserOnline(userId: string): boolean {
  const sockets = userSockets.get(userId)
  return !!sockets && sockets.size > 0
}

io.on("connection", (socket: Socket) => {
  console.log(`[chat-service] Socket connected: ${socket.id}`)

  // Client identifies itself after auth
  socket.on("user:online", (data: { userId: string; name?: string; username?: string; avatarUrl?: string }) => {
    if (!data?.userId) return
    joinUser(data.userId, socket.id)
    userProfiles.set(data.userId, {
      name: data.name,
      username: data.username,
      avatarUrl: data.avatarUrl,
    })
    // Broadcast online status to others
    io.emit("user:online", {
      userId: data.userId,
      name: data.name,
      username: data.username,
      avatarUrl: data.avatarUrl,
    })
    console.log(`[chat-service] User online: ${data.username || data.userId} (${userSockets.size} total online)`)
  })

  // Join a conversation room
  socket.on("conv:join", (data: { conversationId: string }) => {
    if (!data?.conversationId) return
    socket.join(`conv:${data.conversationId}`)
  })

  // Leave a conversation room
  socket.on("conv:leave", (data: { conversationId: string }) => {
    if (!data?.conversationId) return
    socket.leave(`conv:${data.conversationId}`)
  })

  // Client typing indicator
  socket.on("dm:typing", (data: { conversationId: string; recipientId: string; isTyping: boolean }) => {
    if (!data?.recipientId) return
    emitToUser(data.recipientId, "dm:typing", {
      conversationId: data.conversationId,
      userId: socketUser.get(socket.id),
      isTyping: data.isTyping,
    })
  })

  // Client stops typing
  socket.on("dm:stop-typing", (data: { conversationId: string; recipientId: string }) => {
    if (!data?.recipientId) return
    emitToUser(data.recipientId, "dm:stop-typing", {
      conversationId: data.conversationId,
      userId: socketUser.get(socket.id),
    })
  })

  // Server-to-server: Next.js API routes emit through here
  socket.on("server:register", (data: { role?: string }) => {
    // Mark as a Next.js API server (not a regular user)
    socketUser.set(socket.id, "__server__")
  })

  // Server emits: relay to specific user
  socket.on("server:emit-to-user", (data: { userId: string; event: string; data: any }) => {
    if (socketUser.get(socket.id) !== "__server__") return
    emitToUser(data.userId, data.event, data.data)
  })

  // Server emits: relay to a conversation room
  socket.on("server:emit-to-room", (data: { room: string; event: string; data: any }) => {
    if (socketUser.get(socket.id) !== "__server__") return
    io.to(data.room).emit(data.event, data.data)
  })

  // Check if user is online
  socket.on("user:check-online", (data: { userId: string }, ack?: (res: any) => void) => {
    if (ack) ack({ userId: data.userId, isOnline: isUserOnline(data.userId) })
  })

  // Get online users list
  socket.on("users:online-list", (_data: any, ack?: (res: any) => void) => {
    if (ack) {
      ack({
        users: Array.from(userSockets.keys()).map((uid) => ({
          userId: uid,
          ...userProfiles.get(uid),
        })),
      })
    }
  })

  socket.on("disconnect", () => {
    leaveUser(socket.id)
    console.log(`[chat-service] Socket disconnected: ${socket.id} (${userSockets.size} online)`)
  })

  socket.on("error", (err: Error) => {
    console.error(`[chat-service] Socket error (${socket.id}):`, err)
  })
})

const PORT = parseInt(process.env.CHAT_SERVICE_PORT || "3003")
httpServer.listen(PORT, () => {
  console.log(`[chat-service] Connecta WebSocket server running on port ${PORT}`)
})

process.on("SIGTERM", () => {
  console.log("[chat-service] SIGTERM received, shutting down...")
  httpServer.close(() => process.exit(0))
})
process.on("SIGINT", () => {
  console.log("[chat-service] SIGINT received, shutting down...")
  httpServer.close(() => process.exit(0))
})
