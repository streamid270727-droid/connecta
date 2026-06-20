import { formatShortDate } from "@/lib/format"
import type { Conversation } from "./types"

export function startOfDay(d: Date): number {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x.getTime()
}

export function isSameDay(a: Date, b: Date): boolean {
  return startOfDay(a) === startOfDay(b)
}

export function isYesterday(a: Date, b: Date): boolean {
  const yesterday = new Date(b)
  yesterday.setDate(yesterday.getDate() - 1)
  return isSameDay(a, yesterday)
}

export function dateLabel(d: Date): string {
  const now = new Date()
  if (isSameDay(d, now)) return "Hari ini"
  if (isYesterday(d, now)) return "Kemarin"
  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
    })
  }
  return formatShortDate(d)
}

export function previewText(conv: Conversation, currentUserId: string): string {
  if (!conv.lastMessage) return "Mulai percakapan"
  const prefix =
    conv.lastMessage.senderId === currentUserId ? "Anda: " : ""
  return prefix + conv.lastMessage.content
}
