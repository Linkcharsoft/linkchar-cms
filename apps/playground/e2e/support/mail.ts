import { expect } from '@playwright/test'

// Mailpit, the local Supabase's mailbox (`pnpm db:status` prints MAILPIT_URL).
const MAILPIT = 'http://127.0.0.1:44424'

export interface MailMessageType {
  ID: string
  Subject: string
  Created: string
}

const search = async (address: string): Promise<MailMessageType[]> => {
  const response = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${address}`)}`)
  const { messages } = await response.json() as { messages: MailMessageType[] }
  return [...messages].sort((a, b) => b.Created.localeCompare(a.Created))
}

// The newest email sent to the address, once at least `count` have arrived.
export const emailTo = async (address: string, count = 1) => {
  await expect.poll(async () => (await search(address)).length, { timeout: 15_000 }).toBeGreaterThanOrEqual(count)
  return (await search(address))[0]
}

// The panel's confirm link, moved to the suite's origin: site_url is 127.0.0.1 while the suite's cookies live on baseURL.
export const confirmLink = async (message: MailMessageType, baseURL: string) => {
  const response = await fetch(`${MAILPIT}/api/v1/message/${message.ID}`)
  const { HTML } = await response.json() as { HTML: string }
  const href = HTML.match(/href="([^"]*\/auth\/confirm[^"]*)"/)?.[1]?.replaceAll('&amp;', '&')
  if (!href) throw new Error(`No confirm link in "${message.Subject}"`)
  const link = new URL(href)
  return new URL(link.pathname + link.search, baseURL).toString()
}
