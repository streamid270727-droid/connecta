import { describe, it, expect, vi, beforeEach } from "vitest"
import { mockDb } from "../helpers/api-mocks"

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}))

import { getServerSession } from "next-auth"
import { GET, POST } from "@/app/api/posts/[id]/comments/route"

const mockedGetSession = vi.mocked(getServerSession)

describe("GET /api/posts/[id]/comments", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns 401 when not authenticated", async () => {
    mockedGetSession.mockResolvedValue(null)
    const res = await GET(
      new Request("http://localhost:3000/api/posts/post-1/comments"),
      { params: Promise.resolve({ id: "post-1" }) }
    )
    expect(res.status).toBe(401)
  })

  it("returns comments", async () => {
    mockedGetSession.mockResolvedValue({
      user: { id: "user-1", name: "Test", image: null },
      expires: "2099-01-01",
    })
    mockDb.comment.findMany.mockResolvedValue([
      {
        id: "c1", content: "Nice!", createdAt: new Date().toISOString(),
        author: { id: "u2", name: "A", username: "a", avatarUrl: null, isVerified: false },
        replies: [], _count: { likes: 2 }, likes: [],
      },
    ])
    const res = await GET(
      new Request("http://localhost:3000/api/posts/p1/comments"),
      { params: Promise.resolve({ id: "p1" }) }
    )
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.comments[0].content).toBe("Nice!")
  })
})

describe("POST /api/posts/[id]/comments", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns 401 when not authenticated", async () => {
    mockedGetSession.mockResolvedValue(null)
    const res = await POST(
      new Request("http://localhost:3000/api/posts/p1/comments", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "Hi" }),
      }),
      { params: Promise.resolve({ id: "p1" }) }
    )
    expect(res.status).toBe(401)
  })

  it("creates a comment", async () => {
    mockedGetSession.mockResolvedValue({
      user: { id: "user-1", name: "Test", image: null },
      expires: "2099-01-01",
    })
    mockDb.post.findUnique.mockResolvedValue({ authorId: "user-2" })
    mockDb.comment.create.mockResolvedValue({
      id: "c-new", content: "Great!", createdAt: new Date(),
      author: { id: "user-1", name: "Test", username: "test", avatarUrl: null, isVerified: false },
    })
    const res = await POST(
      new Request("http://localhost:3000/api/posts/p1/comments", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "Great!" }),
      }),
      { params: Promise.resolve({ id: "p1" }) }
    )
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.comment.content).toBe("Great!")
  })

  it("returns 400 for empty comment", async () => {
    mockedGetSession.mockResolvedValue({
      user: { id: "user-1", name: "Test", image: null },
      expires: "2099-01-01",
    })
    const res = await POST(
      new Request("http://localhost:3000/api/posts/p1/comments", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "" }),
      }),
      { params: Promise.resolve({ id: "p1" }) }
    )
    expect(res.status).toBe(400)
  })

  it("returns 404 for non-existent post", async () => {
    mockedGetSession.mockResolvedValue({
      user: { id: "user-1", name: "Test", image: null },
      expires: "2099-01-01",
    })
    mockDb.post.findUnique.mockResolvedValue(null)
    const res = await POST(
      new Request("http://localhost:3000/api/posts/x/comments", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "Hi" }),
      }),
      { params: Promise.resolve({ id: "x" }) }
    )
    expect(res.status).toBe(404)
  })
})
