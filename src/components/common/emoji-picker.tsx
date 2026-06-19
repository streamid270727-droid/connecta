"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const EMOJI_CATEGORIES = [
  {
    name: "Sering Dipakai",
    emojis: ["😀", "😂", "😍", "🥰", "😊", "🙏", "👍", "❤️", "🔥", "✨", "🎉", "💯", "😎", "🤔", "😢", "😭", "😤", "🥳", "🤩", "😴"],
  },
  {
    name: "Senang",
    emojis: ["😃", "😄", "😁", "😆", "😅", "🤣", "😉", "🙃", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "😐", "😑", "😶"],
  },
  {
    name: "Cinta",
    emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "😍", "🥰", "😘"],
  },
  {
    name: "Gestur",
    emojis: ["👍", "👎", "👌", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "👇", "☝️", "✋", "🤚", "🖐️", "🖖", "👋", "🤏", "🙏"],
  },
  {
    name: "Hewan",
    emojis: ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🙈", "🙉", "🙊", "🐔", "🐧"],
  },
  {
    name: "Makanan",
    emojis: ["🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍈", "🍒", "🍑", "🥭", "🍍", "🥝", "🍅", "🥑", "🍕", "🍔", "🍟"],
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
        className="size-9 shrink-0 text-muted-foreground"
        onClick={() => setOpen((o) => !o)}
        aria-label="Emoji"
        type="button"
      >
        <span className="text-xl leading-none">😊</span>
      </Button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-72 bg-background border border-border rounded-xl shadow-lg z-50 overflow-hidden">
          {/* Category tabs */}
          <div className="flex flex-nowrap gap-1 p-2 border-b border-border/60 overflow-x-auto scrollbar-hide">
            {EMOJI_CATEGORIES.map((cat, i) => (
              <button
                key={cat.name}
                onClick={() => setActiveCategory(i)}
                className={cn(
                  "px-2.5 py-1.5 text-xs rounded-lg whitespace-nowrap shrink-0 transition-colors",
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
          <div className="p-2 max-h-48 overflow-y-auto">
            <div className="grid grid-cols-8 gap-0.5">
              {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleSelect(emoji)}
                  className="size-8 flex items-center justify-center text-lg hover:bg-accent rounded-lg transition-colors"
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
