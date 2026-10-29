import en from 'primelocale/en.json'
import es from 'primelocale/es.json'
import { addLocale, locale } from 'primereact/api'

const LOCALES: Record<string, object> = { es: es.es, en: en.en }

// Registered at import time, on the server too: Calendar reads its labels while rendering, so a lazy load breaks SSR.
for (const [locale, values] of Object.entries(LOCALES)) addLocale(locale, values)

// PrimeReact's own labels (calendar, empty lists, password strength) for the panel language.
export const primeLocale = (panelLocale: string) => {
  const language = panelLocale.split('-')[0]
  const known = language in LOCALES ? language : 'en'
  // The provider applies it in an effect, after hydration compared a dropdown's "clear" label with the server's.
  locale(known)
  return known
}
