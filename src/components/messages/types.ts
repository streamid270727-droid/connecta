export interface ChatUser {
  id: string
  name: string
  username: string
  avatarUrl: string | null
  isVerified: boolean
}

export interface Conversation {
  id: string
  otherUser: ChatUser
  lastMessage: {
    id: string
    content: string
    createdAt: string
    senderId: string
    isRead: boolean
  } | null
  unreadCount: number
  updatedAt: string
}

export interface ChatMessage {
  id: string
  conversationId: string
  senderId: string
  recipientId: string
  content: string
  isRead: boolean
  createdAt: string
  sender: ChatUser
}

export interface IncomingSocketMessage {
  id: string
  conversationId: string
  senderId: string
  senderName?: string
  content: string
  createdAt: string
}

export interface TypingPayload {
  conversationId: string
  userId?: string
  isTyping?: boolean
}

export interface ReadPayload {
  conversationId: string
  readBy: string
}

export interface OnlineAck {
  userId: string
  isOnline: boolean
}

export interface FriendForCompose {
  id: string
  name: string
  username: string
  avatarUrl: string | null
  isVerified: boolean
}
