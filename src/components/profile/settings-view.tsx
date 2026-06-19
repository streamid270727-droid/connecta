"use client"

import { useState, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import {
  User as UserIcon,
  Mail,
  Phone,
  MapPin,
  Cake,
  Lock,
  Globe,
  Shield,
  LogOut,
  Languages,
  Info,
  Palette,
  Save,
  Loader2,
  Camera,
  CheckCircle2,
  Sun,
  Moon,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { UserAvatar } from "@/components/common/user-avatar"
import { useToast } from "@/hooks/use-toast"
import { useTheme } from "next-themes"
import { formatShortDate, getCoverGradient } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useAppStore } from "@/lib/store"

interface SettingsUser {
  id: string
  name: string
  username: string
  email: string | null
  avatarUrl: string | null
  coverUrl: string | null
  bio: string | null
  location: string | null
  birthDate: string | null
  phone: string | null
  isPrivate: boolean
  isVerified: boolean
  createdAt: string
}

export function SettingsView() {
  const { data: session } = useSession()
  const { theme, setTheme } = useTheme()
  const { openProfile } = useAppStore()
  const { toast } = useToast()

  const [user, setUser] = useState<SettingsUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  // Form fields (Account section)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [birthDate, setBirthDate] = useState("")
  const [location, setLocation] = useState("")
  const [bio, setBio] = useState("")
  const [isPrivate, setIsPrivate] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState("")

  const [savingAccount, setSavingAccount] = useState(false)
  const [savingPrivacy, setSavingPrivacy] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    void loadUser()
  }, [])

  const loadUser = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/users/me")
      if (!res.ok) throw new Error("Gagal memuat pengguna")
      const data = await res.json()
      const u: SettingsUser = data.user
      setUser(u)
      setName(u.name || "")
      setPhone(u.phone || "")
      setBirthDate(u.birthDate ? u.birthDate.slice(0, 10) : "")
      setLocation(u.location || "")
      setBio(u.bio || "")
      setIsPrivate(u.isPrivate)
      setAvatarUrl(u.avatarUrl || "")
    } catch {
      toast({ title: "Gagal memuat pengaturan", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 4 * 1024 * 1024) {
      toast({ title: "Ukuran file terlalu besar (maks 4MB)", variant: "destructive" })
      return
    }
    setUploadingAvatar(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: formData })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast({ title: "Gagal mengunggah", description: data.error, variant: "destructive" })
        return
      }
      const data = await res.json()
      const newUrl = data.url as string
      setAvatarUrl(newUrl)
      // Persist immediately
      const updateRes = await fetch("/api/users/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: newUrl }),
      })
      if (updateRes.ok) {
        toast({ title: "Foto profil diperbarui" })
        setUser((prev) => (prev ? { ...prev, avatarUrl: newUrl } : prev))
      }
    } catch {
      toast({ title: "Terjadi kesalahan", variant: "destructive" })
    } finally {
      setUploadingAvatar(false)
      e.target.value = ""
    }
  }

  const saveAccount = async () => {
    if (savingAccount) return
    if (name.trim().length < 2) {
      toast({ title: "Nama minimal 2 karakter", variant: "destructive" })
      return
    }
    setSavingAccount(true)
    try {
      const res = await fetch("/api/users/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          birthDate: birthDate || null,
          location: location.trim(),
          bio: bio.trim(),
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast({ title: "Gagal menyimpan", description: data.error, variant: "destructive" })
      } else {
        const data = await res.json()
        setUser(data.user)
        toast({ title: "Perubahan disimpan" })
      }
    } catch {
      toast({ title: "Terjadi kesalahan", variant: "destructive" })
    } finally {
      setSavingAccount(false)
    }
  }

  const savePrivacy = async (nextPrivate: boolean) => {
    setSavingPrivacy(true)
    try {
      const res = await fetch("/api/users/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPrivate: nextPrivate }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast({ title: "Gagal menyimpan", description: data.error, variant: "destructive" })
        // Revert
        setIsPrivate(!nextPrivate)
      } else {
        const data = await res.json()
        setUser(data.user)
        setIsPrivate(data.user.isPrivate)
        toast({
          title: nextPrivate ? "Akun kini privat" : "Akun kini publik",
        })
      }
    } catch {
      toast({ title: "Terjadi kesalahan", variant: "destructive" })
      setIsPrivate(!nextPrivate)
    } finally {
      setSavingPrivacy(false)
    }
  }

  if (loading || !user) {
    return (
      <div className="px-4 sm:px-6 py-4 max-w-3xl mx-auto">
        <SettingsSkeleton />
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 py-4 max-w-3xl mx-auto">
      {/* Page header */}
      <div className="flex items-center gap-2 mb-1">
        <div className="size-9 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
          <UserIcon className="size-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Pengaturan</h1>
          <p className="text-xs text-muted-foreground">
            Kelola akun, privasi, dan preferensi Anda
          </p>
        </div>
      </div>

      {/* Profile banner */}
      <Card className="mt-4 overflow-hidden py-0">
        <div className="relative h-20">
          {user.coverUrl ? (
            <img
              src={user.coverUrl}
              alt="Cover"
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className={cn(
                "w-full h-full bg-gradient-to-br",
                getCoverGradient(user.id)
              )}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        </div>
        <CardContent className="pt-0 pb-4 px-4 relative">
          <div className="flex items-end gap-3 -mt-10">
            <div className="relative">
              <UserAvatar
                src={avatarUrl}
                name={user.name}
                seed={user.id}
                size="xl"
                className="ring-4 ring-background shadow-md"
              />
              <label
                className="absolute bottom-0 right-0 size-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors cursor-pointer"
                title="Ubah foto profil"
              >
                {uploadingAvatar ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Camera className="size-3.5" />
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleAvatarSelect}
                  disabled={uploadingAvatar}
                />
              </label>
            </div>
            <div className="flex-1 min-w-0 mb-1">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold truncate">{user.name}</span>
                {user.isVerified && (
                  <CheckCircle2 className="size-4 fill-primary text-primary-foreground shrink-0" />
                )}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                @{user.username} · Bergabung {formatShortDate(user.createdAt)}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mb-1"
              onClick={() => openProfile(user.id)}
            >
              Lihat Profil
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sections grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        {/* Akun */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserIcon className="size-4 text-primary" />
              Akun
            </CardTitle>
            <CardDescription>Informasi dasar akun Anda</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="set-name">Nama</Label>
              <Input
                id="set-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="set-email" className="flex items-center gap-1.5">
                <Mail className="size-3.5 text-muted-foreground" />
                Email
              </Label>
              <Input
                id="set-email"
                value={user.email || ""}
                readOnly
                disabled
                className="bg-muted/50 text-muted-foreground"
              />
              <p className="text-[11px] text-muted-foreground">
                Email tidak dapat diubah.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="set-phone" className="flex items-center gap-1.5">
                  <Phone className="size-3.5 text-muted-foreground" />
                  Telepon
                </Label>
                <Input
                  id="set-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={30}
                  placeholder="+62..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="set-birth" className="flex items-center gap-1.5">
                  <Cake className="size-3.5 text-muted-foreground" />
                  Tanggal Lahir
                </Label>
                <Input
                  id="set-birth"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="set-location" className="flex items-center gap-1.5">
                <MapPin className="size-3.5 text-muted-foreground" />
                Lokasi
              </Label>
              <Input
                id="set-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                maxLength={100}
                placeholder="Kota, Negara"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="set-bio">Bio</Label>
              <Textarea
                id="set-bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={200}
                rows={3}
              />
            </div>
            <Button
              onClick={saveAccount}
              disabled={savingAccount}
              className="w-full"
            >
              {savingAccount ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  Simpan
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {/* Privasi */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Lock className="size-4 text-primary" />
                Privasi
              </CardTitle>
              <CardDescription>Kontrol siapa yang bisa melihat konten Anda</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between gap-3 p-3 rounded-lg border">
                <div className="flex items-start gap-2.5">
                  {isPrivate ? (
                    <Lock className="size-4 text-primary mt-0.5" />
                  ) : (
                    <Globe className="size-4 text-primary mt-0.5" />
                  )}
                  <div>
                    <div className="text-sm font-medium">
                      Akun {isPrivate ? "Privat" : "Publik"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {isPrivate
                        ? "Hanya teman yang bisa melihat postingan Anda."
                        : "Semua orang bisa melihat postingan Anda."}
                    </div>
                  </div>
                </div>
                <Switch
                  checked={isPrivate}
                  onCheckedChange={(v) => {
                    setIsPrivate(v)
                    void savePrivacy(v)
                  }}
                  disabled={savingPrivacy}
                />
              </div>
              {savingPrivacy && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" />
                  Menyimpan...
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tema */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Palette className="size-4 text-primary" />
                Tema
              </CardTitle>
              <CardDescription>Tampilan terang atau gelap</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setTheme("light")}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all",
                    mounted && theme === "light"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  )}
                >
                  <Sun className="size-5" />
                  <span className="text-sm font-medium">Terang</span>
                </button>
                <button
                  onClick={() => setTheme("dark")}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all",
                    mounted && theme === "dark"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  )}
                >
                  <Moon className="size-5" />
                  <span className="text-sm font-medium">Gelap</span>
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Tema juga dapat diubah dari ikon di header.
              </p>
            </CardContent>
          </Card>

          {/* Keamanan */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="size-4 text-primary" />
                Keamanan
              </CardTitle>
              <CardDescription>Lindungi akun Anda</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between gap-3 p-3 rounded-lg border">
                <div>
                  <div className="text-sm font-medium">Kata Sandi</div>
                  <div className="text-xs text-muted-foreground">
                    Ubah kata sandi secara berkala.
                  </div>
                </div>
                <Button variant="outline" size="sm" disabled>
                  Segera Hadir
                </Button>
              </div>
              {user.isVerified ? (
                <div className="flex items-center gap-2 p-3 rounded-lg border bg-primary/5">
                  <CheckCircle2 className="size-4 text-primary shrink-0" />
                  <div className="text-xs">
                    <span className="font-medium">Akun terverifikasi</span>
                    <span className="text-muted-foreground"> — identitas dikonfirmasi.</span>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        {/* Sesi */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LogOut className="size-4 text-primary" />
              Sesi
            </CardTitle>
            <CardDescription>Informasi sesi login saat ini</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <UserAvatar
                src={user.avatarUrl}
                name={user.name}
                seed={user.id}
                size="lg"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium truncate">{user.name}</span>
                  {user.isVerified && (
                    <CheckCircle2 className="size-3.5 fill-primary text-primary-foreground shrink-0" />
                  )}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {user.email}
                </div>
                <Badge variant="secondary" className="mt-1">
                  Sesi aktif
                </Badge>
              </div>
              <Button
                variant="destructive"
                onClick={() => signOut({ callbackUrl: "/" })}
              >
                <LogOut className="size-4" />
                Keluar
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {session?.user
                ? "Anda akan keluar dari semua sesi di perangkat ini."
                : ""}
            </p>
          </CardContent>
        </Card>

        {/* Bahasa */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Languages className="size-4 text-primary" />
              Bahasa
            </CardTitle>
            <CardDescription>Pilih bahasa antarmuka</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3 p-3 rounded-lg border">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🇮🇩</span>
                <div>
                  <div className="text-sm font-medium">Bahasa Indonesia</div>
                  <div className="text-xs text-muted-foreground">Default</div>
                </div>
              </div>
              <Badge variant="secondary">Aktif</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Tentang */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Info className="size-4 text-primary" />
              Tentang
            </CardTitle>
            <CardDescription>Informasi aplikasi</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Aplikasi</span>
              <span className="font-medium">Connecta</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Versi</span>
              <span className="font-medium">1.0.0 (MVP)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Build</span>
              <span className="font-medium">
                {new Date().getFullYear()}
              </span>
            </div>
            <div className="pt-2 border-t mt-2 text-xs text-muted-foreground">
              © {new Date().getFullYear()} Connecta. Semua hak dilindungi.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function SettingsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Skeleton className="size-9 rounded-xl" />
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
      <Card className="overflow-hidden py-0">
        <Skeleton className="h-20 w-full rounded-none" />
        <CardContent className="pt-0 relative">
          <div className="flex items-end gap-3 -mt-10">
            <Skeleton className="size-16 rounded-full ring-4 ring-background" />
            <div className="flex-1 space-y-1.5 mb-1">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-48" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
