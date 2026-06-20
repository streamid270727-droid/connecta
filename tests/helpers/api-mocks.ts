import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}))

vi.mock("next-auth/providers/credentials", () => ({
  default: vi.fn(() => ({})),
}))

vi.mock("@/lib/socket-server", () => ({
  notifyUser: vi.fn().mockResolvedValue(undefined),
  emitToUser: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("fs/promises", () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
  unlink: vi.fn().mockResolvedValue(undefined),
}))

const mockDb = {
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  post: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  comment: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  like: {
    findUnique: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  commentLike: {
    findUnique: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  share: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  savedPost: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
  friendship: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    deleteMany: vi.fn(),
  },
  friendRequest: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
  notification: {
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    count: vi.fn(),
  },
  story: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
  storyView: {
    create: vi.fn(),
  },
  storyReaction: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  conversation: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  directMessage: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
  messageRead: {
    upsert: vi.fn(),
  },
  blockedUser: {
    findUnique: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
  report: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  $transaction: vi.fn((fns: unknown[]) => Promise.all(fns)),
}

vi.mock("@/lib/db", () => ({
  db: mockDb,
}))

vi.mock("bcryptjs", () => ({
  hash: vi.fn().mockResolvedValue("hashed-password"),
  compare: vi.fn().mockResolvedValue(true),
}))

export { mockDb }
