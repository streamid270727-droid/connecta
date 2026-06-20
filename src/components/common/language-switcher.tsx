"use client"

import { useTranslations, type Locale } from "@/lib/i18n"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const languages: { locale: Locale; label: string; flag: string }[] = [
  { locale: "id", label: "Bahasa Indonesia", flag: "🇮🇩" },
  { locale: "en", label: "English", flag: "🇺🇸" },
]

export function LanguageSwitcher() {
  const { locale, setLocale } = useTranslations()

  return (
    <div className="flex gap-2">
      {languages.map((lang) => (
        <Button
          key={lang.locale}
          variant={locale === lang.locale ? "default" : "outline"}
          size="sm"
          onClick={() => setLocale(lang.locale)}
          className={cn("gap-2", locale === lang.locale && "pointer-events-none")}
        >
          <span>{lang.flag}</span>
          <span>{lang.label}</span>
        </Button>
      ))}
    </div>
  )
}
