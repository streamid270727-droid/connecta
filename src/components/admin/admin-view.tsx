"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { EmptyState } from "@/components/common/empty-state"
import { UserAvatar } from "@/components/common/user-avatar"
import { useToast } from "@/hooks/use-toast"
import { formatRelativeTime } from "@/lib/format"
import {
  Shield,
  Users,
  Flag,
  Loader2,
  RefreshCw,
  Search,
  CheckCircle2,
  Ban,
  Eye,
  Trash2,
  AlertCircle,
} from "lucide-react"

interface AdminUser {
  id: string
  name: string
  username: string
  email: string
  avatarUrl: string | null
  role: string
  isVerified: boolean
  isPrivate: boolean
  createdAt: string
  _count: { posts: number; comments: number }
}

interface AdminReport {
  id: string
  reporterId: string
  targetId: string
  targetType: string
  reason: string
  content: string | null
  status: string
  createdAt: string
  reporter: { id: string; name: string; username: string; avatarUrl: string | null }
}

export function AdminView() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const qc = useQueryClient()
  const [searchInput, setSearchInput] = useState("")

  const usersQuery = useQuery({
    queryKey: ["adminUsers"],
    queryFn: async (): Promise<AdminUser[]> => {
      const res = await fetch("/api/admin/users")
      if (!res.ok) throw new Error("Gagal memuat pengguna")
      const data = await res.json()
      return data.users
    },
    staleTime: 30_000,
  })

  const reportsQuery = useQuery({
    queryKey: ["adminReports"],
    queryFn: async (): Promise<AdminReport[]> => {
      const res = await fetch("/api/admin/reports")
      if (!res.ok) throw new Error("Gagal memuat laporan")
      const data = await res.json()
      return data.reports
    },
    staleTime: 10_000,
  })

  const toggleVerifyMutation = useMutation({
    mutationFn: async ({ userId, isVerified }: { userId: string; isVerified: boolean }) => {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVerified: !isVerified }),
      })
      if (!res.ok) throw new Error("Gagal")
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adminUsers"] })
      toast({ title: "Berhasil" })
    },
  })

  const toggleRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: role === "admin" ? "user" : "admin" }),
      })
      if (!res.ok) throw new Error("Gagal")
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adminUsers"] })
      toast({ title: "Berhasil" })
    },
  })

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Gagal menghapus")
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adminUsers"] })
      toast({ title: "Pengguna dihapus" })
    },
  })

  const updateReportMutation = useMutation({
    mutationFn: async ({ reportId, status }: { reportId: string; status: string }) => {
      const res = await fetch(`/api/admin/reports/${reportId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error("Gagal")
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adminReports"] })
      toast({ title: "Laporan diperbarui" })
    },
  })

  const users = usersQuery.data ?? []
  const reports = reportsQuery.data ?? []
  const filteredUsers = searchInput
    ? users.filter(
        (u) =>
          u.name.toLowerCase().includes(searchInput.toLowerCase()) ||
          u.username.toLowerCase().includes(searchInput.toLowerCase()) ||
          u.email.toLowerCase().includes(searchInput.toLowerCase())
      )
    : users

  const pendingReports = reports.filter((r) => r.status === "pending")
  const totalUsers = users.length
  const adminCount = users.filter((u) => u.role === "admin").length

  return (
    <div className="min-h-screen pb-8">
      <div className="px-4 pt-4 pb-2 sm:px-6">
        <div className="mb-1 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-orange-600 shadow-md shadow-red-500/30">
            <Shield className="size-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground text-xs">
              {totalUsers} pengguna · {adminCount} admin · {pendingReports.length} laporan pending
            </p>
          </div>
        </div>
      </div>

      <div className="px-2 py-2 sm:px-4">
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="mb-4 h-12 w-full justify-start gap-1 rounded-none border-b bg-transparent p-0">
            <TabsTrigger
              value="users"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground h-10 flex-1 rounded-lg sm:flex-none sm:px-5"
            >
              <Users className="size-4" /> Pengguna
              <Badge variant="secondary" className="ml-1 text-[10px]">
                {totalUsers}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="reports"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground h-10 flex-1 rounded-lg sm:flex-none sm:px-5"
            >
              <Flag className="size-4" /> Laporan
              {pendingReports.length > 0 && (
                <Badge variant="destructive" className="ml-1 text-[10px]">
                  {pendingReports.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <div className="px-2 sm:px-0">
              <div className="relative mb-4">
                <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                  placeholder="Cari nama, username, atau email..."
                  className="pl-9"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </div>

              {usersQuery.isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Card key={i} className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-muted size-10 animate-pulse rounded-full" />
                        <div className="flex-1 space-y-2">
                          <div className="bg-muted h-3 w-32 animate-pulse rounded" />
                          <div className="bg-muted h-2.5 w-20 animate-pulse rounded" />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : usersQuery.error ? (
                <EmptyState
                  icon={<AlertCircle className="size-10" />}
                  title="Gagal memuat data"
                  action={
                    <Button variant="outline" size="sm" onClick={() => usersQuery.refetch()}>
                      <RefreshCw className="size-4" /> Coba lagi
                    </Button>
                  }
                />
              ) : filteredUsers.length === 0 ? (
                <EmptyState
                  icon={<Users className="size-10" />}
                  title="Tidak ada pengguna ditemukan"
                />
              ) : (
                <div className="space-y-2">
                  {filteredUsers.map((user) => (
                    <Card key={user.id} className="p-3 sm:p-4">
                      <div className="flex items-start gap-3">
                        <UserAvatar
                          src={user.avatarUrl}
                          name={user.name}
                          seed={user.id}
                          size="md"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold">{user.name}</span>
                            {user.isVerified && <CheckCircle2 className="text-primary size-3.5" />}
                            {user.role === "admin" && (
                              <Badge variant="destructive" className="px-1.5 text-[10px]">
                                Admin
                              </Badge>
                            )}
                            {user.isPrivate && (
                              <Badge variant="secondary" className="px-1.5 text-[10px]">
                                Private
                              </Badge>
                            )}
                          </div>
                          <p className="text-muted-foreground text-xs">
                            @{user.username} · {user.email}
                          </p>
                          <p className="text-muted-foreground mt-0.5 text-[11px]">
                            {user._count.posts} postingan · {user._count.comments} komentar ·
                            Bergabung {formatRelativeTime(user.createdAt)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8"
                            onClick={() =>
                              toggleVerifyMutation.mutate({
                                userId: user.id,
                                isVerified: user.isVerified,
                              })
                            }
                            title={user.isVerified ? "Hapus verifikasi" : "Verifikasi"}
                          >
                            <CheckCircle2
                              className={`size-4 ${user.isVerified ? "text-primary fill-primary" : "text-muted-foreground"}`}
                            />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8"
                            onClick={() =>
                              toggleRoleMutation.mutate({ userId: user.id, role: user.role })
                            }
                            title={user.role === "admin" ? "Turunkan" : "Jadikan admin"}
                          >
                            <Shield
                              className={`size-4 ${user.role === "admin" ? "text-destructive" : "text-muted-foreground"}`}
                            />
                          </Button>
                          {user.id !== session?.user?.id && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive size-8"
                              onClick={() => {
                                if (confirm(`Hapus pengguna ${user.name}?`)) {
                                  deleteUserMutation.mutate(user.id)
                                }
                              }}
                              title="Hapus pengguna"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="reports">
            <div className="px-2 sm:px-0">
              {reportsQuery.isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i} className="p-4">
                      <div className="space-y-2">
                        <div className="bg-muted h-3 w-48 animate-pulse rounded" />
                        <div className="bg-muted h-2.5 w-32 animate-pulse rounded" />
                      </div>
                    </Card>
                  ))}
                </div>
              ) : reportsQuery.error ? (
                <EmptyState
                  icon={<AlertCircle className="size-10" />}
                  title="Gagal memuat laporan"
                  action={
                    <Button variant="outline" size="sm" onClick={() => reportsQuery.refetch()}>
                      <RefreshCw className="size-4" /> Coba lagi
                    </Button>
                  }
                />
              ) : reports.length === 0 ? (
                <EmptyState
                  icon={<Flag className="size-10" />}
                  title="Belum ada laporan"
                  description="Laporan dari pengguna akan muncul di sini."
                />
              ) : (
                <div className="space-y-2">
                  {reports.map((report) => (
                    <Card key={report.id} className="p-3 sm:p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              variant={
                                report.status === "pending"
                                  ? "destructive"
                                  : report.status === "reviewed"
                                    ? "secondary"
                                    : "outline"
                              }
                              className="text-[10px]"
                            >
                              {report.status}
                            </Badge>
                            <Badge variant="outline" className="text-[10px]">
                              {report.targetType}
                            </Badge>
                          </div>
                          <p className="mt-1.5 text-sm font-medium">{report.reason}</p>
                          {report.content && (
                            <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                              {report.content}
                            </p>
                          )}
                          <p className="text-muted-foreground mt-1 text-[11px]">
                            Oleh @{report.reporter.username} ·{" "}
                            {formatRelativeTime(report.createdAt)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          {report.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[11px]"
                                onClick={() =>
                                  updateReportMutation.mutate({
                                    reportId: report.id,
                                    status: "reviewed",
                                  })
                                }
                              >
                                <Eye className="mr-1 size-3" /> Review
                              </Button>
                              <Button
                                size="sm"
                                className="h-7 text-[11px]"
                                onClick={() =>
                                  updateReportMutation.mutate({
                                    reportId: report.id,
                                    status: "resolved",
                                  })
                                }
                              >
                                <CheckCircle2 className="mr-1 size-3" /> Selesai
                              </Button>
                            </>
                          )}
                          {report.status === "reviewed" && (
                            <Button
                              size="sm"
                              className="h-7 text-[11px]"
                              onClick={() =>
                                updateReportMutation.mutate({
                                  reportId: report.id,
                                  status: "resolved",
                                })
                              }
                            >
                              <CheckCircle2 className="mr-1 size-3" /> Selesai
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
