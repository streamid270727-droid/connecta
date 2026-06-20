import { NextResponse } from "next/server"

interface ApiErrorResponse {
  error: string
  code?: string
}

export function apiError(message: string, status: number, code?: string): NextResponse {
  const body: ApiErrorResponse = { error: message }
  if (code) body.code = code
  return NextResponse.json(body, { status })
}

export function unauthorized(message = "Unauthorized") {
  return apiError(message, 401, "UNAUTHORIZED")
}

export function forbidden(message = "Forbidden") {
  return apiError(message, 403, "FORBIDDEN")
}

export function notFound(message = "Resource not found") {
  return apiError(message, 404, "NOT_FOUND")
}

export function badRequest(message: string) {
  return apiError(message, 400, "BAD_REQUEST")
}

export function conflict(message: string) {
  return apiError(message, 409, "CONFLICT")
}

export function tooManyRequests(message = "Terlalu banyak permintaan. Silakan coba lagi nanti.") {
  return apiError(message, 429, "RATE_LIMITED")
}

export function serverError(message = "Terjadi kesalahan server") {
  return apiError(message, 500, "INTERNAL_ERROR")
}

import { ZodError } from "zod"

export function validationError(zodError: ZodError): NextResponse {
  const firstMessage = zodError.issues[0]?.message || "Validasi gagal"
  return badRequest(firstMessage)
}

type RouteHandler = (request: Request, context?: any) => Promise<NextResponse>

export function withErrorHandling(handler: RouteHandler): RouteHandler {
  return async (request, context) => {
    try {
      return await handler(request, context)
    } catch (error) {
      console.error(`API Error [${request.method} ${new URL(request.url).pathname}]:`, error)
      return serverError()
    }
  }
}
