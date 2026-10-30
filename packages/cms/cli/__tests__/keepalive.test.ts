import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import { KEEPALIVE_FILE, KEEPALIVE_MARKER, keepaliveProblems, keepaliveWorkflow, syncKeepalive } from '../keepalive.js'

let root: string

beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cms-keepalive-')) })
afterEach(() => rm(root, { recursive: true, force: true }))

const put = async (text: string) => {
  await mkdir(dirname(join(root, KEEPALIVE_FILE)), { recursive: true })
  await writeFile(join(root, KEEPALIVE_FILE), text)
}

describe('syncKeepalive', () => {
  it('writes the workflow where none exists, with the marker and the repository variables', async () => {
    expect(await syncKeepalive({ root })).toEqual({ file: KEEPALIVE_FILE, status: 'added', problems: [] })
    const text = await readFile(join(root, KEEPALIVE_FILE), 'utf8')
    expect(text.startsWith(KEEPALIVE_MARKER)).toBe(true)
    expect(text).toContain('cron: \'17 9 */3 * *\'')
    expect(text).toContain('${{ vars.SUPABASE_URL }}/rest/v1/published_documents?select=id&limit=1')
    expect(text).toContain('apikey: ${{ vars.SUPABASE_PUBLISHABLE_KEY }}')
    expect(text).toContain('curl -fsS')
    expect(text).toContain('\npermissions: {}\n')
    expect(text).toContain('    timeout-minutes: 5\n')
    expect(await syncKeepalive({ root })).toEqual({ file: KEEPALIVE_FILE, status: 'same', problems: [] })
  })

  it('is YAML GitHub loads: the headers with ": " inside sit in a folded scalar', () => {
    const doc = parse(keepaliveWorkflow()) as { on: { schedule: unknown[], workflow_dispatch: null }, permissions: object, jobs: { ping: { 'timeout-minutes': number, steps: { run: string }[] } } }
    expect(doc.on.schedule).toEqual([{ cron: '17 9 */3 * *' }])
    expect(doc.on).toHaveProperty('workflow_dispatch')
    expect(doc.permissions).toEqual({})
    expect(doc.jobs.ping['timeout-minutes']).toBe(5)
    expect(doc.jobs.ping.steps[0].run).toBe('curl -fsS "${{ vars.SUPABASE_URL }}/rest/v1/published_documents?select=id&limit=1" -H "apikey: ${{ vars.SUPABASE_PUBLISHABLE_KEY }}" -H "Authorization: Bearer ${{ vars.SUPABASE_PUBLISHABLE_KEY }}"')
    expect(keepaliveProblems(keepaliveWorkflow())).toEqual([])
  })

  it('names what keeps a workflow from running', () => {
    expect(keepaliveProblems('on:\n  schedule:\n    - cron: "0 0 * * *"\njobs:\n  ping:\n    steps:\n      - run: curl -H "apikey: x" https://db\n')[0]).toMatch(/^not valid YAML/)
    expect(keepaliveProblems('name: mine\njobs: {}\n')).toEqual(['no schedule (on.schedule)', 'no manual run (on.workflow_dispatch)', 'no job with steps'])
    expect(keepaliveProblems('on:\n  schedule:\n    - cron: "0 0 * * *"\n  workflow_dispatch:\njobs:\n  ping:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo ok\n')).toEqual([])
    expect(keepaliveProblems('just text')).toEqual(['not a workflow'])
  })

  it('rewrites a workflow the package wrote and keeps one the project wrote', async () => {
    await put(`${KEEPALIVE_MARKER}\nname: old\n`)
    expect(await syncKeepalive({ root })).toEqual({ file: KEEPALIVE_FILE, status: 'updated', problems: [] })
    expect(await readFile(join(root, KEEPALIVE_FILE), 'utf8')).toBe(keepaliveWorkflow())
    await put('name: mine\n')
    expect(await syncKeepalive({ root })).toEqual({ file: KEEPALIVE_FILE, status: 'kept', problems: ['no schedule (on.schedule)', 'no manual run (on.workflow_dispatch)', 'no job with steps'] })
    expect(await readFile(join(root, KEEPALIVE_FILE), 'utf8')).toBe('name: mine\n')
  })

  it('reports without writing when asked to check', async () => {
    expect(await syncKeepalive({ root, write: false })).toEqual({ file: KEEPALIVE_FILE, status: 'added', problems: [] })
    expect(existsSync(join(root, KEEPALIVE_FILE))).toBe(false)
  })
})
