"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Loader2,
  Mail,
  Lock,
  User,
  AtSign,
  Heart,
  Users,
  MessageCircle,
  Shield,
  Zap,
} from "lucide-react"
import { toast } from "sonner"

export function AuthScreen() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState<"login" | "register" | null>(null)

  // Login state
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")

  // Register state
  const [regName, setRegName] = useState("")
  const [regUsername, setRegUsername] = useState("")
  const [regEmail, setRegEmail] = useState("")
  const [regPassword, setRegPassword] = useState("")

  const callbackUrl = searchParams.get("callbackUrl") || "/"

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!loginEmail || !loginPassword) {
      toast.error("Mohon isi email dan kata sandi")
      return
    }
    setLoading("login")
    try {
      const res = await signIn("credentials", {
        email: loginEmail,
        password: loginPassword,
        redirect: false,
      })
      if (res?.error) {
        toast.error(res.error)
      } else {
        toast.success("Selamat datang kembali!")
        router.refresh()
      }
    } catch (err) {
      toast.error("Terjadi kesalahan")
    } finally {
      setLoading(null)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!regName || !regUsername || !regEmail || !regPassword) {
      toast.error("Mohon lengkapi semua kolom")
      return
    }
    setLoading("register")
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: regName,
          username: regUsername,
          email: regEmail,
          password: regPassword,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Gagal mendaftar")
      } else {
        // Auto-login after register
        const signInRes = await signIn("credentials", {
          email: regEmail,
          password: regPassword,
          redirect: false,
        })
        if (signInRes?.error) {
          toast.error("Akun dibuat. Silakan login.")
        } else {
          toast.success("Akun berhasil dibuat! Selamat datang di Connecta!")
          router.refresh()
        }
      }
    } catch (err) {
      toast.error("Terjadi kesalahan")
    } finally {
      setLoading(null)
    }
  }

  const fillDemo = async () => {
    setLoginEmail("demo@connecta.app")
    setLoginPassword("demo1234")
    toast.info("Kredensial demo terisi. Klik Masuk.")
  }

  return (
    <div className="bg-background flex min-h-screen flex-col lg:flex-row">
      {/* Left: Brand showcase */}
      <div className="bg-primary relative hidden overflow-hidden lg:flex lg:w-1/2">
        <div className="relative z-10 flex flex-col justify-center px-12 text-white xl:px-20">
          <div className="mb-8 flex items-center gap-3">
            <span className="text-4xl font-bold tracking-tight">
              Conne<span className="text-primary-foreground/60">cta</span>
            </span>
          </div>
          <h1 className="mb-4 text-4xl leading-tight font-bold xl:text-5xl">
            Terhubung, Berbagi,
            <br />
            Berkembang Bersama.
          </h1>
          <p className="mb-10 max-w-md text-lg text-white/80">
            Ruang digital yang aman, cepat, dan intuitif untuk mempererat hubungan personal dan
            profesional Anda.
          </p>

          <div className="max-w-md space-y-4">
            <Feature
              icon={<Heart className="size-5" />}
              title="Berbagi Momen"
              desc="Bagikan pembaruan teks, foto, dan video dengan teman."
            />
            <Feature
              icon={<Users className="size-5" />}
              title="Terhubung"
              desc="Temukan teman dan kelola koneksi sosial Anda."
            />
            <Feature
              icon={<MessageCircle className="size-5" />}
              title="Pesan Langsung"
              desc="Chat real-time dengan indikator typing dan read receipt."
            />
            <Feature
              icon={<Shield className="size-5" />}
              title="Aman & Privat"
              desc="Kata sandi di-hash, privasi akun sepenuhnya Anda kendalikan."
            />
          </div>
        </div>
      </div>

      {/* Right: Auth form */}
      <div className="flex flex-1 items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile brand */}
          <div className="mb-8 flex flex-col items-center lg:hidden">
            <span className="text-3xl font-bold tracking-tight">
              Conne<span className="text-primary">cta</span>
            </span>
            <p className="text-muted-foreground mt-1 text-sm">Terhubung, Berbagi, Berkembang</p>
          </div>

          <div className="mb-6">
            <h2 className="text-foreground text-2xl font-bold">Selamat datang</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Masuk atau buat akun untuk mulai terhubung.
            </p>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="mb-6 grid w-full grid-cols-2">
              <TabsTrigger value="login">Masuk</TabsTrigger>
              <TabsTrigger value="register">Daftar</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <div className="relative">
                    <Mail className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="nama@email.com"
                      className="pl-9"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      autoComplete="email"
                      disabled={loading !== null}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Kata Sandi</Label>
                  <div className="relative">
                    <Lock className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-9"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      autoComplete="current-password"
                      disabled={loading !== null}
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading !== null}>
                  {loading === "login" ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    "Masuk"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground w-full"
                  onClick={fillDemo}
                  disabled={loading !== null}
                >
                  <Zap className="size-3.5" />
                  Gunakan akun demo
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-name">Nama Lengkap</Label>
                  <div className="relative">
                    <User className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                      id="reg-name"
                      type="text"
                      placeholder="Nama Anda"
                      className="pl-9"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      autoComplete="name"
                      disabled={loading !== null}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-username">Username</Label>
                  <div className="relative">
                    <AtSign className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                      id="reg-username"
                      type="text"
                      placeholder="username"
                      className="pl-9"
                      value={regUsername}
                      onChange={(e) =>
                        setRegUsername(e.target.value.toLowerCase().replace(/\s/g, ""))
                      }
                      autoComplete="username"
                      disabled={loading !== null}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-email">Email</Label>
                  <div className="relative">
                    <Mail className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="nama@email.com"
                      className="pl-9"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      autoComplete="email"
                      disabled={loading !== null}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password">Kata Sandi</Label>
                  <div className="relative">
                    <Lock className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                      id="reg-password"
                      type="password"
                      placeholder="Minimal 6 karakter"
                      className="pl-9"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      autoComplete="new-password"
                      disabled={loading !== null}
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading !== null}>
                  {loading === "register" ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Membuat akun...
                    </>
                  ) : (
                    "Buat Akun"
                  )}
                </Button>
                <p className="text-muted-foreground text-center text-xs">
                  Dengan mendaftar, Anda menyetujui Ketentuan Layanan dan Kebijakan Privasi
                  Connecta.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20 backdrop-blur-sm">
        {icon}
      </div>
      <div>
        <div className="font-semibold">{title}</div>
        <div className="text-sm text-white/70">{desc}</div>
      </div>
    </div>
  )
}
