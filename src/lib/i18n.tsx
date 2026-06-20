"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import id from "@/i18n/id.json"
import en from "@/i18n/en.json"

type Locale = "id" | "en"

const dictionaries = { id, en } as const

interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

function getNestedValue(obj: Record<string, any>, path: string): string {
  const result = path.split(".").reduce<any>((acc, part) => acc?.[part], obj)
  return typeof result === "string" ? result : path
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("connecta-locale") as Locale) || "id"
    }
    return "id"
  })

  const handleSetLocale = useCallback((newLocale: Locale) => {
    setLocale(newLocale)
    localStorage.setItem("connecta-locale", newLocale)
  }, [])

  const t = useCallback(
    (key: string): string => {
      return getNestedValue(dictionaries[locale], key)
    },
    [locale]
  )

  return (
    <I18nContext.Provider value={{ locale, setLocale: handleSetLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useTranslations() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error("useTranslations must be used within I18nProvider")
  return ctx
}

export type { Locale }
