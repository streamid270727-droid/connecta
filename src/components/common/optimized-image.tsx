"use client"

import Image, { type ImageProps } from "next/image"
import { useState } from "react"
import { cn } from "@/lib/utils"

type OptimizedImageProps = Omit<ImageProps, "alt"> & {
  alt?: string
  fallbackClassName?: string
}

export function OptimizedImage({
  alt = "",
  className,
  fallbackClassName,
  ...props
}: OptimizedImageProps) {
  const [error, setError] = useState(false)

  if (error) {
    return (
      <div
        className={cn("bg-muted flex items-center justify-center", fallbackClassName || className)}
      />
    )
  }

  return (
    <Image
      alt={alt}
      className={cn("object-cover", className)}
      onError={() => setError(true)}
      unoptimized={props.src?.toString().startsWith("data:")}
      {...props}
    />
  )
}
