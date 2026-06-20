import { describe, it, expect, vi, beforeEach } from "vitest"
import { mockDb } from "../helpers/api-mocks"

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}))

import { getServerSession } from "next-auth"
import { GET, POST } from "@/app/api/posts/route"

const mockedGetSession = vi.mocked(getServerSession)

function req(url: string, init?: RequestInit) {
  return new Request(url, init)
}

describe("GET /api/posts", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns 401 when not authenticated", async () => {
    mockedGetSession.mockResolvedValue(null)
    const res = await GET(req("http://localhost:3000/api/posts"))
    expect(res.status).toBe(401)
  })

  it("returns posts for authenticated user", async () => {
    mockedGetSession.mockResolvedValue({
      user: { id: "user-1", name: "Test", image: null },
      expires: "2099-01-01",
    })
    mockDb.friendship.findMany.mockResolvedValue([])
    mockDb.post.findMany.mockResolvedValue([
      {
        id: "post-1", content: "Hello", images: null, videoUrl: null, linkPreview: null,
        createdAt: new Date().toISOString(),
        author: { id: "user-2", name: "Alice", username: "alice", avatarUrl: null, isVerified: false },
        _count: { likes: 2, comments: 1, shares: 0 },
        likes: [], shares: [], savedBy: [], sharedFrom: null,
      },
    ])
    const res = await GET(req("http://localhost:3000/api/posts?limit=10"))
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.posts).toHaveLength(1)
  })
})

describe("POST /api/posts", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns 401 when not authenticated", async () => {
    mockedGetSession.mockResolvedValue(null)
    const res = await POST(req("http://localhost:3000/api/posts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "Test" }),
    }))
    expect(res.status).toBe(401)
  })

  it("creates a post", async () => {
    mockedGetSession.mockResolvedValue({
      user: { id: "user-1", name: "Test", image: null },
      expires: "2099-01-01",
    })
    mockDb.post.create.mockResolvedValue({
      id: "post-new", content: "New", images: null, videoUrl: null, linkPreview: null,
      createdAt: new Date(),
      author: { id: "user-1", name: "Test", username: "test", avatarUrl: null, isVerified: false },
      _count: { likes: 0, comments: 0, shares: 0 },
    })
    const res = await POST(req("http://localhost:3000/api/posts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "New" }),
    }))
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.post.content).toBe("New")
  })

  it("returns 400 for empty post", async () => {
    mockedGetSession.mockResolvedValue({
      user: { id: "user-1", name: "Test", image: null },
      expires: "2099-01-01",
    })
    const res = await POST(req("http://localhost:3000/api/posts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }))
    expect(res.status).toBe(400)
  })
})
