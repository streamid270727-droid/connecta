"use client"

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useAppStore, type AppView } from "@/lib/store"
import { useSession, signOut } from "next-auth/react"
import {
  Home,
  Users,
  Bell,
  MessageCircle,
  User,
  Settings,
  Compass,
  LogOut,
  Sparkles,
  Sun,
  Moon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { UserAvatar } from "@/components/common/user-avatar"
import { cn } from "@/lib/utils"

const navItems: { view: AppView; label: string; icon: React.ElementType }[] = [
  { view: "feed", label: "Beranda", icon: Home },
  { view: "discover", label: "Jelajahi", icon: Compass },
  { view: "friends", label: "Teman", icon: Users },
  { view: "notifications", label: "Notifikasi", icon: Bell },
  { view: "messages", label: "Pesan", icon: MessageCircle },
  { view: "profile", label: "Profil", icon: User },
  { view: "settings", label: "Pengaturan", icon: Settings },
]

export function MobileMenu() {
  const { data: session } = useSession()
  const { mobileMenuOpen, setMobileMenuOpen, setView, openProfile, unreadNotifications, unreadMessages, pendingFriendRequests } =
    useAppStore()
  const { theme, setTheme } = useTheme()

  if (!session?.user) return null

  const handleNav = (view: AppView) => {
    if (view === "profile") {
      openProfile(session.user.id)
    } else {
      setView(view)
    }
    setMobileMenuOpen(false)
  }

  return (
    <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="p-4 border-b">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
              <Sparkles className="size-5 text-white" />
            </div>
            <SheetTitle className="text-lg font-bold">Connecta</SheetTitle>
          </div>
        </SheetHeader>

        <div className="p-4 border-b">
          <div className="flex items-center gap-3">
            <UserAvatar
              src={session.user.image ?? null}
              name={session.user.name ?? null}
              seed={session.user.id}
              size="lg"
            />
            <div className="min-w-0">
              <div className="font-semibold truncate">{session.user.name}</div>
              <div className="text-sm text-muted-foreground truncate">
                @{session.user.username}
              </div>
            </div>
          </div>
        </div>

        <nav className="p-2 flex-1">
          {navItems.map((item) => {
            const badge =
              item.view === "notifications"
                ? unreadNotifications
                : item.view === "messages"
                ? unreadMessages
                : item.view === "friends"
                ? pendingFriendRequests
                : 0
            return (
              <button
                key={item.view}
                onClick={() => handleNav(item.view)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-accent transition-colors"
              >
                <item.icon className="size-5" />
                <span className="flex-1 text-left">{item.label}</span>
                {badge > 0 && (
                  <span className="min-w-5 h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        <div className="p-2 border-t space-y-1">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-accent transition-colors"
          >
            {theme === "dark" ? (
              <Sun className="size-5" />
            ) : (
              <Moon className="size-5" />
            )}
            <span>{theme === "dark" ? "Mode Terang" : "Mode Gelap"}</span>
          </button>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="size-5" />
            <span>Keluar</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
