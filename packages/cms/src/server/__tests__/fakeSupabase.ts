import { vi } from 'vitest'
import { defineCmsConfig } from '../../core/config'
import type { CmsConfigType } from '../../core/config'
import type { CmsClientType, CmsContextType } from '../context'

type Row = Record<string, unknown>
type Filter = (row: Row) => boolean
type ErrorType = { code: string, message: string }
type Result = { data: unknown, error: ErrorType | null, count?: number | null }

export interface FakeDbType {
  tables: Record<string, Row[]>
  rpc: Record<string, (args: Record<string, unknown>) => Result | Promise<Result>>
  // Runs right before an insert or update is applied, e.g. to slip in someone else's save.
  beforeWrite: ((table: string, op: 'insert' | 'update', values: Row | Row[]) => void) | null
  failNext: { table: string, op: 'select' | 'insert' | 'update' | 'delete', error: ErrorType } | null
  user: { id: string, factors?: unknown[] } | null
  claims: Row
  storageRemoved: string[]
  // Supabase Auth and Admin API calls a test needs, e.g. signInWithPassword or admin.inviteUserByEmail.
  authApi: Record<string, (...args: never[]) => unknown>
  adminApi: Record<string, (...args: never[]) => unknown>
}

const clone = <T>(value: T): T => structuredClone(value)

// JSON columns compare by content, like jsonb `is distinct from`.
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

// Columns and PostgREST JSON paths: `data->>title`, `data->title->>es`.
const read = (row: Row, column: string): unknown => {
  if (!column.includes('->')) return row[column]
  const [path, last] = column.split('->>')
  const value = path.split('->').reduce<unknown>((node, key) => (node as Row | null | undefined)?.[key], row) as Row | null | undefined
  const leaf = value?.[last]
  return leaf === undefined || leaf === null ? null : typeof leaf === 'string' ? leaf : JSON.stringify(leaf)
}

const likeToRegExp = (pattern: string, flags: string) => {
  let source = ''
  for (let index = 0; index < pattern.length; index++) {
    const char = pattern[index]
    if (char === '\\') source += pattern[++index]?.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') ?? ''
    else if (char === '%') source += '.*'
    else if (char === '_') source += '.'
    else source += char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }
  return new RegExp(`^${source}$`, flags)
}

const UNIQUE: Record<string, (a: Row, b: Row) => boolean> = {
  documents: (a, b) => a.type === b.type && a.deleted_at === null && b.deleted_at === null
    && ((a.key !== null && a.key === b.key) || (a.slug !== null && a.slug === b.slug)),
  published_documents: (a, b) => a.type === b.type && ((a.key !== null && a.key === b.key) || (a.slug !== null && a.slug === b.slug))
}

const DEFAULTS: Record<string, (db: FakeDbType) => Row> = {
  documents: db => ({
    id: crypto.randomUUID(), key: null, slug: null, slugs: {}, data: {}, revision: 1, sort_order: 0, visible: true,
    created_at: new Date().toISOString(), created_by: db.user?.id ?? null, updated_at: new Date().toISOString(),
    updated_by: db.user?.id ?? null, deleted_at: null
  }),
  document_versions: db => ({ id: crypto.randomUUID(), created_at: new Date().toISOString(), created_by: db.user?.id ?? null }),
  activity_log: db => ({ id: db.tables.activity_log.length + 1, user_id: db.user?.id ?? null, document_id: null, details: {}, created_at: new Date().toISOString() }),
  media: () => ({ id: crypto.randomUUID(), filename: '', folder: '', alt: {}, caption: {}, deleted_at: null, created_at: new Date().toISOString() }),
  publish_log: db => ({
    id: Math.max(0, ...db.tables.publish_log.map(row => row.id as number)) + 1, requested_by: null, requested_at: new Date().toISOString(),
    documents_count: 0, removed_count: 0, items: [], build_status: 'pending', job_id: null, finished_at: null, error_code: null,
    error_detail: null, retry_of: null
  })
}

const documentStatus = (db: FakeDbType): Row[] => db.tables.documents.map(doc => {
  const live = db.tables.published_documents.find(row => row.id === doc.id)
  const status = !live
    ? (doc.visible && doc.deleted_at === null ? 'new' : 'hidden')
    : doc.deleted_at !== null || !doc.visible
      ? 'unpublishing'
      : !same(doc.data, live.data) || doc.slug !== live.slug || !same(doc.slugs ?? {}, live.slugs ?? {}) || doc.key !== live.key || doc.sort_order !== live.sort_order
        ? 'changed'
        : 'published'
  return {
    ...doc,
    published_at: live?.published_at ?? null,
    published_by: live?.published_by ?? null,
    published_slug: live?.slug ?? null,
    slugs: doc.slugs ?? {},
    published_slugs: live?.slugs ?? null,
    published_paths: live?.paths ?? null,
    status,
    pending: ['new', 'changed', 'unpublishing'].includes(status)
  }
})

class Query implements PromiseLike<Result> {
  private filters: Filter[] = []
  private op: 'select' | 'insert' | 'update' | 'delete' = 'select'
  private values: Row | Row[] | null = null
  private orders: { column: string, ascending: boolean }[] = []
  private window: [number, number] | null = null
  private countMode = false
  private head = false
  private returning = false
  private expected: 'one' | 'maybe' | null = null

  constructor (private db: FakeDbType, private table: string) {}

  select (_columns?: string, options: { count?: string, head?: boolean } = {}) {
    if (this.op !== 'select') this.returning = true
    this.countMode = options.count === 'exact'
    this.head = !!options.head
    return this
  }

  insert (values: Row | Row[]) { this.op = 'insert'; this.values = values; return this }
  update (values: Row) { this.op = 'update'; this.values = values; return this }
  delete () { this.op = 'delete'; return this }

  eq (column: string, value: unknown) { this.filters.push(row => same(read(row, column), value)); return this }
  neq (column: string, value: unknown) { this.filters.push(row => !same(read(row, column), value)); return this }
  is (column: string, value: null) { this.filters.push(row => read(row, column) === value); return this }
  not (column: string, operator: 'is', value: null) { this.filters.push(row => read(row, column) !== value); return this }
  contains (column: string, value: Record<string, unknown>) {
    this.filters.push(row => {
      const current = read(row, column) as Record<string, unknown> | null
      return !!current && Object.entries(value).every(([key, item]) => same(current[key], item))
    })
    return this
  }

  in (column: string, values: unknown[]) { this.filters.push(row => values.some(value => same(read(row, column), value))); return this }
  lt (column: string, value: string) { this.filters.push(row => String(read(row, column)) < value); return this }
  gte (column: string, value: string) { this.filters.push(row => String(read(row, column)) >= value); return this }
  lte (column: string, value: string) { this.filters.push(row => String(read(row, column)) <= value); return this }
  like (column: string, pattern: string) { this.filters.push(row => likeToRegExp(pattern, '').test(String(read(row, column) ?? ''))); return this }
  ilike (column: string, pattern: string) { this.filters.push(row => likeToRegExp(pattern, 'i').test(String(read(row, column) ?? ''))); return this }

  // Only `column.ilike."%value%"` terms, which is all the server layer builds.
  or (expression: string) {
    const terms = [...expression.matchAll(/([\w>-]+)\.ilike\."((?:[^"\\]|\\.)*)"/g)].map(([, column, pattern]) => ({ column, pattern: pattern.replace(/\\"/g, '"') }))
    this.filters.push(row => terms.some(({ column, pattern }) => likeToRegExp(pattern, 'i').test(String(read(row, column) ?? ''))))
    return this
  }

  order (column: string, options: { ascending?: boolean } = {}) { this.orders.push({ column, ascending: options.ascending ?? true }); return this }
  limit (count: number) { this.window = [0, count - 1]; return this }
  range (from: number, to: number) { this.window = [from, to]; return this }
  maybeSingle () { this.expected = 'maybe'; return this }
  single () { this.expected = 'one'; return this }

  then<A = Result, B = never> (resolve?: ((value: Result) => A | PromiseLike<A>) | null, reject?: ((reason: unknown) => B | PromiseLike<B>) | null) {
    return Promise.resolve().then(() => this.run()).then(resolve, reject)
  }

  private rows () {
    if (this.table === 'document_status') return documentStatus(this.db)
    this.db.tables[this.table] ??= []
    return this.db.tables[this.table]
  }

  private matching () {
    return this.rows().filter(row => this.filters.every(filter => filter(row)))
  }

  private finish (rows: Row[], count?: number): Result {
    const data = clone(rows)
    if (this.expected === 'one' && data.length !== 1) return { data: null, error: { code: 'PGRST116', message: 'not one row' } }
    if (this.expected) return { data: data[0] ?? null, error: null }
    return { data: this.head ? null : data, error: null, count: this.countMode ? count ?? rows.length : null }
  }

  private conflict (table: string, row: Row, others: Row[]) {
    const unique = UNIQUE[table]
    return unique ? others.some(other => other !== row && unique(row, other)) : false
  }

  private run (): Result {
    const failure = this.db.failNext
    if (failure && failure.table === this.table && failure.op === this.op) {
      this.db.failNext = null
      return { data: null, error: failure.error }
    }

    if (this.op === 'select') {
      let rows = this.matching()
      for (const { column, ascending } of [...this.orders].reverse()) {
        rows = [...rows].sort((a, b) => {
          const x = read(a, column) as string | number
          const y = read(b, column) as string | number
          return (x < y ? -1 : x > y ? 1 : 0) * (ascending ? 1 : -1)
        })
      }
      const count = rows.length
      if (this.window) rows = rows.slice(this.window[0], this.window[1] + 1)
      return this.finish(rows, count)
    }

    const table = this.rows()

    if (this.op === 'insert') {
      this.db.beforeWrite?.(this.table, 'insert', this.values!)
      const inserted = (Array.isArray(this.values) ? this.values : [this.values!]).map(values => ({ ...DEFAULTS[this.table]?.(this.db), ...clone(values) }))
      for (const row of inserted) {
        if (this.conflict(this.table, row, table)) return { data: null, error: { code: '23505', message: 'duplicate key' } }
      }
      table.push(...inserted)
      return this.returning ? this.finish(inserted) : { data: null, error: null }
    }

    if (this.op === 'update') {
      this.db.beforeWrite?.(this.table, 'update', this.values!)
      const targets = this.matching()
      const next = targets.map(row => {
        const updated = { ...row, ...clone(this.values as Row) }
        if (this.table === 'documents') {
          const changed = !same(updated.data, row.data) || updated.key !== row.key || updated.slug !== row.slug
          updated.revision = (row.revision as number) + (changed ? 1 : 0)
          updated.updated_at = new Date(Date.parse(row.updated_at as string) + 1000).toISOString()
        }
        return updated
      })
      for (const row of next) {
        const others = table.filter(other => !targets.includes(other))
        if (this.conflict(this.table, row, others)) return { data: null, error: { code: '23505', message: 'duplicate key' } }
      }
      targets.forEach((row, index) => Object.assign(row, next[index]))
      return this.returning ? this.finish(next) : { data: null, error: null }
    }

    const removed = this.matching()
    this.db.tables[this.table] = table.filter(row => !removed.includes(row))
    if (this.table === 'documents') {
      const ids = removed.map(row => row.id)
      this.db.tables.published_documents = this.db.tables.published_documents.filter(row => !ids.includes(row.id))
      this.db.tables.document_versions = this.db.tables.document_versions.filter(row => !ids.includes(row.document_id))
    }
    return this.returning ? this.finish(removed) : { data: null, error: null }
  }
}

export const createFakeDb = (seed: Partial<Record<string, Row[]>> = {}): FakeDbType => ({
  tables: {
    documents: [], published_documents: [], document_versions: [], activity_log: [], media: [], profiles: [],
    publish_log: [], redirects: [],
    ...clone(seed) as Record<string, Row[]>
  },
  rpc: {},
  beforeWrite: null,
  failNext: null,
  user: null,
  claims: {},
  storageRemoved: [],
  authApi: {},
  adminApi: {}
})

export const fakeClient = (db: FakeDbType): CmsClientType => ({
  from: (table: string) => new Query(db, table),
  rpc: async (name: string, args: Record<string, unknown>) => {
    const handler = db.rpc[name]
    return handler ? handler(args) : { data: null, error: { code: '42883', message: `no rpc ${name}` } }
  },
  auth: {
    getUser: async () => ({ data: { user: db.user }, error: null }),
    getClaims: async () => ({ data: { claims: db.claims }, error: null }),
    signOut: async () => ({ error: null }),
    ...db.authApi,
    admin: { ...db.adminApi, mfa: { deleteFactor: db.adminApi.deleteFactor } }
  },
  storage: {
    from: () => ({ remove: async (paths: string[]) => { db.storageRemoved.push(...paths); return { data: null, error: null } } })
  }
}) as unknown as CmsClientType

export const signIn = (db: FakeDbType, profile: Partial<Row> & { id: string }) => {
  db.user = { id: profile.id, factors: [] }
  db.claims = { aal: 'aal1' }
  db.tables.profiles = db.tables.profiles.filter(row => row.id !== profile.id)
  db.tables.profiles.push({ name: '', avatar: null, role: 'editor', can_publish: false, active: true, seen_tours: [], ...profile })
}

export const fakeContext = (db: FakeDbType, config: CmsConfigType = defineCmsConfig({ schema: {} })): CmsContextType => ({
  config,
  supabaseUrl: 'http://127.0.0.1:54421',
  db: fakeClient(db),
  admin: () => fakeClient(db),
  anonymous: () => fakeClient(db),
  publishTarget: null,
  revalidate: vi.fn(),
  now: () => new Date()
})
