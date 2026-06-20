import { useQuery } from "@tanstack/react-query"
import type { SettingsUser } from "@/components/profile/types"

export function useUserSettings() {
  return useQuery({
    queryKey: ["userSettings"],
    queryFn: async (): Promise<SettingsUser> => {
      const res = await fetch("/api/users/me")
      if (!res.ok) throw new Error("Gagal memuat pengguna")
      const data = await res.json()
      return data.user
    },
    staleTime: 30_000,
  })
}
