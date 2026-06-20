"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const EMOJI_CATEGORIES = [
  {
    name: "Sering Dipakai",
    emojis: [
      "😀",
      "😂",
      "😍",
      "🥰",
      "😊",
      "🙏",
      "👍",
      "❤️",
      "🔥",
      "✨",
      "🎉",
      "💯",
      "😎",
      "🤔",
      "😢",
      "😭",
      "😤",
      "🥳",
      "🤩",
      "😴",
    ],
  },
  {
    name: "Senang",
    emojis: [
      "😃",
      "😄",
      "😁",
      "😆",
      "😅",
      "🤣",
      "😉",
      "🙃",
      "😋",
      "😛",
      "😜",
      "🤪",
      "😝",
      "🤑",
      "🤗",
      "🤭",
      "🤫",
      "😐",
      "😑",
      "😶",
    ],
  },
  {
    name: "Cinta",
    emojis: [
      "❤️",
      "🧡",
      "💛",
      "💚",
      "💙",
      "💜",
      "🖤",
      "🤍",
      "🤎",
      "💕",
      "💞",
      "💓",
      "💗",
      "💖",
      "💘",
      "💝",
      "💟",
      "😍",
      "🥰",
      "😘",
    ],
  },
  {
    name: "Gestur",
    emojis: [
      "👍",
      "👎",
      "👌",
      "✌️",
      "🤞",
      "🤟",
      "🤘",
      "🤙",
      "👈",
      "👉",
      "👆",
      "👇",
      "☝️",
      "✋",
      "🤚",
      "🖐️",
      "🖖",
      "👋",
      "🤏",
      "🙏",
    ],
  },
  {
    name: "Hewan",
    emojis: [
      "🐶",
      "🐱",
      "🐭",
      "🐹",
      "🐰",
      "🦊",
      "🐻",
      "🐼",
      "🐨",
      "🐯",
      "🦁",
      "🐮",
      "🐷",
      "🐸",
      "🐵",
      "🙈",
      "🙉",
      "🙊",
      "🐔",
      "🐧",
    ],
  },
  {
    name: "Makanan",
    emojis: [
      "🍎",
      "🍐",
      "🍊",
      "🍋",
      "🍌",
      "🍉",
      "🍇",
      "🍓",
      "🫐",
      "🍈",
      "🍒",
      "🍑",
      "🥭",
      "🍍",
      "🥝",
      "🍅",
      "🥑",
      "🍕",
      "🍔",
      "🍟",
    ],
  },
]

interface EmojiPickerProps {
  onSelect: (emoji: string) => void
  className?: string
}

export function EmojiPicker({ onSelect, className }: EmojiPickerProps) {
  const [open, setOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  const handleSelect = useCallback(
    (emoji: string) => {
      onSelect(emoji)
      setOpen(false)
    },
    [onSelect]
  )

  return (
    <div className={cn("relative", className)} ref={ref}>
      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground size-9 shrink-0"
        onClick={() => setOpen((o) => !o)}
        aria-label="Emoji"
        type="button"
      >
        <span className="text-xl leading-none">😊</span>
      </Button>

      {open && (
        <div className="bg-background border-border absolute bottom-full left-0 z-50 mb-2 w-72 overflow-hidden rounded-xl border shadow-lg">
          {/* Category tabs */}
          <div className="border-border/60 scrollbar-hide flex flex-nowrap gap-1 overflow-x-auto border-b p-2">
            {EMOJI_CATEGORIES.map((cat, i) => (
              <button
                key={cat.name}
                onClick={() => setActiveCategory(i)}
                className={cn(
                  "shrink-0 rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap transition-colors",
                  i === activeCategory
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-accent"
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Emoji grid */}
          <div className="max-h-48 overflow-y-auto p-2">
            <div className="grid grid-cols-6 gap-0.5 sm:grid-cols-8">
              {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleSelect(emoji)}
                  className="hover:bg-accent flex size-8 items-center justify-center rounded-lg text-lg transition-colors"
                  type="button"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
