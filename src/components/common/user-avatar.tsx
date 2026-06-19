"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { getAvatarGradient, getInitials } from "@/lib/format"

interface UserAvatarProps {
  src?: string | null
  name?: string | null
  seed?: string
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl"
  className?: string
  showRing?: boolean
}

const sizeClasses = {
  xs: "size-6 text-[10px]",
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-12 text-base",
  xl: "size-16 text-lg",
  "2xl": "size-24 text-2xl",
}

export function UserAvatar({
  src,
  name,
  seed,
  size = "md",
  className,
  showRing = false,
}: UserAvatarProps) {
  const s = seed || name || src || "default"
  return (
    <Avatar
      className={cn(
        sizeClasses[size],
        showRing && "ring-2 ring-background ring-offset-2 ring-offset-primary/20",
        className
      )}
    >
      {src ? (
        <AvatarImage src={src} alt={name || "avatar"} referrerPolicy="no-referrer" />
      ) : null}
      <AvatarFallback
        className={cn(
          "bg-gradient-to-br text-white font-semibold",
          getAvatarGradient(s)
        )}
      >
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  )
}
