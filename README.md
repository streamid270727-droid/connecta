# Connecta

Platform jejaring sosial modern yang dibangun dengan Next.js 16, React 19, Tailwind CSS 4, dan Prisma (SQLite). Fitur lengkap: feed, stories, chat real-time, pertemanan, notifikasi, admin dashboard, i18n, dan masih banyak lagi.

## Demo

```
Email    : demo@connecta.app
Password : demo1234
```

## Tech Stack

| Layer | Teknologi |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Bahasa | TypeScript 5 |
| UI | React 19, Tailwind CSS 4, shadcn/ui |
| State | Zustand (client), TanStack React Query (server) |
| Data Fetching | TanStack React Query v5 (infinite queries, optimistic updates) |
| Auth | NextAuth.js (Credentials, JWT, role-based) |
| Database | SQLite via Prisma 6 |
| Real-time | Socket.IO (micro-service) |
| Animasi | Framer Motion |
| Rich Text | MDX Editor |
| Drag & Drop | @dnd-kit |
| Ikon | Lucide React |
| Validasi | Zod |
| Password | bcryptjs |
| Image Optimization | next/image + AVIF/WebP |
| Sanitization | isomorphic-dompurify |
| Formatting | Prettier + Tailwind plugin |
| Testing | Vitest |

## Fitur

### Autentikasi & Profil
- Registrasi & login dengan credentials
- Role-based access (user, admin)
- Profil user dengan foto profil & sampul
- Edit bio, nama, lokasi, tanggal lahir
- Pengaturan akun (mode gelap/terang)
- Validasi form dengan Zod

### Feed & Postingan
- Buat postingan teks, gambar (maks 4), dan video
- Edit & hapus postingan
- Reaksi postingan (❤️ 😂 😮 😢 👍)
- Komentar dengan balasan (1 level nesting)
- Bagikan postingan ke feed sendiri
- Simpan/bookmark postingan
- Infinite scroll dengan cursor pagination
- Link preview & video embed (YouTube, Vimeo)
- Filter feed: Semua / Teman saja
- next/image optimization (AVIF/WebP)

### Stories (24 Jam)
- Buat story teks dengan gradient background
- Upload foto story
- Emoji picker untuk story teks
- Lihat story dengan swipe & keyboard navigation
- Reaksi emoji story (❤️ 😂 😮 😢 👍)
- Balasan story (otomatis masuk ke chat DM)
- View count untuk story sendiri
- Hapus story

### Chat Real-time
- Kirim & terima pesan langsung
- Real-time via WebSocket (Socket.IO)
- Typing indicator
- Read receipt (centang biru)
- Daftar percakapan dengan unread count
- Story reply otomatis jadi pesan DM

### Pertemanan
- Kirim/terima tolak permintaan pertemanan
- Saran teman
- Daftar teman
- Cari pengguna
- Blokir/buka blokir pengguna
- Profil pengguna lain

### Notifikasi
- Notifikasi real-time via socket
- Jenis: pertemanan, komentar, like, pesan, balasan, share
- Tandai sudah dibaca
- Tandai semua sudah dibaca
- Cursor pagination

### Admin Dashboard
- Manajemen pengguna (lihat, edit role, hapus)
- Moderasi laporan (review, ubah status)
- Role-based access control

### Internasionalisasi (i18n)
- Dukungan Bahasa Indonesia & English
- Language switcher di pengaturan
- Persistensi pilihan bahasa (localStorage)

### Navigasi & UI
- SPA-style navigation (single page)
- Responsive: mobile, tablet, desktop
- Bottom navigation (mobile)
- Sidebar kiri (desktop)
- Header dengan search & notifikasi
- Dark/Light/System theme
- Skeleton loading
- Toast notifikasi
- Image lightbox
- Shared EmptyState component
- Skip-to-content link (accessibility)

## Arsitektur

### Client-Side Routing

Aplikasi menggunakan SPA-style routing via Zustand store. views yang tersedia:
`feed`, `discover`, `profile`, `messages`, `notifications`, `friends`, `search`, `settings`, `admin`

### State Management

- **Zustand** — UI state (current view, conversation target, unread counts)
- **TanStack Query** — Server state (feed, comments, friends, stories, notifications, profile)

### TanStack Query Hooks

| Hook | Endpoint | Features |
|---|---|---|
| `useFeed` | `/api/posts` | Infinite query, scope filter |
| `useDiscoverFeed` | `/api/posts?scope=all` | Infinite query |
| `useComments` | `/api/posts/[id]/comments` | Query + 5 mutations (create, reply, like, edit, delete) |
| `useFriends` | `/api/friends` | 3 queries + 4 mutations |
| `useStories` | `/api/stories` | Query + create mutation |
| `useNotifications` | `/api/notifications` | Query + mark read mutations |
| `useProfile` | `/api/users/[id]` | Query + infinite posts + photos |
| `useUnreadCounts` | 3 endpoints | Polling 30s interval |

### API Response Formatter

`src/lib/api-response.ts` menyediakan helper functions untuk respons API yang konsisten:

```typescript
import { withErrorHandling, unauthorized, notFound, tooManyRequests } from "@/lib/api-response"

export const POST = withErrorHandling(async (request: Request) => {
  if (!session?.user?.id) return unauthorized()
  if (!post) return notFound("Postingan tidak ditemukan")
  // Error otomatis di-catch oleh wrapper
})
```

### Code Splitting

Komponen berat di-load secara dinamis:
- `MessagesView` — chat (socket-heavy)
- `AdminView` — admin dashboard
- `PostComposerDialog` — composer dialog
- `StoryViewer` — story modal

### Error Handling

- `src/app/error.tsx` — Global error boundary dengan retry & home button
- `src/app/not-found.tsx` — 404 page
- `src/lib/api-response.ts` — API error formatter (`withErrorHandling`, `unauthorized`, `notFound`, dll)
- Konsistensi pesan error (Bahasa Indonesia)

### Accessibility (a11y)

- 30+ `aria-label` pada icon-only buttons
- `aria-expanded` / `aria-pressed` untuk toggle buttons
- Skip-to-content link
- Dialog component (bukan custom div) untuk modal — keyboard trap + Escape
- Semua gambar punya `alt` attribute

### SEO

- Metadata lengkap (title, description, Open Graph, Twitter card)
- `sitemap.ts` — Dynamic sitemap generator
- `robots.txt` — Disallow `/api/` dan `/admin/`
- `manifest.json` — PWA manifest
- `metadataBase` untuk Open Graph URLs

### Dark Mode

- CSS variable system di `globals.css` (light + dark themes)
- `dark:` variants pada semua komponen
- Notification badges dengan dark variants
- Decorative blobs dengan reduced opacity di dark mode

## Struktur Project

```
connecta/
├── mini-services/
│   └── chat-service/            # WebSocket micro-service (Bun)
├── prisma/
│   ├── schema.prisma            # Database schema (20 models)
│   ├── custom.db                # SQLite database
│   └── seed.ts                  # Seed data
├── public/
│   ├── favicon.png
│   ├── manifest.json            # PWA manifest
│   ├── robots.txt
│   └── uploads/                 # User uploaded files
├── src/
│   ├── app/
│   │   ├── api/                 # REST API routes (46 files)
│   │   │   ├── admin/           # Admin routes (users, reports)
│   │   │   ├── auth/            # NextAuth + register
│   │   │   ├── comments/        # Comment actions
│   │   │   ├── conversations/   # Chat conversations
│   │   │   ├── friends/         # Friend actions
│   │   │   ├── link-preview/    # OG metadata extraction
│   │   │   ├── messages/        # Direct messages
│   │   │   ├── notifications/   # Notifications
│   │   │   ├── posts/           # Posts, likes, shares, saves
│   │   │   ├── reports/         # User reports
│   │   │   ├── stories/         # Stories CRUD + reactions
│   │   │   ├── trending/        # Trending posts
│   │   │   ├── upload/          # File upload
│   │   │   └── users/           # User profiles + settings
│   │   ├── error.tsx            # Global error boundary
│   │   ├── globals.css          # Global styles + CSS variables
│   │   ├── layout.tsx           # Root layout + providers
│   │   ├── not-found.tsx        # 404 page
│   │   ├── page.tsx             # Entry page
│   │   └── sitemap.ts           # Dynamic sitemap
│   ├── components/
│   │   ├── admin/               # Admin dashboard
│   │   ├── auth/                # Login/register screen
│   │   ├── common/              # Shared components
│   │   │   ├── empty-state.tsx  # Reusable empty state
│   │   │   ├── emoji-picker.tsx # Emoji picker grid
│   │   │   ├── language-switcher.tsx
│   │   │   ├── optimized-image.tsx  # next/image wrapper
│   │   │   └── user-avatar.tsx
│   │   ├── feed/                # Feed, post card, composer
│   │   ├── friends/             # Friends & search views
│   │   ├── layout/              # Header, sidebar, bottom nav
│   │   ├── messages/            # Chat/DM view
│   │   ├── notifications/       # Notifications view
│   │   ├── profile/             # Profile & settings
│   │   ├── stories/             # Stories bar & viewer
│   │   ├── ui/                  # shadcn/ui components
│   │   ├── app-shell.tsx        # Main app layout
│   │   └── query-provider.tsx   # TanStack Query provider
│   ├── hooks/api/               # TanStack Query hooks
│   │   ├── use-feed.ts
│   │   ├── use-comments.ts
│   │   ├── use-friends.ts
│   │   ├── use-stories.ts
│   │   ├── use-notifications.ts
│   │   ├── use-profile.ts
│   │   ├── use-unread-counts.ts
│   │   └── use-user-settings.ts
│   ├── i18n/                    # Translation files
│   │   ├── id.json              # Bahasa Indonesia
│   │   └── en.json              # English
│   ├── lib/
│   │   ├── admin.ts             # Admin middleware
│   │   ├── api-response.ts      # API error formatter
│   │   ├── auth.ts              # NextAuth config
│   │   ├── db.ts                # Prisma client
│   │   ├── i18n.tsx             # i18n context + hook
│   │   ├── query-client.ts      # TanStack QueryClient factory
│   │   ├── rate-limit.ts        # Rate limiter
│   │   ├── sanitize.ts          # DOMPurify sanitizer
│   │   ├── socket.ts            # Socket.IO client
│   │   ├── store.ts             # Zustand store
│   │   └── utils.ts             # cn() helper
│   ├── middleware.ts            # API route protection
│   └── types/
│       └── next-auth.d.ts       # Extended NextAuth types
├── tests/                       # Vitest test files
│   ├── api/                     # API route tests
│   ├── helpers/                 # Test utilities
│   ├── format.test.ts
│   ├── rate-limit.test.ts
│   ├── sanitize.test.ts
│   └── store.test.ts
├── .env.example
├── .prettierrc
├── .prettierignore
├── eslint.config.mjs
├── next.config.ts
├── package.json
└── tsconfig.json
```

## Database Schema (20 Models)

| Model | Deskripsi |
|---|---|
| `User` | Pengguna (dengan role: user/admin) |
| `Session` | Sesi autentikasi |
| `Account` | OAuth provider |
| `Post` | Postingan feed |
| `Comment` | Komentar postingan |
| `Like` | Reaksi postingan |
| `CommentLike` | Like komentar |
| `Share` | Bagikan postingan |
| `Friendship` | Pertemanan |
| `FriendRequest` | Permintaan pertemanan |
| `Notification` | Notifikasi |
| `Conversation` | Percakapan DM |
| `DirectMessage` | Pesan DM |
| `MessageRead` | Status baca pesan |
| `Story` | Story 24 jam |
| `StoryView` | Views story |
| `StoryReaction` | Reaksi story |
| `StoryReply` | Balasan story |
| `SavedPost` | Postingan tersimpan |
| `BlockedUser` | Blokir pengguna |

## API Routes

### Auth
| Method | Endpoint | Deskripsi |
|---|---|---|
| POST | `/api/auth/register` | Registrasi akun baru |
| POST | `/api/auth/[...nextauth]` | Login/logout (NextAuth) |

### Users
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/api/users/[id]` | Profil user |
| GET | `/api/users/[id]/photos` | Semua foto user |
| PUT | `/api/users/me` | Update profil sendiri |
| PUT | `/api/users/me/password` | Update password |
| DELETE | `/api/users/me` | Hapus akun |
| GET | `/api/users/search?q=` | Cari pengguna |
| GET | `/api/users/online` | Pengguna online |

### Posts
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/api/posts?scope=all&limit=10&cursor=` | Feed postingan |
| POST | `/api/posts` | Buat postingan |
| GET | `/api/posts/[id]` | Detail postingan |
| PUT | `/api/posts/[id]` | Edit postingan |
| DELETE | `/api/posts/[id]` | Hapus postingan |
| POST | `/api/posts/[id]/like` | Reaksi (❤️ 😂 😮 😢 👍) |
| POST | `/api/posts/[id]/share` | Bagikan postingan |
| POST | `/api/posts/[id]/save` | Simpan/bookmark |
| GET/POST | `/api/posts/[id]/comments` | Komentar |
| GET/DELETE | `/api/comments/[id]` | Edit/hapus komentar |
| GET | `/api/posts/saved` | Postingan tersimpan |
| GET | `/api/trending` | Postingan trending |

### Stories
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/api/stories` | Ambil stories |
| POST | `/api/stories` | Buat story |
| DELETE | `/api/stories/[id]` | Hapus story |
| POST | `/api/stories/[id]/view` | Tandai dilihat |
| POST | `/api/stories/[id]/react` | Reaksi story |
| POST | `/api/stories/[id]/reply` | Balas story |

### Messages
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/api/conversations` | Daftar percakapan |
| GET | `/api/conversations?unread=1` | Unread count |
| GET | `/api/conversations/[id]` | Detail percakapan |
| GET | `/api/conversations/[id]/messages` | Pesan percakapan |
| POST | `/api/messages` | Kirim pesan |
| POST | `/api/messages/[id]/read` | Tandai baca |

### Friends
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/api/friends` | Daftar teman |
| POST | `/api/friends/request` | Kirim permintaan |
| POST | `/api/friends/accept` | Terima permintaan |
| POST | `/api/friends/reject` | Tolak permintaan |
| GET | `/api/friends/requests` | Permintaan pending |
| GET | `/api/friends/requests?count=1` | Pending count |
| GET | `/api/friends/suggestions` | Saran teman |
| POST | `/api/friends/block` | Blokir pengguna |

### Notifications
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/api/notifications?cursor=&count=` | Ambil notifikasi |
| GET | `/api/notifications?count=1` | Unread count |
| POST | `/api/notifications/[id]/read` | Tandai baca |
| POST | `/api/notifications/read-all` | Tandai semua baca |

### Admin
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/api/admin/users` | Semua pengguna |
| PUT | `/api/admin/users/[id]` | Update user |
| DELETE | `/api/admin/users/[id]` | Hapus user |
| GET | `/api/admin/reports` | Semua laporan |
| PUT | `/api/admin/reports/[id]` | Update status laporan |

### Upload & Lainnya
| Method | Endpoint | Deskripsi |
|---|---|---|
| POST | `/api/upload` | Upload gambar (maks 4MB) |
| GET | `/api/link-preview?url=` | OG metadata extraction |
| GET | `/api/reports` | Buat laporan |

## Socket Events

### Client → Server
| Event | Data | Deskripsi |
|---|---|---|
| `user:online` | `{ userId, name, username, avatarUrl }` | User online |
| `dm:join` | `{ conversationId }` | Join room percakapan |
| `dm:leave` | `{ conversationId }` | Leave room |
| `dm:message` | `{ ... }` | Kirim pesan |
| `dm:typing` | `{ conversationId, senderId }` | Mulai mengetik |
| `dm:stop-typing` | `{ conversationId, senderId }` | Berhenti mengetik |

### Server → Client
| Event | Data | Deskripsi |
|---|---|---|
| `dm:message` | `{ ... }` | Pesan baru diterima |
| `dm:typing` | `{ conversationId, senderId }` | Seseorang mengetik |
| `dm:stop-typing` | `{ conversationId, senderId }` | Berhenti mengetik |
| `notif:new` | `{ ... }` | Notifikasi baru |
| `users:online` | `[userId, ...]` | Daftar user online |

## Setup

### Prasyarat

- Node.js 18+
- npm

### Instalasi

```bash
# Clone repository
git clone https://github.com/username/connecta.git
cd connecta

# Install dependencies
npm install

# Setup environment
copy .env.example .env

# Generate Prisma client
npx prisma generate

# Push database schema
npx prisma db push

# Seed database (opsional)
npx tsx prisma/seed.ts

# Jalankan development server
npm run dev
```

### Environment Variables

```env
DATABASE_URL="file:./custom.db"
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=connecta-dev-secret-key-change-in-production-2024
```

### Chat Service (Opsional)

Chat real-time berjalan sebagai micro-service terpisah dengan Bun:

```bash
cd mini-services/chat-service
bun install
bun run index.ts
```

Chat service berjalan di port **3003**.

## Scripts

| Script | Deskripsi |
|---|---|
| `npm run dev` | Jalankan development server (port 3000) |
| `npm run build` | Build untuk production |
| `npm run start` | Jalankan production server |
| `npm run lint` | Jalankan ESLint |
| `npm run lint:fix` | Auto-fix ESLint issues |
| `npm run format` | Format dengan Prettier |
| `npm run format:check` | Cek format Prettier |
| `npm run test` | Jalankan tests (Vitest) |
| `npm run db:push` | Push schema ke database |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Jalankan migrasi |
| `npm run db:reset` | Reset database |

## Testing

```bash
# Jalankan semua tests
npm run test

# Jalankan tests tertentu
npx vitest run tests/api/posts.test.ts
```

73 tests across 8 test files:
- `tests/api/register.test.ts` — 8 tests
- `tests/api/posts.test.ts` — 5 tests
- `tests/api/comments.test.ts` — 6 tests
- `tests/api/stories.test.ts` — 5 tests
- `tests/format.test.ts` — 26 tests
- `tests/rate-limit.test.ts` — 4 tests
- `tests/store.test.ts` — 7 tests
- `tests/sanitize.test.ts` — 12 tests

## Kontribusi

1. Fork repository
2. Buat branch baru (`git checkout -b feature/nama-fitur`)
3. Commit perubahan (`git commit -m 'Add fitur X'`)
4. Push ke branch (`git push origin feature/nama-fitur`)
5. Buka Pull Request

## Lisensi

MIT License
