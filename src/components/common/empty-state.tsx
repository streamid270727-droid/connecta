import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
  /** "lg" for full-page, "sm" for inline/compact */
  size?: "lg" | "sm"
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  size = "lg",
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        size === "lg" ? "px-6 py-16" : "px-4 py-8",
        className
      )}
    >
      <div
        className={cn(
          "text-muted-foreground/60 flex items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500/10 to-pink-500/10",
          size === "lg" ? "mb-4 size-20" : "mb-3 size-14"
        )}
      >
        {icon}
      </div>
      <h3 className={cn("font-semibold", size === "lg" ? "text-base" : "text-sm")}>{title}</h3>
      {description && <p className="text-muted-foreground mt-1 max-w-sm text-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

interface EndOfContentProps {
  icon?: ReactNode
  text?: string
  className?: string
}

export function EndOfContent({ icon, text = "Tidak ada lagi", className }: EndOfContentProps) {
  return (
    <div className={cn("text-muted-foreground py-8 text-center text-sm", className)}>
      {icon && <span className="mr-1.5 inline-block align-middle opacity-50">{icon}</span>}
      <span className="align-middle">{text}</span>
    </div>
  )
}
