import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { Toaster as Sonner } from "@/components/ui/sonner"
import { ThemeProvider } from "@/components/theme-provider"
import { SessionProvider } from "@/components/session-provider"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Connecta — Terhubung, Berbagi, Berkembang",
  description:
    "Connecta adalah platform jejaring sosial yang aman, cepat, dan intuitif untuk mempererat hubungan personal dan profesional. Bagikan momen, terhubung dengan teman, dan jelajahi dunia.",
  keywords: [
    "Connecta",
    "jejaring sosial",
    "social media",
    "teman",
    "berbagi",
    "chat",
    "Indonesia",
  ],
  authors: [{ name: "Connecta Team" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Connecta — Terhubung, Berbagi, Berkembang",
    description:
      "Platform jejaring sosial yang aman, cepat, dan intuitif untuk mempererat hubungan personal dan profesional.",
    siteName: "Connecta",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Connecta",
    description: "Platform jejaring sosial modern untuk semua.",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SessionProvider>{children}</SessionProvider>
          <Toaster />
          <Sonner />
        </ThemeProvider>
      </body>
    </html>
  )
}
