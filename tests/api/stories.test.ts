import { describe, it, expect, vi, beforeEach } from "vitest"
import { mockDb } from "../helpers/api-mocks"

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}))

import { getServerSession } from "next-auth"
import { GET, POST } from "@/app/api/stories/route"

const mockedGetSession = vi.mocked(getServerSession)

describe("GET /api/stories", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns 401 when not authenticated", async () => {
    mockedGetSession.mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it("returns grouped stories", async () => {
    mockedGetSession.mockResolvedValue({
      user: { id: "user-1", name: "Test", image: null },
      expires: "2099-01-01",
    })
    mockDb.friendship.findMany.mockResolvedValue([{ friendId: "user-2" }])
    // deleteMany returns a thenable (for .catch() in route)
    const deleteManyResult = { catch: () => {} }
    mockDb.story.deleteMany.mockReturnValue(deleteManyResult as any)
    mockDb.story.findMany.mockResolvedValue([
      {
        id: "s1", authorId: "user-2", mediaUrl: null, content: "Hello",
        bgColor: "#ff0000", textColor: "#fff", createdAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        author: { id: "user-2", name: "A", username: "a", avatarUrl: null, isVerified: false },
        views: [], _count: { views: 5 },
      },
    ])
    const res = await GET()
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.groups).toHaveLength(1)
  })
})

describe("POST /api/stories", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns 401 when not authenticated", async () => {
    mockedGetSession.mockResolvedValue(null)
    const res = await POST(new Request("http://localhost:3000/api/stories", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "Test" }),
    }))
    expect(res.status).toBe(401)
  })

  it("creates a story", async () => {
    mockedGetSession.mockResolvedValue({
      user: { id: "user-1", name: "Test", image: null },
      expires: "2099-01-01",
    })
    mockDb.story.create.mockResolvedValue({
      id: "s-new", authorId: "user-1", content: "My story",
      mediaUrl: null, bgColor: null, textColor: "#fff",
      createdAt: new Date(), expiresAt: new Date(Date.now() + 86400000),
      author: { id: "user-1", name: "Test", username: "test", avatarUrl: null, isVerified: false },
    })
    const res = await POST(new Request("http://localhost:3000/api/stories", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "My story" }),
    }))
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.story.content).toBe("My story")
  })

  it("returns 400 for empty story", async () => {
    mockedGetSession.mockResolvedValue({
      user: { id: "user-1", name: "Test", image: null },
      expires: "2099-01-01",
    })
    const res = await POST(new Request("http://localhost:3000/api/stories", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }))
    expect(res.status).toBe(400)
  })
})
