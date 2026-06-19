"use client"

import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import {
  Search,
  Bell,
  MessageCircle,
  Menu,
  Sun,
  Moon,
  LogOut,
  Settings,
  User as UserIcon,
  Plus,
  ChevronDown,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAppStore } from "@/lib/store"
import { UserAvatar } from "@/components/common/user-avatar"
import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export function Header() {
  const { data: session } = useSession()
  const { theme, setTheme } = useTheme()
  const setView = useAppStore((s) => s.setView)
  const setSearchQuery = useAppStore((s) => s.setSearchQuery)
  const setMobileMenuOpen = useAppStore((s) => s.setMobileMenuOpen)
  const setComposerOpen = useAppStore((s) => s.setComposerOpen)
  const unreadNotifications = useAppStore((s) => s.unreadNotifications)
  const userProfile = useAppStore((s) => s.userProfile)
  const unreadMessages = useAppStore((s) => s.unreadMessages)
  const [mounted, setMounted] = useState(false)
  const [localSearch, setLocalSearch] = useState("")

  useEffect(() => {
    // Mark as mounted to resolve theme icon after hydration
    setMounted(true)
  }, [])

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearchQuery(localSearch)
    setView("search")
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 glass safe-top">
      <div className="flex h-14 sm:h-16 items-center gap-2 sm:gap-4 px-3 sm:px-4 lg:px-6">
        {/* Logo */}
        <button
          onClick={() => setView("feed")}
          className="flex items-center shrink-0"
        >
          <span className="font-bold text-lg sm:text-xl tracking-tight">
            Conne<span className="text-primary">cta</span>
          </span>
        </button>

        {/* Search (desktop) */}
        <form
          onSubmit={submitSearch}
          className="hidden md:flex flex-1 max-w-md relative"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder="Cari teman, postingan..."
            className="pl-9 bg-muted/60 border-transparent focus-visible:bg-background"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
          />
        </form>

        {/* Actions */}
        <div className="flex items-center gap-1 sm:gap-2 ml-auto">
          {/* Notification bell - mobile & tablet only */}
          <button
            onClick={() => setView("notifications")}
            className="relative lg:hidden size-9 rounded-full flex items-center justify-center hover:bg-accent transition-colors"
            aria-label="Notifikasi"
          >
            <Bell className="size-5" />
            {unreadNotifications > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                {unreadNotifications > 9 ? "9+" : unreadNotifications}
              </span>
            )}
          </button>

          {/* User menu */}
          {session?.user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 rounded-full p-0.5 hover:bg-accent transition-colors">
                  <UserAvatar
                    src={userProfile?.avatarUrl ?? session?.user?.image ?? null}
                    name={userProfile?.name ?? session?.user?.name ?? null}
                    seed={session?.user?.id ?? ""}
                    size="sm"
                  />
                  <ChevronDown className="size-3.5 text-muted-foreground hidden sm:block mr-1" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <div className="flex items-center gap-3 p-2">
                  <UserAvatar
                    src={userProfile?.avatarUrl ?? session?.user?.image ?? null}
                    name={userProfile?.name ?? session?.user?.name ?? null}
                    seed={session?.user?.id ?? ""}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">
                      {userProfile?.name ?? session?.user?.name}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      @{session?.user?.username}
                    </div>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setView("profile")}>
                  <UserIcon className="size-4" />
                  Profil Saya
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setView("settings")}>
                  <Settings className="size-4" />
                  Pengaturan
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                  {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
                  {theme === "dark" ? "Mode Terang" : "Mode Gelap"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => signOut({ callbackUrl: "/" })}
                >
                  <LogOut className="size-4" />
                  Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  )
}
