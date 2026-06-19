/**
 * Connecta Seed Script
 * Run with: bun run prisma/seed.ts
 *
 * Creates:
 * - 1 demo user (demo@connecta.app / demo1234)
 * - 8 additional demo users with avatars and bios
 * - Friendships between demo user and 4 others
 * - Pending friend requests from 2 users
 * - Sample posts with images, video links, and varied content
 * - Likes and comments on posts
 * - 1 conversation with messages
 */
import { PrismaClient } from "@prisma/client"
import { hash } from "bcryptjs"

const db = new PrismaClient()

async function main() {
  console.log("🌱 Seeding Connecta database...")

  // Clean existing data
  await db.messageRead.deleteMany()
  await db.directMessage.deleteMany()
  await db.conversation.deleteMany()
  await db.notification.deleteMany()
  await db.friendRequest.deleteMany()
  await db.friendship.deleteMany()
  await db.commentLike.deleteMany()
  await db.comment.deleteMany()
  await db.share.deleteMany()
  await db.like.deleteMany()
  await db.savedPost.deleteMany()
  await db.storyView.deleteMany()
  await db.story.deleteMany()
  await db.post.deleteMany()
  await db.session.deleteMany()
  await db.account.deleteMany()
  await db.user.deleteMany()
  console.log("  ✓ Cleaned existing data")

  const password = await hash("demo1234", 12)

  // Create main demo user
  const demoUser = await db.user.create({
    data: {
      email: "demo@connecta.app",
      username: "demo",
      name: "Demo Connecta",
      password,
      bio: "Pengguna demo Connecta. Suka ngopi, fotografi, dan menjelajah tempat baru. ☕📸",
      avatarUrl: "https://i.pravatar.cc/300?img=12",
      coverUrl: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&q=80",
      location: "Jakarta, Indonesia",
      birthDate: new Date("1995-06-15"),
      isVerified: true,
    },
  })

  // Create additional demo users
  const otherUsers = [
    {
      email: "siti@gmail.com",
      username: "siti_rahma",
      name: "Siti Rahmawati",
      bio: "Designer & coffee enthusiast ✨ | Jakarta",
      avatarUrl: "https://i.pravatar.cc/300?img=45",
      coverUrl: "https://images.unsplash.com/photo-1487014679447-9f8336841d58?w=1200&q=80",
      location: "Bandung, Indonesia",
    },
    {
      email: "budi@gmail.com",
      username: "budi_santoso",
      name: "Budi Santoso",
      bio: "Software Engineer 💻 | Open source enthusiast | Kucing lover 🐱",
      avatarUrl: "https://i.pravatar.cc/300?img=33",
      coverUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&q=80",
      location: "Surabaya, Indonesia",
    },
    {
      email: "rara@gmail.com",
      username: "rara_anggraini",
      name: "Rara Anggraini",
      bio: "Travel blogger 🌍 | Foodie 🍜 | Currently in Bali",
      avatarUrl: "https://i.pravatar.cc/300?img=20",
      coverUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80",
      location: "Denpasar, Bali",
    },
    {
      email: "agung@gmail.com",
      username: "agung_wijaya",
      name: "Agung Wijaya",
      bio: "Photographer 📷 | Capturing moments one click at a time",
      avatarUrl: "https://i.pravatar.cc/300?img=53",
      coverUrl: "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=1200&q=80",
      location: "Yogyakarta, Indonesia",
    },
    {
      email: "maya@gmail.com",
      username: "maya.putri",
      name: "Maya Putri",
      bio: "Mahasiswa kedokteran 🩺 | Suka baca novel & nonton drama",
      avatarUrl: "https://i.pravatar.cc/300?img=24",
      location: "Makassar, Indonesia",
    },
    {
      email: "dimas@gmail.com",
      username: "dimas.prasetyo",
      name: "Dimas Prasetyo",
      bio: "Musician 🎸 | Teacher | Hidup itu seperti musik, nikmati tiap iramanya",
      avatarUrl: "https://i.pravatar.cc/300?img=60",
      location: "Semarang, Indonesia",
    },
    {
      email: "rina@gmail.com",
      username: "rina.lestari",
      name: "Rina Lestari",
      bio: "Marketing enthusiast | Food lover 🍕 | Cat mom 🐱",
      avatarUrl: "https://i.pravatar.cc/300?img=48",
      location: "Medan, Indonesia",
    },
    {
      email: "bayu@gmail.com",
      username: "bayu.nugroho",
      name: "Bayu Nugroho",
      bio: "Gamer 🎮 | Programmer | Coffee addict ☕",
      avatarUrl: "https://i.pravatar.cc/300?img=15",
      location: "Malang, Indonesia",
    },
  ]

  const createdUsers: Array<{ id: string; email: string; username: string; name: string; bio: string | null; avatarUrl: string | null; coverUrl: string | null; location: string | null }> = []
  for (const u of otherUsers) {
    const user = await db.user.create({
      data: { ...u, password, isVerified: Math.random() > 0.5 },
    })
    createdUsers.push(user)
  }
  console.log(`  ✓ Created ${createdUsers.length + 1} users`)

  // Friendships: demo user is friends with first 4 users
  const friendIds = createdUsers.slice(0, 4).map((u) => u.id)
  for (const fid of friendIds) {
    await db.friendship.create({ data: { userId: demoUser.id, friendId: fid } })
    await db.friendship.create({ data: { userId: fid, friendId: demoUser.id } })
  }
  // Also friendships between some of the other users
  await db.friendship.create({ data: { userId: createdUsers[0].id, friendId: createdUsers[4].id } })
  await db.friendship.create({ data: { userId: createdUsers[4].id, friendId: createdUsers[0].id } })
  await db.friendship.create({ data: { userId: createdUsers[1].id, friendId: createdUsers[2].id } })
  await db.friendship.create({ data: { userId: createdUsers[2].id, friendId: createdUsers[1].id } })
  console.log("  ✓ Created friendships")

  // Pending friend requests from 2 users
  await db.friendRequest.create({
    data: { senderId: createdUsers[5].id, recipientId: demoUser.id, status: "pending" },
  })
  await db.friendRequest.create({
    data: { senderId: createdUsers[6].id, recipientId: demoUser.id, status: "pending" },
  })
  console.log("  ✓ Created friend requests")

  // Sample images (Unsplash)
  const sampleImages = {
    coffee: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&q=80",
    mountain: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80",
    food: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80",
    cat: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800&q=80",
    beach: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80",
    city: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&q=80",
    sunset: "https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=800&q=80",
    books: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&q=80",
    guitar: "https://images.unsplash.com/photo-1525201548942-d8732f6617a0?w=800&q=80",
    code: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80",
  }

  // Create posts
  const posts = [
    // Demo user posts
    {
      authorId: demoUser.id,
      content: "Selamat pagi, Connecta! ☀️ Memulai hari dengan secangkir kopi dan pemandangan kota. Ada yang sudah ngopi belum hari ini?",
      images: JSON.stringify([sampleImages.coffee]),
      createdAt: new Date(Date.now() - 1000 * 60 * 30),
    },
    {
      authorId: demoUser.id,
      content: "Akhir pekan di pegunungan 🏔️ Udara segar, langit biru, dan ketenangan. Kadang kita perlu keluar dari hiruk-pikuk kota.",
      images: JSON.stringify([sampleImages.mountain, sampleImages.sunset]),
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
    },
    {
      authorId: demoUser.id,
      content: "Lagu ini cocok banget buat teman santai sore ini 🎵",
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    },
    // Siti posts
    {
      authorId: createdUsers[0].id,
      content: "Rebranding project selesai! 🎨 Sangat puas dengan hasilnya. Proses desain selalu menyenangkan ketika klien memberi kebebasan berkreasi. #design #branding",
      images: JSON.stringify([sampleImages.books]),
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    },
    {
      authorId: createdUsers[0].id,
      content: "Selamat datang di Connecta! Platform baru untuk terhubung dengan teman-teman. Mari mulai berbagi momen kalian. ✨",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6),
    },
    // Budi posts
    {
      authorId: createdUsers[1].id,
      content: "Code review malam ini 💻 Beberapa tips:\n\n1. Pastikan nama variabel deskriptif\n2. Hindari nested-if terlalu dalam\n3. Tulis komentar untuk logika kompleks\n4. Test edge cases\n\nHappy coding! 🚀",
      images: JSON.stringify([sampleImages.code]),
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3),
    },
    {
      authorId: createdUsers[1].id,
      content: "Kucing saya, Tom, lagi tidur di atas keyboard lagi 😹 Mana keyboard-nya hangat katanya. Ada tips biar kucing tidak ganggu coding?",
      images: JSON.stringify([sampleImages.cat]),
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8),
    },
    // Rara posts
    {
      authorId: createdUsers[2].id,
      content: "Sunset di Bali gak pernah mengecewakan 🌅 Kalau kalian ke Bali, jangan lupa mampir ke Uluwatu sore hari. Magis!",
      images: JSON.stringify([sampleImages.beach, sampleImages.sunset]),
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4),
    },
    {
      authorId: createdUsers[2].id,
      content: "Makan siang di warung lokal di Seminyak 🍜 Nasi campur Bali bumbunya kaya dan pedasnya pas. Harga ramah di kantong juga!",
      images: JSON.stringify([sampleImages.food]),
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12),
    },
    // Agung posts
    {
      authorId: createdUsers[3].id,
      content: "Sesi foto malam ini di Malioboro 📷 Lampu-lampu jalan bikin suasana begitu hidup. Street photography selalu punya cerita.",
      images: JSON.stringify([sampleImages.city]),
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 7),
    },
    // Dimas posts
    {
      authorId: createdUsers[5].id,
      content: "Lagu baru hampir selesai 🎸 Proses rekaman gitar akustik sore ini. Semangat untuk semua yang lagi berkarya!",
      images: JSON.stringify([sampleImages.guitar]),
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 9),
    },
    // Maya posts (not friend)
    {
      authorId: createdUsers[4].id,
      content: "Belajar untuk ujian kedokteran akhir pekan ini 📚 Doakan saya semangat ya! Bentar lagi semoga jadi dokter 👩‍⚕️",
      images: JSON.stringify([sampleImages.books]),
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 10),
    },
    // Rina posts (not friend)
    {
      authorId: createdUsers[6].id,
      content: "Pizza night! 🍕 Akhirnya nemu pizzeria enak di Medan. Recommended banget buat yang suka thin crust.",
      images: JSON.stringify([sampleImages.food]),
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 14),
    },
    // Bayu posts (not friend)
    {
      authorId: createdUsers[7].id,
      content: "Late night gaming session 🎮 Main game indie yang lagi viral. Seru banget tapi bikin begadang. Ada yang main juga?",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 16),
    },
  ]

  const createdPosts: Array<{ id: string; authorId: string; createdAt: Date; content: string; images: string | null; videoUrl: string | null }> = []
  for (const p of posts) {
    createdPosts.push(await db.post.create({ data: p }))
  }
  console.log(`  ✓ Created ${createdPosts.length} posts`)

  // Likes: random likes on posts
  const allUsers = [demoUser, ...createdUsers]
  for (const post of createdPosts) {
    // Each post gets 1-5 random likes
    const numLikes = Math.floor(Math.random() * 5) + 1
    const likers = allUsers
      .filter((u) => u.id !== post.authorId)
      .sort(() => Math.random() - 0.5)
      .slice(0, numLikes)
    for (const liker of likers) {
      try {
        await db.like.create({ data: { postId: post.id, userId: liker.id } })
      } catch {}
    }
  }
  console.log("  ✓ Created likes")

  // Comments
  const commentTexts = [
    "Keren banget! 👍",
    "Wah, foto-fotonya bagus parah 😍",
    "Setuju banget sama kamu!",
    "Lamanya ke sana? Pengen banget ikut 😅",
    "Mantap, lanjutkan!",
    "Iya nih, aku juga suka banget ☕",
    "Beri resepnya dong 😋",
    "Inspirasi banget, thanks for sharing!",
    "Kapan-kapan ngopi bareng yuk ☕",
    "Bagus banget kontennya, follow back ya!",
  ]
  for (const post of createdPosts.slice(0, 8)) {
    const numComments = Math.floor(Math.random() * 3) + 1
    const commenters = allUsers
      .filter((u) => u.id !== post.authorId)
      .sort(() => Math.random() - 0.5)
      .slice(0, numComments)
    for (const commenter of commenters) {
      const comment = await db.comment.create({
        data: {
          content: commentTexts[Math.floor(Math.random() * commentTexts.length)],
          postId: post.id,
          authorId: commenter.id,
          createdAt: new Date(post.createdAt.getTime() + Math.random() * 3600000),
        },
      })
      // Sometimes a reply from the post author
      if (Math.random() > 0.5) {
        await db.comment.create({
          data: {
            content: "Haha makasih! 😄",
            postId: post.id,
            authorId: post.authorId,
            parentId: comment.id,
            createdAt: new Date(comment.createdAt.getTime() + 60000),
          },
        })
      }
    }
  }
  console.log("  ✓ Created comments")

  // Shares: 1-2 shares on some posts
  for (const post of createdPosts.slice(0, 5)) {
    const sharer = allUsers.find((u) => u.id !== post.authorId && Math.random() > 0.5)
    if (sharer) {
      await db.share.create({ data: { postId: post.id, userId: sharer.id } })
    }
  }
  console.log("  ✓ Created shares")

  // Notifications: friend requests notifications (already implicit)
  await db.notification.create({
    data: {
      recipientId: demoUser.id,
      actorId: createdUsers[5].id,
      type: "friend_request",
      content: "mengirimi Anda permintaan pertemanan",
      isRead: false,
    },
  })
  await db.notification.create({
    data: {
      recipientId: demoUser.id,
      actorId: createdUsers[6].id,
      type: "friend_request",
      content: "mengirimi Anda permintaan pertemanan",
      isRead: false,
    },
  })
  // Some like notifications
  await db.notification.create({
    data: {
      recipientId: demoUser.id,
      actorId: createdUsers[0].id,
      type: "like",
      entityId: createdPosts[0].id,
      content: "menyukai postingan Anda",
      isRead: false,
    },
  })
  await db.notification.create({
    data: {
      recipientId: demoUser.id,
      actorId: createdUsers[1].id,
      type: "comment",
      entityId: createdPosts[0].id,
      content: "mengomentari postingan Anda",
      isRead: false,
    },
  })
  await db.notification.create({
    data: {
      recipientId: demoUser.id,
      actorId: createdUsers[2].id,
      type: "like",
      entityId: createdPosts[1].id,
      content: "menyukai postingan Anda",
      isRead: true,
    },
  })
  console.log("  ✓ Created notifications")

  // Conversation + messages between demo user and Siti
  const conv = await db.conversation.create({
    data: {
      user1Id: demoUser.id,
      user2Id: createdUsers[0].id,
    },
  })
  await db.directMessage.create({
    data: {
      conversationId: conv.id,
      senderId: createdUsers[0].id,
      recipientId: demoUser.id,
      content: "Hai Demo! Apa kabar? 👋",
      isRead: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 60),
    },
  })
  await db.directMessage.create({
    data: {
      conversationId: conv.id,
      senderId: demoUser.id,
      recipientId: createdUsers[0].id,
      content: "Hai Siti! Baik dong, kamu? 😄",
      isRead: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 55),
    },
  })
  await db.directMessage.create({
    data: {
      conversationId: conv.id,
      senderId: createdUsers[0].id,
      recipientId: demoUser.id,
      content: "Lumayan, lagi sibuk project nih. Nanti kopi-kopi yuk kalau sempat ☕",
      isRead: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 5),
    },
  })
  await db.messageRead.create({
    data: {
      conversationId: conv.id,
      userId: createdUsers[0].id,
      lastReadAt: new Date(Date.now() - 1000 * 60 * 5),
    },
  })
  console.log("  ✓ Created conversation with messages")

  // Another conversation with Budi (unread)
  const conv2 = await db.conversation.create({
    data: {
      user1Id: demoUser.id,
      user2Id: createdUsers[1].id,
    },
  })
  await db.directMessage.create({
    data: {
      conversationId: conv2.id,
      senderId: createdUsers[1].id,
      recipientId: demoUser.id,
      content: "Bro, code review-nya udah liat? Ada beberapa hal yang mau aku diskusi 🤔",
      isRead: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 30),
    },
  })
  console.log("  ✓ Created second conversation")

  // Stories (active, not expired)
  const storyGradients = [
    "from-rose-500 to-pink-600",
    "from-violet-500 to-purple-700",
    "from-amber-400 to-orange-600",
    "from-emerald-400 to-teal-600",
    "from-sky-400 to-cyan-600",
  ]
  const storyContents = [
    "Selamat pagi! ☀️ Semoga harimu menyenangkan.",
    "Lagi ngopi di tempat favorit ☕",
    "Selamat weekend semuanya! 🎉",
    "Jangan lupa istirahat ya 💚",
    "Hari yang produktif! 💪",
  ]

  const now = Date.now()
  // Stories from friends (created in the last few hours, expire in 24h)
  for (let i = 0; i < 4; i++) {
    const author = createdUsers[i]
    const createdAt = new Date(now - (i + 1) * 1000 * 60 * 60) // 1-4h ago
    await db.story.create({
      data: {
        authorId: author.id,
        content: storyContents[i],
        bgColor: storyGradients[i],
        textColor: "#ffffff",
        createdAt,
        expiresAt: new Date(createdAt.getTime() + 24 * 60 * 60 * 1000),
      },
    })
    // Mark as viewed by demo user (for the first 2)
    if (i < 2) {
      const story = await db.story.findFirst({
        where: { authorId: author.id },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      })
      if (story) {
        await db.storyView.create({
          data: { storyId: story.id, userId: demoUser.id },
        })
      }
    }
  }

  // Demo user's own story
  const myStoryTime = new Date(now - 1000 * 60 * 30) // 30 min ago
  const myStory = await db.story.create({
    data: {
      authorId: demoUser.id,
      content: "Selamat datang di Connecta! ✨",
      bgColor: "from-fuchsia-500 to-pink-700",
      textColor: "#ffffff",
      createdAt: myStoryTime,
      expiresAt: new Date(myStoryTime.getTime() + 24 * 60 * 60 * 1000),
    },
  })
  // Some views on demo user's story
  for (let i = 0; i < 3; i++) {
    try {
      await db.storyView.create({
        data: { storyId: myStory.id, userId: createdUsers[i].id },
      })
    } catch {}
  }
  console.log("  ✓ Created stories (5 active)")

  // Saved posts — demo user saves 2 posts
  const postsToSave = createdPosts.slice(2, 4)
  for (const p of postsToSave) {
    await db.savedPost.create({
      data: { postId: p.id, userId: demoUser.id },
    })
  }
  console.log("  ✓ Created saved posts (2)")

  // Posts with hashtags for trending
  const hashtagPosts = [
    { authorId: createdUsers[0].id, content: "Lagi senang banget hari ini #connecta #senang" },
    { authorId: createdUsers[1].id, content: "Tips coding pagi ini: selalu tulis komentar! #coding #tips" },
    { authorId: createdUsers[2].id, content: "Liburan ke Bali memang terbaik #travel #bali" },
    { authorId: createdUsers[3].id, content: "Fotografi itu tentang momen #photography #seni" },
    { authorId: demoUser.id, content: "Ngopi sambil kerja, paling enak #kopi #coding" },
    { authorId: createdUsers[4].id, content: "Belajar sambil santai #belajar #kuliah" },
  ]
  for (const p of hashtagPosts) {
    await db.post.create({
      data: {
        content: p.content,
        authorId: p.authorId,
        createdAt: new Date(now - Math.random() * 1000 * 60 * 60 * 12), // last 12h
      },
    })
  }
  console.log("  ✓ Created hashtag posts for trending (6)")

  console.log("\n✅ Seeding complete!")
  console.log("\n📋 Demo credentials:")
  console.log("   Email: demo@connecta.app")
  console.log("   Password: demo1234")
  console.log("\n   (All other demo users also use password: demo1234)")
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
