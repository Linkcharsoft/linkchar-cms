import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { KEEPALIVE_FILE, KEEPALIVE_MARKER, keepaliveWorkflow, syncKeepalive } from '../keepalive.js'

let root: string

beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cms-keepalive-')) })
afterEach(() => rm(root, { recursive: true, force: true }))

const put = async (text: string) => {
  await mkdir(dirname(join(root, KEEPALIVE_FILE)), { recursive: true })
  await writeFile(join(root, KEEPALIVE_FILE), text)
}

describe('syncKeepalive', () => {
  it('writes the workflow where none exists, with the marker and the repository variables', async () => {
    expect(await syncKeepalive({ root })).toEqual({ file: KEEPALIVE_FILE, status: 'added' })
    const text = await readFile(join(root, KEEPALIVE_FILE), 'utf8')
    expect(text.startsWith(KEEPALIVE_MARKER)).toBe(true)
    expect(text).toContain('cron: \'17 9 */3 * *\'')
    expect(text).toContain('${{ vars.SUPABASE_URL }}/rest/v1/published_documents?select=id&limit=1')
    expect(text).toContain('apikey: ${{ vars.SUPABASE_PUBLISHABLE_KEY }}')
    expect(text).toContain('curl -fsS')
    expect(await syncKeepalive({ root })).toEqual({ file: KEEPALIVE_FILE, status: 'same' })
  })

  it('rewrites a workflow the package wrote and keeps one the project wrote', async () => {
    await put(`${KEEPALIVE_MARKER}\nname: old\n`)
    expect(await syncKeepalive({ root })).toEqual({ file: KEEPALIVE_FILE, status: 'updated' })
    expect(await readFile(join(root, KEEPALIVE_FILE), 'utf8')).toBe(keepaliveWorkflow())
    await put('name: mine\n')
    expect(await syncKeepalive({ root })).toEqual({ file: KEEPALIVE_FILE, status: 'kept' })
    expect(await readFile(join(root, KEEPALIVE_FILE), 'utf8')).toBe('name: mine\n')
  })

  it('reports without writing when asked to check', async () => {
    expect(await syncKeepalive({ root, write: false })).toEqual({ file: KEEPALIVE_FILE, status: 'added' })
    expect(existsSync(join(root, KEEPALIVE_FILE))).toBe(false)
  })
})
