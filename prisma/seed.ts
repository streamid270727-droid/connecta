import { PrismaClient } from "@prisma/client"
import { hash } from "bcryptjs"

const db = new PrismaClient()

async function main() {
  console.log("Seeding Connecta database...")

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
  console.log("  Cleaned existing data")

  const password = await hash("Andy0703-E", 12)

  const adminUser = await db.user.create({
    data: {
      email: "andy0703@gmail.com",
      username: "andy",
      name: "Andi Agung",
      password,
      bio: "Admin Connecta",
      role: "admin",
      isVerified: true,
    },
  })

  const otherUsers = [
    { email: "siti@gmail.com", username: "siti_rahma", name: "Siti Rahmawati", bio: "Designer & coffee enthusiast | Jakarta", avatarUrl: "https://i.pravatar.cc/300?img=45", coverUrl: "https://images.unsplash.com/photo-1487014679447-9f8336841d58?w=1200&q=80", location: "Bandung, Indonesia" },
    { email: "budi@gmail.com", username: "budi_santoso", name: "Budi Santoso", bio: "Software Engineer | Open source enthusiast", avatarUrl: "https://i.pravatar.cc/300?img=33", coverUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&q=80", location: "Surabaya, Indonesia" },
    { email: "rara@gmail.com", username: "rara_anggraini", name: "Rara Anggraini", bio: "Travel blogger | Foodie | Currently in Bali", avatarUrl: "https://i.pravatar.cc/300?img=20", coverUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80", location: "Denpasar, Bali" },
    { email: "agung@gmail.com", username: "agung_wijaya", name: "Agung Wijaya", bio: "Photographer | Capturing moments one click at a time", avatarUrl: "https://i.pravatar.cc/300?img=53", coverUrl: "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=1200&q=80", location: "Yogyakarta, Indonesia" },
    { email: "maya@gmail.com", username: "maya.putri", name: "Maya Putri", bio: "Mahasiswa kedokteran | Suka baca novel", avatarUrl: "https://i.pravatar.cc/300?img=24", location: "Makassar, Indonesia" },
    { email: "dimas@gmail.com", username: "dimas.prasetyo", name: "Dimas Prasetyo", bio: "Musician | Teacher | Nikmati tiap irama", avatarUrl: "https://i.pravatar.cc/300?img=60", location: "Semarang, Indonesia" },
    { email: "rina@gmail.com", username: "rina.lestari", name: "Rina Lestari", bio: "Marketing enthusiast | Food lover | Cat mom", avatarUrl: "https://i.pravatar.cc/300?img=48", location: "Medan, Indonesia" },
    { email: "bayu@gmail.com", username: "bayu.nugroho", name: "Bayu Nugroho", bio: "Gamer | Programmer | Coffee addict", avatarUrl: "https://i.pravatar.cc/300?img=15", location: "Malang, Indonesia" },
  ]

  const createdUsers: Array<{ id: string; email: string; username: string; name: string; bio: string | null; avatarUrl: string | null; coverUrl: string | null; location: string | null }> = []
  for (const u of otherUsers) {
    const user = await db.user.create({ data: { ...u, password, isVerified: Math.random() > 0.5 } })
    createdUsers.push(user)
  }
  console.log(`  Created ${createdUsers.length + 1} users`)

  const friendIds = createdUsers.slice(0, 4).map((u) => u.id)
  for (const fid of friendIds) {
    await db.friendship.create({ data: { userId: adminUser.id, friendId: fid } })
    await db.friendship.create({ data: { userId: fid, friendId: adminUser.id } })
  }
  await db.friendship.create({ data: { userId: createdUsers[0].id, friendId: createdUsers[4].id } })
  await db.friendship.create({ data: { userId: createdUsers[4].id, friendId: createdUsers[0].id } })
  await db.friendship.create({ data: { userId: createdUsers[1].id, friendId: createdUsers[2].id } })
  await db.friendship.create({ data: { userId: createdUsers[2].id, friendId: createdUsers[1].id } })
  console.log("  Created friendships")

  await db.friendRequest.create({ data: { senderId: createdUsers[5].id, recipientId: adminUser.id, status: "pending" } })
  await db.friendRequest.create({ data: { senderId: createdUsers[6].id, recipientId: adminUser.id, status: "pending" } })
  console.log("  Created friend requests")

  const img = {
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
    dog: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&q=80",
    car: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&q=80",
    laptop: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&q=80",
    gym: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80",
    plant: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&q=80",
    cake: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=80",
    travel: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&q=80",
    ocean: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=800&q=80",
    forest: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&q=80",
    painting: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800&q=80",
    basketball: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=80",
    camping: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&q=80",
    headphones: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80",
    ramen: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&q=80",
    snow: "https://images.unsplash.com/photo-1491002052546-bf38f186af56?w=800&q=80",
    flowers: "https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=800&q=80",
    workspace: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800&q=80",
    smoothie: "https://images.unsplash.com/photo-1502741224143-90386d7f8c82?w=800&q=80",
    nightSky: "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=800&q=80",
    yoga: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80",
    train: "https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=800&q=80",
    pizza: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80",
    sunrise: "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=800&q=80",
    notebook: "https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=800&q=80",
    cityNight: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=800&q=80",
    waterfall: "https://images.unsplash.com/photo-1432405972618-c6b0c0d40b2f?w=800&q=80",
    market: "https://images.unsplash.com/photo-1533900298894-052d2221afdb?w=800&q=80",
    autumn: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80",
    dessert: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&q=80",
    drone: "https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800&q=80",
  }

  const now = Date.now()
  const h = (hours: number) => new Date(now - 1000 * 60 * 60 * hours)
  const m = (minutes: number) => new Date(now - 1000 * 60 * minutes)

  const allPosts = [
    // Admin posts (8)
    { authorId: adminUser.id, content: "Selamat pagi, Connecta! Memulai hari dengan secangkir kopi. Ada yang sudah ngopi belum?", images: JSON.stringify([img.coffee]), createdAt: m(15) },
    { authorId: adminUser.id, content: "Akhir pekan di pegunungan. Udara segar, langit biru, dan ketenangan.", images: JSON.stringify([img.mountain, img.sunset]), createdAt: h(3) },
    { authorId: adminUser.id, content: "Lagu ini cocok banget buat teman santai sore ini", videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", createdAt: h(8) },
    { authorId: adminUser.id, content: "Work from home tapi tetap produktif. Setup meja baru, bikin mood kerja naik 100%!", images: JSON.stringify([img.workspace, img.laptop]), createdAt: h(14) },
    { authorId: adminUser.id, content: "Jalan-jalan ke hutan pinus. Udara sejiiiin, view-nya ga ada duanya.", images: JSON.stringify([img.forest]), createdAt: h(20) },
    { authorId: adminUser.id, content: "Malam minggu enaknya nonton bintang. Langit malam ini cerah banget!", images: JSON.stringify([img.nightSky]), createdAt: h(28) },
    { authorId: adminUser.id, content: "Yoga pagi bikin badan seger. Siapa yang rutin olahraga pagi? Share tips dong!", images: JSON.stringify([img.yoga]), createdAt: h(36) },
    { authorId: adminUser.id, content: "Nyoba resep baru: homemade ramen. Rasanya? PUAS BANGET!", images: JSON.stringify([img.ramen]), createdAt: h(48) },

    // Siti posts (7)
    { authorId: createdUsers[0].id, content: "Rebranding project selesai! Sangat puas dengan hasilnya. #design #branding", images: JSON.stringify([img.painting]), createdAt: h(2) },
    { authorId: createdUsers[0].id, content: "Selamat datang di Connecta! Platform baru untuk terhubung dengan teman-teman.", createdAt: h(5) },
    { authorId: createdUsers[0].id, content: "Bunga-bunga musim semi. Warnanya bikin hati adem.", images: JSON.stringify([img.flowers]), createdAt: h(18) },
    { authorId: createdUsers[0].id, content: "Butuh inspirasi desain? Coba lihat Pinterest atau Dribbble. #desaingrafis", createdAt: h(26) },
    { authorId: createdUsers[0].id, content: "Makan cake ulang tahun. Terima kasih teman-teman atas ucapan dan doanya!", images: JSON.stringify([img.cake]), createdAt: h(40) },
    { authorId: createdUsers[0].id, content: "Smoothie bowl buat sarapan sehat. Cantik dan enak!", images: JSON.stringify([img.smoothie]), createdAt: h(52) },
    { authorId: createdUsers[0].id, content: "Traveling ke Jepang impian banget. Lihat shinkansen!", images: JSON.stringify([img.train, img.travel]), createdAt: h(60) },

    // Budi posts (7)
    { authorId: createdUsers[1].id, content: "Code review malam ini. Tips: nama variabel deskriptif, hindari nested-if, test edge cases! Happy coding!", images: JSON.stringify([img.code]), createdAt: h(3) },
    { authorId: createdUsers[1].id, content: "Kucing saya, Tom, lagi tidur di atas keyboard lagi. Ada tips biar kucing tidak ganggu coding?", images: JSON.stringify([img.cat]), createdAt: h(7) },
    { authorId: createdUsers[1].id, content: "Baru selesai setup dev environment. Pakai Arch Linux + Neovim. Productivity naik 200%! #linux", images: JSON.stringify([img.laptop]), createdAt: h(15) },
    { authorId: createdUsers[1].id, content: "Tips: Gunakan Git branching strategy yang baik sejak awal project. #git #tips", createdAt: h(22) },
    { authorId: createdUsers[1].id, content: "Anjing saya, Rex, baru dapat juara 1 di lomba! #petlovers", images: JSON.stringify([img.dog]), createdAt: h(32) },
    { authorId: createdUsers[1].id, content: "Weekend coding challenge: buat CLI tool dari scratch. Seru banget!", images: JSON.stringify([img.code]), createdAt: h(50) },
    { authorId: createdUsers[1].id, content: "Deploy ke production di hari Jumat. Rule #1: JANGAN PERNAH deploy Jumat malam!", createdAt: h(58) },

    // Rara posts (7)
    { authorId: createdUsers[2].id, content: "Sunset di Bali gak pernah mengecewakan. Kalau ke Bali, jangan lupa mampir ke Uluwatu!", images: JSON.stringify([img.beach, img.sunset]), createdAt: h(4) },
    { authorId: createdUsers[2].id, content: "Makan siang di warung lokal di Seminyak. Nasi campur Bali bumbunya kaya!", images: JSON.stringify([img.food]), createdAt: h(12) },
    { authorId: createdUsers[2].id, content: "Pantai di Lombok masih sangat alami. Biru airnya ga ada duanya!", images: JSON.stringify([img.ocean, img.beach]), createdAt: h(24) },
    { authorId: createdUsers[2].id, content: "Sunrise di Bromo. Bangun jam 3 pagi tapi worth it banget!", images: JSON.stringify([img.sunrise, img.mountain]), createdAt: h(35) },
    { authorId: createdUsers[2].id, content: "Pizza enak banget di pizzeria baru. Thin crust-nya perfect!", images: JSON.stringify([img.pizza]), createdAt: h(44) },
    { authorId: createdUsers[2].id, content: "Camping di pinggir danau. Tenda, api unggun, bintang-bintang. Perfect night!", images: JSON.stringify([img.camping, img.nightSky]), createdAt: h(56) },
    { authorId: createdUsers[2].id, content: "Makan ramen di Jepang. Warm bowl of happiness!", images: JSON.stringify([img.ramen]), createdAt: h(70) },

    // Agung posts (6)
    { authorId: createdUsers[3].id, content: "Sesi foto malam ini di Malioboro. Lampu-lampu jalan bikin suasana begitu hidup.", images: JSON.stringify([img.city]), createdAt: h(7) },
    { authorId: createdUsers[3].id, content: "Photography tip: Golden hour is your best friend. Selalu bawa kamera!", images: JSON.stringify([img.sunset]), createdAt: h(16) },
    { authorId: createdUsers[3].id, content: "Drone photography membuka perspektif baru. View dari atas itu indah!", images: JSON.stringify([img.drone]), createdAt: h(25) },
    { authorId: createdUsers[3].id, content: "Foto street photography di pasar tradisional. Ekspresi orang-orang itu priceless!", images: JSON.stringify([img.market]), createdAt: h(38) },
    { authorId: createdUsers[3].id, content: "Night sky photography. Butuh tripod yang kuat dan kesabaran tinggi!", images: JSON.stringify([img.nightSky]), createdAt: h(46) },
    { authorId: createdUsers[3].id, content: "Air terjun tersembunyi di Jawa Tengah. Perjuangan hiking-nya ga main-main!", images: JSON.stringify([img.waterfall, img.forest]), createdAt: h(64) },

    // Maya posts (6)
    { authorId: createdUsers[4].id, content: "Belajar untuk ujian kedokteran akhir pekan ini. Doakan saya semangat ya!", images: JSON.stringify([img.books]), createdAt: h(10) },
    { authorId: createdUsers[4].id, content: "Selesai baca novel baru. Recommended banget buat pecinta fiksi!", images: JSON.stringify([img.notebook]), createdAt: h(20) },
    { authorId: createdUsers[4].id, content: "Study session di cafe. Kopi + buku = produktivitas maksimal!", images: JSON.stringify([img.coffee, img.books]), createdAt: h(30) },
    { authorId: createdUsers[4].id, content: "Praktikum hari ini seru banget! Dunia kedokteran memang menantang.", createdAt: h(42) },
    { authorId: createdUsers[4].id, content: "Jalan-jalan ke kebun binatang. Lucu-lucu binatangnya!", images: JSON.stringify([img.plant]), createdAt: h(54) },
    { authorId: createdUsers[4].id, content: "Wisuda udah di depan mata. Semangat buat semua mahasiswa yang lagi skripsi!", createdAt: h(66) },

    // Dimas posts (6)
    { authorId: createdUsers[5].id, content: "Lagu baru hampir selesai. Proses rekaman gitar akustik sore ini!", images: JSON.stringify([img.guitar]), createdAt: h(9) },
    { authorId: createdUsers[5].id, content: "Main basket sore sama teman-teman. Olahraga itu menyenangkan!", images: JSON.stringify([img.basketball, img.gym]), createdAt: h(19) },
    { authorId: createdUsers[5].id, content: "Konser musik akhir pekan kemarin. Energinya luar biasa!", images: JSON.stringify([img.headphones]), createdAt: h(29) },
    { authorId: createdUsers[5].id, content: "Tips belajar gitar: mulai dari chord dasar, jangan buru-buru!", createdAt: h(39) },
    { authorId: createdUsers[5].id, content: "Jamming session di studio. Musik menyatukan semua orang.", images: JSON.stringify([img.headphones, img.guitar]), createdAt: h(53) },
    { authorId: createdUsers[5].id, content: "Mengajar musik anak-anak. Senyum mereka bikin一切 worth it!", images: JSON.stringify([img.guitar]), createdAt: h(62) },

    // Rina posts (6)
    { authorId: createdUsers[6].id, content: "Pizza night! Akhirnya nemu pizzeria enak di Medan.", images: JSON.stringify([img.pizza, img.food]), createdAt: h(14) },
    { authorId: createdUsers[6].id, content: "Marketing meeting pagi ini. Strategi baru, semangat baru!", createdAt: h(21) },
    { authorId: createdUsers[6].id, content: "Cooking class hari ini. Belajar masak pasta dari chef Italia!", images: JSON.stringify([img.food, img.ramen]), createdAt: h(33) },
    { authorId: createdUsers[6].id, content: "Kucing saya, Mochi, lagi manja banget hari ini. Cat mom life!", images: JSON.stringify([img.cat]), createdAt: h(43) },
    { authorId: createdUsers[6].id, content: "Weekend shopping di mall. Beli buku baru dan skincare.", createdAt: h(55) },
    { authorId: createdUsers[6].id, content: "Snow pertama di Eropa!冻死了 tapi indah banget!", images: JSON.stringify([img.snow]), createdAt: h(68) },

    // Bayu posts (6)
    { authorId: createdUsers[7].id, content: "Late night gaming session. Main game indie yang lagi viral!", createdAt: h(16) },
    { authorId: createdUsers[7].id, content: "Baru upgrade PC baru. RGB semua! Gamer goals.", images: JSON.stringify([img.laptop]), createdAt: h(23) },
    { authorId: createdUsers[7].id, content: "Espresso pertama di pagi hari. Kopi adalah sumber kehidupan programmer.", images: JSON.stringify([img.coffee]), createdAt: h(34) },
    { authorId: createdUsers[7].id, content: "Road trip pakai mobil baru. Jalanan sepi, musik enak, life is good!", images: JSON.stringify([img.car]), createdAt: h(45) },
    { authorId: createdUsers[7].id, content: "Hackathon weekend ini. Tim kami menang juara 2!", images: JSON.stringify([img.code]), createdAt: h(57) },
    { authorId: createdUsers[7].id, content: "City night photography. Kota dari kejauhan selalu memukau.", images: JSON.stringify([img.cityNight]), createdAt: h(72) },
  ]

  const createdPosts: Array<{ id: string; authorId: string; createdAt: Date; content: string; images: string | null; videoUrl: string | null }> = []
  for (const p of allPosts) {
    createdPosts.push(await db.post.create({ data: p }))
  }
  console.log(`  Created ${createdPosts.length} posts`)

  const allUsers = [adminUser, ...createdUsers]
  for (const post of createdPosts) {
    const numLikes = Math.floor(Math.random() * 6) + 1
    const likers = allUsers.filter((u) => u.id !== post.authorId).sort(() => Math.random() - 0.5).slice(0, numLikes)
    for (const liker of likers) {
      try { await db.like.create({ data: { postId: post.id, userId: liker.id } }) } catch {}
    }
  }
  console.log("  Created likes")

  const commentTexts = [
    "Keren banget!",
    "Wah, foto-fotonya bagus parah",
    "Setuju banget sama kamu!",
    "Lamanya ke sana? Pengen banget ikut",
    "Mantap, lanjutkan!",
    "Iya nih, aku juga suka banget",
    "Beri resepnya dong",
    "Inspirasi banget, thanks for sharing!",
    "Kapan-kapan ngopi bareng yuk",
    "Bagus banget kontennya!",
    "Wow, amazing!",
    "Setuju sama tips-nya",
    "Kapan ke sana lagi?",
    "Aku juga mau coba!",
    "Thanks sharing-nya ya",
  ]
  for (const post of createdPosts.slice(0, 30)) {
    const numComments = Math.floor(Math.random() * 4) + 1
    const commenters = allUsers.filter((u) => u.id !== post.authorId).sort(() => Math.random() - 0.5).slice(0, numComments)
    for (const commenter of commenters) {
      const comment = await db.comment.create({
        data: {
          content: commentTexts[Math.floor(Math.random() * commentTexts.length)],
          postId: post.id,
          authorId: commenter.id,
          createdAt: new Date(post.createdAt.getTime() + Math.random() * 3600000),
        },
      })
      if (Math.random() > 0.5) {
        await db.comment.create({
          data: {
            content: "Makasih!",
            postId: post.id,
            authorId: post.authorId,
            parentId: comment.id,
            createdAt: new Date(comment.createdAt.getTime() + 60000),
          },
        })
      }
    }
  }
  console.log("  Created comments")

  for (const post of createdPosts.slice(0, 15)) {
    const sharer = allUsers.find((u) => u.id !== post.authorId && Math.random() > 0.5)
    if (sharer) {
      await db.share.create({ data: { postId: post.id, userId: sharer.id } })
    }
  }
  console.log("  Created shares")

  await db.notification.create({ data: { recipientId: adminUser.id, actorId: createdUsers[5].id, type: "friend_request", content: "mengirimi Anda permintaan pertemanan", isRead: false } })
  await db.notification.create({ data: { recipientId: adminUser.id, actorId: createdUsers[6].id, type: "friend_request", content: "mengirimi Anda permintaan pertemanan", isRead: false } })
  await db.notification.create({ data: { recipientId: adminUser.id, actorId: createdUsers[0].id, type: "like", entityId: createdPosts[0].id, content: "menyukai postingan Anda", isRead: false } })
  await db.notification.create({ data: { recipientId: adminUser.id, actorId: createdUsers[1].id, type: "comment", entityId: createdPosts[0].id, content: "mengomentari postingan Anda", isRead: false } })
  await db.notification.create({ data: { recipientId: adminUser.id, actorId: createdUsers[2].id, type: "like", entityId: createdPosts[1].id, content: "menyukai postingan Anda", isRead: true } })
  console.log("  Created notifications")

  const conv = await db.conversation.create({ data: { user1Id: adminUser.id, user2Id: createdUsers[0].id } })
  await db.directMessage.create({ data: { conversationId: conv.id, senderId: createdUsers[0].id, recipientId: adminUser.id, content: "Hai Andi! Apa kabar?", isRead: true, createdAt: new Date(now - 1000 * 60 * 60) } })
  await db.directMessage.create({ data: { conversationId: conv.id, senderId: adminUser.id, recipientId: createdUsers[0].id, content: "Hai Siti! Baik dong, kamu?", isRead: true, createdAt: new Date(now - 1000 * 60 * 55) } })
  await db.directMessage.create({ data: { conversationId: conv.id, senderId: createdUsers[0].id, recipientId: adminUser.id, content: "Lumayan, lagi sibuk project nih. Nanti kopi-kopi yuk kalau sempat", isRead: false, createdAt: new Date(now - 1000 * 60 * 5) } })
  await db.messageRead.create({ data: { conversationId: conv.id, userId: createdUsers[0].id, lastReadAt: new Date(now - 1000 * 60 * 5) } })
  console.log("  Created conversation with messages")

  const conv2 = await db.conversation.create({ data: { user1Id: adminUser.id, user2Id: createdUsers[1].id } })
  await db.directMessage.create({ data: { conversationId: conv2.id, senderId: createdUsers[1].id, recipientId: adminUser.id, content: "Bro, code review-nya udah liat? Ada beberapa hal yang mau aku diskusi", isRead: false, createdAt: new Date(now - 1000 * 60 * 30) } })
  console.log("  Created second conversation")

  const storyGradients = ["from-rose-500 to-pink-600", "from-violet-500 to-purple-700", "from-amber-400 to-orange-600", "from-emerald-400 to-teal-600", "from-sky-400 to-cyan-600"]
  const storyContents = ["Selamat pagi! Semoga harimu menyenangkan.", "Lagi ngopi di tempat favorit", "Selamat weekend semuanya!", "Jangan lupa istirahat ya", "Hari yang produktif!"]

  for (let i = 0; i < 4; i++) {
    const author = createdUsers[i]
    const createdAt = new Date(now - (i + 1) * 1000 * 60 * 60)
    await db.story.create({ data: { authorId: author.id, content: storyContents[i], bgColor: storyGradients[i], textColor: "#ffffff", createdAt, expiresAt: new Date(createdAt.getTime() + 24 * 60 * 60 * 1000) } })
    if (i < 2) {
      const story = await db.story.findFirst({ where: { authorId: author.id }, orderBy: { createdAt: "desc" }, select: { id: true } })
      if (story) { await db.storyView.create({ data: { storyId: story.id, userId: adminUser.id } }) }
    }
  }

  const myStoryTime = new Date(now - 1000 * 60 * 30)
  const myStory = await db.story.create({ data: { authorId: adminUser.id, content: "Selamat datang di Connecta!", bgColor: "from-fuchsia-500 to-pink-700", textColor: "#ffffff", createdAt: myStoryTime, expiresAt: new Date(myStoryTime.getTime() + 24 * 60 * 60 * 1000) } })
  for (let i = 0; i < 3; i++) { try { await db.storyView.create({ data: { storyId: myStory.id, userId: createdUsers[i].id } }) } catch {} }
  console.log("  Created stories (5 active)")

  const postsToSave = createdPosts.slice(2, 5)
  for (const p of postsToSave) {
    await db.savedPost.create({ data: { postId: p.id, userId: adminUser.id } })
  }
  console.log("  Created saved posts (3)")

  const hashtagPosts = [
    { authorId: createdUsers[0].id, content: "Lagi senang banget hari ini #connecta #senang" },
    { authorId: createdUsers[1].id, content: "Tips coding pagi ini: selalu tulis komentar! #coding #tips" },
    { authorId: createdUsers[2].id, content: "Liburan ke Bali memang terbaik #travel #bali" },
    { authorId: createdUsers[3].id, content: "Fotografi itu tentang momen #photography #seni" },
    { authorId: adminUser.id, content: "Ngopi sambil kerja, paling enak #kopi #coding" },
    { authorId: createdUsers[4].id, content: "Belajar sambil santai #belajar #kuliah" },
    { authorId: createdUsers[5].id, content: "Musik adalah jiwa #musik #gitar" },
    { authorId: createdUsers[6].id, content: "Masak itu terapi #cooking #foodie" },
    { authorId: createdUsers[7].id, content: "Gaming session tonight #gaming #pc" },
  ]
  for (const p of hashtagPosts) {
    await db.post.create({ data: { content: p.content, authorId: p.authorId, createdAt: new Date(now - Math.random() * 1000 * 60 * 60 * 12) } })
  }
  console.log("  Created hashtag posts for trending")

  console.log("\nSeeding complete!")
  console.log("\nAdmin credentials:")
  console.log("   Email: Andy0703@gmail.com")
  console.log("   Password: Andy0703-E")
  console.log("\n   (All demo users also use password: Andy0703-E)")
}

main()
  .catch((e) => { console.error("Seed error:", e); process.exit(1) })
  .finally(async () => { await db.$disconnect() })
