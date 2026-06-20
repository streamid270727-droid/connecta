import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { Toaster as Sonner } from "@/components/ui/sonner"
import { ThemeProvider } from "@/components/theme-provider"
import { SessionProvider } from "@/components/session-provider"
import { QueryProvider } from "@/components/query-provider"
import { I18nProvider } from "@/lib/i18n"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: {
    default: "Connecta — Terhubung, Berbagi, Berkembang",
    template: "%s | Connecta",
  },
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
  creator: "Connecta",
  metadataBase: new URL("https://connecta.app"),
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "192x192", type: "image/png" },
      { url: "/favicon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/favicon.png",
  },
  openGraph: {
    title: "Connecta — Terhubung, Berbagi, Berkembang",
    description:
      "Platform jejaring sosial yang aman, cepat, dan intuitif untuk mempererat hubungan personal dan profesional.",
    siteName: "Connecta",
    locale: "id_ID",
    type: "website",
    url: "https://connecta.app",
  },
  twitter: {
    card: "summary_large_image",
    title: "Connecta",
    description: "Platform jejaring sosial modern untuk semua.",
    creator: "@connecta",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  manifest: "/manifest.json",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-background text-foreground antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SessionProvider>
            <I18nProvider>
              <QueryProvider>{children}</QueryProvider>
            </I18nProvider>
          </SessionProvider>
          <Toaster />
          <Sonner />
        </ThemeProvider>
      </body>
    </html>
  )
}
