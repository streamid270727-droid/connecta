export interface SettingsUser {
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
