import { io as serverIo, Socket } from "socket.io-client"

let serverSocket: Socket | null = null
let connecting: Promise<Socket | null> | null = null

/**
 * Server-side helper to emit events to the chat-service (Socket.io on port 3003).
 * Used by Next.js API routes to push real-time updates to clients.
 */
export function getServerSocket(): Promise<Socket | null> {
  if (serverSocket?.connected) {
    return Promise.resolve(serverSocket)
  }
  if (connecting) return connecting

  connecting = new Promise((resolve) => {
    try {
      // Connect to our own gateway, which forwards to port 3003
      // We use the gateway via relative path won't work in server context, so use localhost
      const sock = serverIo(process.env.CHAT_SERVICE_URL || "http://localhost:3003", {
        transports: ["websocket"],
        forceNew: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 500,
        timeout: 3000,
      })

      sock.on("connect", () => {
        serverSocket = sock
        // Identify as a Next.js server
        sock.emit("server:register", { role: "nextjs-api" })
        resolve(sock)
      })

      sock.on("connect_error", () => {
        resolve(null)
      })

      // Don't wait forever
      setTimeout(() => {
        if (!sock.connected) resolve(null)
      }, 2500)
    } catch (e) {
      resolve(null)
    }
  })

  return connecting
}

/**
 * Emit an event to a specific user room via the chat service.
 */
export async function emitToUser(userId: string, event: string, data: any) {
  const sock = await getServerSocket()
  if (!sock) return
  sock.emit("server:emit-to-user", { userId, event, data })
}

/**
 * Emit an event to a conversation room.
 */
export async function emitToConversation(
  conversationId: string,
  event: string,
  data: any
) {
  const sock = await getServerSocket()
  if (!sock) return
  sock.emit("server:emit-to-room", { room: `conv:${conversationId}`, event, data })
}

/**
 * Broadcast a notification to a user (used by API routes after creating a notification).
 */
export async function notifyUser(
  userId: string,
  payload: { title: string; body: string; type?: string; entityId?: string }
) {
  await emitToUser(userId, "notif:new", {
    recipientId: userId,
    ...payload,
  })
}
