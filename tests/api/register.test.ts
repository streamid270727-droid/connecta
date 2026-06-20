import { describe, it, expect, vi, beforeEach } from "vitest"
import { mockDb } from "../helpers/api-mocks"

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn().mockReturnValue({ success: true, remaining: 10, retryAfter: 0 }),
  getClientIp: vi.fn().mockReturnValue("test-ip"),
}))

import { POST } from "@/app/api/auth/register/route"

function makeRequest(body: unknown, ip = "test-ip") {
  return new Request("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  })
}

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("registers a new user successfully", async () => {
    mockDb.user.findFirst.mockResolvedValue(null)
    mockDb.user.create.mockResolvedValue({
      id: "new-user",
      name: "Budi",
      username: "budi",
      email: "budi@test.com",
    })

    const res = await POST(makeRequest({
      name: "Budi",
      username: "budi",
      email: "budi@test.com",
      password: "password123",
    }))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.username).toBe("budi")
    expect(data.email).toBe("budi@test.com")
    expect(mockDb.user.create).toHaveBeenCalled()
  })

  it("returns 400 for invalid email", async () => {
    const res = await POST(makeRequest({
      name: "Budi",
      username: "budi",
      email: "not-an-email",
      password: "password123",
    }))
    expect(res.status).toBe(400)
  })

  it("returns 400 for short username", async () => {
    const res = await POST(makeRequest({
      name: "Budi",
      username: "bu",
      email: "budi@test.com",
      password: "password123",
    }))
    expect(res.status).toBe(400)
  })

  it("returns 400 for short password", async () => {
    const res = await POST(makeRequest({
      name: "Budi",
      username: "budi",
      email: "budi@test.com",
      password: "123",
    }))
    expect(res.status).toBe(400)
  })

  it("returns 409 for existing email", async () => {
    mockDb.user.findFirst.mockResolvedValue({
      id: "existing",
      email: "budi@test.com",
      username: "other",
    })

    const res = await POST(makeRequest({
      name: "Budi",
      username: "budi2",
      email: "budi@test.com",
      password: "password123",
    }))
    expect(res.status).toBe(409)
  })

  it("returns 409 for existing username", async () => {
    mockDb.user.findFirst.mockResolvedValue({
      id: "existing",
      email: "other@test.com",
      username: "budi",
    })

    const res = await POST(makeRequest({
      name: "Budi",
      username: "budi",
      email: "budi2@test.com",
      password: "password123",
    }))
    expect(res.status).toBe(409)
  })

  it("normalizes email to lowercase", async () => {
    mockDb.user.findFirst.mockResolvedValue(null)
    mockDb.user.create.mockResolvedValue({
      id: "new-user",
      name: "Budi",
      username: "budi3",
      email: "budi3@test.com",
    })

    await POST(makeRequest({
      name: "Budi",
      username: "budi3",
      email: "BUDI3@Test.COM",
      password: "password123",
    }))

    const createCall = mockDb.user.create.mock.calls[0]
    expect(createCall).toBeDefined()
    expect(createCall![0].data.email).toBe("budi3@test.com")
  })

  it("rejects invalid username characters", async () => {
    const res = await POST(makeRequest({
      name: "Budi",
      username: "budi@!",
      email: "budi4@test.com",
      password: "password123",
    }))
    expect(res.status).toBe(400)
  })
})
