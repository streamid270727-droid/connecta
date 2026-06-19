# Connecta

Platform jejaring sosial modern yang dibangun dengan Next.js 16, React 19, Tailwind CSS 4, dan Prisma (SQLite). Fitur lengkap: feed, stories, chat real-time, pertemanan, notifikasi, dan masih banyak lagi.

## Demo

```
Email    : demo@connecta.app
Password : demo1234
```

## Tech Stack

| Layer | Teknologi |
|---|---|
| Framework | Next.js 16 (App Router) |
| Bahasa | TypeScript 5 |
| UI | React 19, Tailwind CSS 4, shadcn/ui |
| State | Zustand |
| Data Fetching | TanStack React Query |
| Auth | NextAuth.js (Credentials, JWT) |
| Database | SQLite via Prisma 6 |
| Real-time | Socket.IO (micro-service) |
| Animasi | Framer Motion |
| Rich Text | MDX Editor |
| Drag & Drop | @dnd-kit |
| Ikon | Lucide React |
| Validasi | Zod |
| Password | bcryptjs |

## Fitur

### Autentikasi & Profil
- Registrasi & login dengan credentials
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
- Link preview & video embed

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

## Struktur Project

```
connecta/
├── assets/img/              # Logo & aset statis
├── db/                      # SQLite database
├── mini-services/
│   └── chat-service/        # WebSocket micro-service (Bun)
├── prisma/
│   ├── schema.prisma        # Database schema (20 models)
│   └── seed.ts              # Seed data
├── public/                  # Static files (favicon, uploads)
├── src/
│   ├── app/
│   │   ├── api/             # REST API routes
│   │   ├── globals.css      # Global styles
│   │   ├── layout.tsx       # Root layout
│   │   └── page.tsx         # Entry page
│   ├── components/
│   │   ├── auth/            # Login/register screen
│   │   ├── common/          # Shared components
│   │   ├── feed/            # Feed, post card, composer
│   │   ├── friends/         # Friends & search views
│   │   ├── layout/          # Header, sidebar, bottom nav
│   │   ├── messages/        # Chat/DM view
│   │   ├── notifications/   # Notifications view
│   │   ├── profile/         # Profile & settings
│   │   ├── stories/         # Stories bar & viewer
│   │   └── ui/              # shadcn/ui components
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utilities, auth, db, socket
│   └── types/               # TypeScript type definitions
├── .env                     # Environment variables
├── package.json
├── tsconfig.json
└── tailwind.config.ts
```

## Database Schema (20 Models)

| Model | Deskripsi |
|---|---|
| `User` | Pengguna |
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
| GET | `/api/friends/suggestions` | Saran teman |
| POST | `/api/friends/block` | Blokir pengguna |

### Notifications
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/api/notifications?cursor=&count=` | Ambil notifikasi |
| POST | `/api/notifications/[id]/read` | Tandai baca |
| POST | `/api/notifications/read-all` | Tandai semua baca |

### Upload
| Method | Endpoint | Deskripsi |
|---|---|---|
| POST | `/api/upload` | Upload gambar (maks 4MB) |

## Socket Events

### Client → Server
| Event | Data | Deskripsi |
|---|---|---|
| `user:online` | `{ userId }` | User online |
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
- npm atau Bun
- (Opsional) Bun untuk chat service

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
| `npm run db:push` | Push schema ke database |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Jalankan migrasi |
| `npm run db:reset` | Reset database |

## Kontribusi

1. Fork repository
2. Buat branch baru (`git checkout -b feature/nama-fitur`)
3. Commit perubahan (`git commit -m 'Add fitur X'`)
4. Push ke branch (`git push origin feature/nama-fitur`)
5. Buka Pull Request

## Lisensi

MIT License
