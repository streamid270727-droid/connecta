"use client"

import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import {
  Sparkles,
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
  const unreadMessages = useAppStore((s) => s.unreadMessages)
  const [mounted, setMounted] = useState(false)
  const [localSearch, setLocalSearch] = useState("")

  useEffect(() => {
    // Mark as mounted to resolve theme icon after hydration
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
        {/* Mobile menu */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setMobileMenuOpen(true)}
        >
          <Menu className="size-5" />
          <span className="sr-only">Menu</span>
        </Button>

        {/* Logo */}
        <button
          onClick={() => setView("feed")}
          className="flex items-center gap-2 shrink-0"
        >
          <div className="size-8 sm:size-9 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-md shadow-rose-500/30">
            <Sparkles className="size-5 text-white" />
          </div>
          <span className="hidden sm:block font-bold text-lg sm:text-xl tracking-tight">
            Connecta
          </span>
        </button>

        {/* Search (desktop) */}
        <form
          onSubmit={submitSearch}
          className="hidden md:flex flex-1 max-w-md mx-2 relative"
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

        <div className="flex-1 md:hidden" />

        {/* Actions */}
        <div className="flex items-center gap-1 sm:gap-2 ml-auto">
          {/* Create post (mobile) */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden relative"
            onClick={() => setComposerOpen(true)}
          >
            <Plus className="size-5" />
            <span className="sr-only">Buat Postingan</span>
          </Button>

          {/* Search (mobile) */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setView("search")}
          >
            <Search className="size-5" />
            <span className="sr-only">Cari</span>
          </Button>

          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => setView("notifications")}
          >
            <Bell className="size-5" />
            {unreadNotifications > 0 && (
              <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                {unreadNotifications > 9 ? "9+" : unreadNotifications}
              </span>
            )}
            <span className="sr-only">Notifikasi</span>
          </Button>

          {/* Messages */}
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => setView("messages")}
          >
            <MessageCircle className="size-5" />
            {unreadMessages > 0 && (
              <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                {unreadMessages > 9 ? "9+" : unreadMessages}
              </span>
            )}
            <span className="sr-only">Pesan</span>
          </Button>

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {mounted ? (
              theme === "dark" ? (
                <Sun className="size-5" />
              ) : (
                <Moon className="size-5" />
              )
            ) : (
              <Sun className="size-5 opacity-0" />
            )}
            <span className="sr-only">Ganti tema</span>
          </Button>

          {/* User menu */}
          {session?.user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 rounded-full p-0.5 hover:bg-accent transition-colors">
                  <UserAvatar
                    src={session.user.image ?? null}
                    name={session.user.name ?? null}
                    seed={session.user.id}
                    size="sm"
                  />
                  <ChevronDown className="size-3.5 text-muted-foreground hidden sm:block mr-1" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <div className="flex items-center gap-3 p-2">
                  <UserAvatar
                    src={session.user.image ?? null}
                    name={session.user.name ?? null}
                    seed={session.user.id}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">
                      {session.user.name}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      @{session.user.username}
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
