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
import { LanguageSwitcher } from "@/components/common/language-switcher"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { UserAvatar } from "@/components/common/user-avatar"
import { OptimizedImage } from "@/components/common/optimized-image"
import { useToast } from "@/hooks/use-toast"
import { useTheme } from "next-themes"
import { formatShortDate, getCoverGradient } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useAppStore } from "@/lib/store"
import { useUserSettings } from "@/hooks/api/use-user-settings"
import { useQueryClient } from "@tanstack/react-query"
import type { SettingsUser } from "./types"

export function SettingsView() {
  const { data: session, update: updateSession } = useSession()
  const { theme, setTheme } = useTheme()
  const { openProfile, setUserProfile } = useAppStore()
  const { toast } = useToast()
  const qc = useQueryClient()

  const userQuery = useUserSettings()
  const user = userQuery.data ?? null
  const setUser = (updater: (prev: SettingsUser | null) => SettingsUser | null) => {
    qc.setQueryData(["userSettings"], (old: SettingsUser | undefined) => {
      return updater(old ?? null) ?? undefined
    })
  }

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
  const [uploadingCover, setUploadingCover] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (user) {
      setName(user.name || "")
      setPhone(user.phone || "")
      setBirthDate(user.birthDate ? user.birthDate.slice(0, 10) : "")
      setLocation(user.location || "")
      setBio(user.bio || "")
      setIsPrivate(user.isPrivate)
      setAvatarUrl(user.avatarUrl || "")
    }
  }, [user])

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
        setUserProfile({ avatarUrl: newUrl, name: user?.name ?? null })
        // Force session refresh so header picks up new avatar
        await updateSession({ image: newUrl })
        window.dispatchEvent(new Event("focus"))
      }
    } catch {
      toast({ title: "Terjadi kesalahan", variant: "destructive" })
    } finally {
      setUploadingAvatar(false)
      e.target.value = ""
    }
  }

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 4 * 1024 * 1024) {
      toast({ title: "Ukuran maksimal 4MB", variant: "destructive" })
      return
    }
    setUploadingCover(true)
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
      const updateRes = await fetch("/api/users/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverUrl: newUrl }),
      })
      if (updateRes.ok) {
        toast({ title: "Cover foto diperbarui" })
        setUser((prev) => (prev ? { ...prev, coverUrl: newUrl } : prev))
        updateSession({ coverUrl: newUrl })
      }
    } catch {
      toast({ title: "Terjadi kesalahan", variant: "destructive" })
    } finally {
      setUploadingCover(false)
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
        setUserProfile({ avatarUrl: data.user.avatarUrl, name: data.user.name })
        updateSession({ name: name.trim() })
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

  if (userQuery.isLoading || !user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6">
        <SettingsSkeleton />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6">
      {/* Page header */}
      <div className="mb-1 flex items-center gap-2">
        <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-600">
          <UserIcon className="size-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Pengaturan</h1>
          <p className="text-muted-foreground text-xs">Kelola akun, privasi, dan preferensi Anda</p>
        </div>
      </div>

      {/* Profile banner */}
      <Card className="mt-4 overflow-hidden py-0">
        <div className="relative h-20">
          {user.coverUrl ? (
            <OptimizedImage src={user.coverUrl} alt="Cover" fill className="object-cover" />
          ) : (
            <div className={cn("h-full w-full bg-gradient-to-br", getCoverGradient(user.id))} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          <label className="absolute top-2 right-2 flex size-8 cursor-pointer items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60">
            <Camera className="size-4" />
            <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
          </label>
        </div>
        <CardContent className="relative px-4 pt-0 pb-4">
          <div className="-mt-10 flex items-end gap-3">
            <div className="relative">
              <UserAvatar
                src={avatarUrl}
                name={user.name}
                seed={user.id}
                size="xl"
                className="ring-background shadow-md ring-4"
              />
              <label
                className="bg-primary text-primary-foreground hover:bg-primary/90 absolute right-0 bottom-0 flex size-7 cursor-pointer items-center justify-center rounded-full shadow-md transition-colors"
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
            <div className="mb-1 min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate font-semibold">{user.name}</span>
                {user.isVerified && (
                  <CheckCircle2 className="fill-primary text-primary-foreground size-4 shrink-0" />
                )}
              </div>
              <div className="text-muted-foreground truncate text-xs">
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
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Akun */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserIcon className="text-primary size-4" />
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
                <Mail className="text-muted-foreground size-3.5" />
                Email
              </Label>
              <Input
                id="set-email"
                value={user.email || ""}
                readOnly
                disabled
                className="bg-muted/50 text-muted-foreground"
              />
              <p className="text-muted-foreground text-[11px]">Email tidak dapat diubah.</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="set-phone" className="flex items-center gap-1.5">
                  <Phone className="text-muted-foreground size-3.5" />
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
                  <Cake className="text-muted-foreground size-3.5" />
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
                <MapPin className="text-muted-foreground size-3.5" />
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
            <Button onClick={saveAccount} disabled={savingAccount} className="w-full">
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
                <Lock className="text-primary size-4" />
                Privasi
              </CardTitle>
              <CardDescription>Kontrol siapa yang bisa melihat konten Anda</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div className="flex items-start gap-2.5">
                  {isPrivate ? (
                    <Lock className="text-primary mt-0.5 size-4" />
                  ) : (
                    <Globe className="text-primary mt-0.5 size-4" />
                  )}
                  <div>
                    <div className="text-sm font-medium">
                      Akun {isPrivate ? "Privat" : "Publik"}
                    </div>
                    <div className="text-muted-foreground text-xs">
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
                <div className="text-muted-foreground flex items-center gap-2 text-xs">
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
                <Palette className="text-primary size-4" />
                Tema
              </CardTitle>
              <CardDescription>Tampilan terang atau gelap</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setTheme("light")}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all",
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
                    "flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all",
                    mounted && theme === "dark"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  )}
                >
                  <Moon className="size-5" />
                  <span className="text-sm font-medium">Gelap</span>
                </button>
              </div>
              <p className="text-muted-foreground text-[11px]">
                Tema juga dapat diubah dari ikon di header.
              </p>
            </CardContent>
          </Card>

          {/* Keamanan */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="text-primary size-4" />
                Keamanan
              </CardTitle>
              <CardDescription>Lindungi akun Anda</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ChangePasswordButton />
              {user.isVerified ? (
                <div className="bg-primary/5 flex items-center gap-2 rounded-lg border p-3">
                  <CheckCircle2 className="text-primary size-4 shrink-0" />
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
              <LogOut className="text-primary size-4" />
              Sesi
            </CardTitle>
            <CardDescription>Informasi sesi login saat ini</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <UserAvatar src={user.avatarUrl} name={user.name} seed={user.id} size="lg" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate font-medium">{user.name}</span>
                  {user.isVerified && (
                    <CheckCircle2 className="fill-primary text-primary-foreground size-3.5 shrink-0" />
                  )}
                </div>
                <div className="text-muted-foreground truncate text-xs">{user.email}</div>
                <Badge variant="secondary" className="mt-1">
                  Sesi aktif
                </Badge>
              </div>
              <Button variant="destructive" onClick={() => signOut({ callbackUrl: "/" })}>
                <LogOut className="size-4" />
                Keluar
              </Button>
            </div>
            <p className="text-muted-foreground text-[11px]">
              {session?.user ? "Anda akan keluar dari semua sesi di perangkat ini." : ""}
            </p>
          </CardContent>
        </Card>

        <DeleteAccountButton />

        {/* Bahasa */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Languages className="text-primary size-4" />
              Bahasa
            </CardTitle>
            <CardDescription>Pilih bahasa antarmuka</CardDescription>
          </CardHeader>
          <CardContent>
            <LanguageSwitcher />
          </CardContent>
        </Card>

        {/* Tentang */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Info className="text-primary size-4" />
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
              <span className="font-medium">{new Date().getFullYear()}</span>
            </div>
            <div className="text-muted-foreground mt-2 border-t pt-2 text-xs">
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
        <CardContent className="relative pt-0">
          <div className="-mt-10 flex items-end gap-3">
            <Skeleton className="ring-background size-16 rounded-full ring-4" />
            <div className="mb-1 flex-1 space-y-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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

function ChangePasswordButton() {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!currentPassword || !newPassword) {
      toast({ title: "Mohon isi semua kolom", variant: "destructive" })
      return
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Password baru tidak cocok", variant: "destructive" })
      return
    }
    if (newPassword.length < 6) {
      toast({ title: "Password baru minimal 6 karakter", variant: "destructive" })
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/users/me/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: "Gagal", description: data.error, variant: "destructive" })
      } else {
        toast({ title: "Berhasil", description: "Kata sandi telah diubah" })
        setOpen(false)
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
      }
    } catch {
      toast({ title: "Terjadi kesalahan", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
        <div>
          <div className="text-sm font-medium">Kata Sandi</div>
          <div className="text-muted-foreground text-xs">Ubah kata sandi secara berkala.</div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          Ubah
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ubah Kata Sandi</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="current-pw">Password Saat Ini</Label>
              <Input
                id="current-pw"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-pw">Password Baru</Label>
              <Input
                id="new-pw"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-pw">Konfirmasi Password Baru</Label>
              <Input
                id="confirm-pw"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={loading || !currentPassword || !newPassword}
            >
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Simpan
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function DeleteAccountButton() {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (!password) {
      toast({ title: "Masukkan password", variant: "destructive" })
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/users/me/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: "Gagal", description: data.error, variant: "destructive" })
      } else {
        toast({ title: "Akun dihapus" })
        signOut({ callbackUrl: "/" })
      }
    } catch {
      toast({ title: "Terjadi kesalahan", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="border-destructive/30 bg-destructive/5 flex items-center justify-between gap-3 rounded-lg border p-3">
        <div>
          <div className="text-destructive text-sm font-medium">Hapus Akun</div>
          <div className="text-muted-foreground text-xs">Tindakan ini tidak dapat dibatalkan.</div>
        </div>
        <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
          Hapus
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive">Hapus Akun</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-muted-foreground text-sm">
              Semua data Anda akan dihapus secara permanen. Ketik password untuk konfirmasi.
            </p>
            <Input
              type="password"
              placeholder="Masukkan password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleDelete}
              disabled={loading || !password}
            >
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Hapus Akun Saya
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
