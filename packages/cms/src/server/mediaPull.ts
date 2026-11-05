import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, rename, rm, rmdir, stat, writeFile } from 'node:fs/promises'
import { dirname, join, relative, sep } from 'node:path'
import { withDefaults } from '../core/defaults'
import { getEntry } from '../core/entries'
import { isImageMime, LOCAL_MEDIA_FOLDER, mediaPublicUrl } from '../core/media'
import { documentReferences } from '../core/references'
import type { CmsClientType } from './context'
import type { CmsConfigType } from '../core/config'
import type { Dirent } from 'node:fs'

export interface PulledMediaRowType {
  id: string
  path: string
  mime: string
  size: number
  hash: string | null
}

export interface MediaPullPlanType {
  download: PulledMediaRowType[]
  reuse: PulledMediaRowType[]
  remove: string[]
}

export interface MediaPullSummaryType {
  downloaded: number
  reused: number
  removed: number
  // Paths Storage did not give; the build goes on without them (the site falls back to their Storage URL).
  failed: string[]
  downloadedBytes: number
  totalBytes: number
}

const ID_CHUNK = 100

const rowsById = async (db: CmsClientType, ids: string[]) => {
  const rows: { id: string, path: string, mime: string, size: number, hash: string | null, poster_id: string | null }[] = []
  for (let from = 0; from < ids.length; from += ID_CHUNK) {
    const { data, error } = await db.from('media').select('id, path, mime, size, hash, poster_id').in('id', ids.slice(from, from + ID_CHUNK)).is('deleted_at', null)
    if (error) throw new Error(`[@linkcharsoft/cms] Could not read media: ${error.message}`)
    rows.push(...(data ?? []))
  }
  return rows
}

// The files of the published content, posters included: the same references the site readers resolve, read with the publishable key.
export const publishedMedia = async (config: CmsConfigType, db: CmsClientType): Promise<PulledMediaRowType[]> => {
  const { data, error } = await db.from('published_documents').select('id, type, data')
  if (error) throw new Error(`[@linkcharsoft/cms] Could not read published_documents: ${error.message}`)
  const ids = new Set<string>()
  for (const row of data ?? []) {
    const entry = getEntry(config, row.type)
    if (!entry) continue
    for (const id of documentReferences(config, entry.fields, withDefaults(config, entry.fields, row.data)).media) ids.add(id)
  }
  const media = await rowsById(db, [...ids])
  const posterIds = [...new Set(media.flatMap(row => (row.poster_id && !ids.has(row.poster_id) ? [row.poster_id] : [])))]
  return [...media, ...await rowsById(db, posterIds)].map(({ id, path, mime, size, hash }) => ({ id, path, mime, size, hash }))
}

export type LocalHashType = (path: string) => Promise<string | null>

// A path is unique per upload and never rewritten, so a local file of the same path and size is the same file. The hash is
// of the file as picked: images are recompressed in the browser before upload, so only PDFs and videos can be checked by it.
export const planMediaPull = async (rows: PulledMediaRowType[], local: ReadonlyMap<string, number>, hashOf: LocalHashType): Promise<MediaPullPlanType> => {
  const download: PulledMediaRowType[] = []
  const reuse: PulledMediaRowType[] = []
  for (const row of rows) {
    const same = local.get(row.path) === row.size && (isImageMime(row.mime) || !row.hash || await hashOf(row.path) === row.hash)
    ;(same ? reuse : download).push(row)
  }
  const wanted = new Set(rows.map(row => row.path))
  return { download, reuse, remove: [...local.keys()].filter(path => !wanted.has(path)).sort() }
}

const listFiles = async (dir: string, root = dir): Promise<Map<string, number>> => {
  const found = new Map<string, number>()
  let entries: Dirent[]
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return found
  }
  for (const entry of entries) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      for (const [inner, size] of await listFiles(path, root)) found.set(inner, size)
    } else if (entry.isFile()) {
      found.set(relative(root, path).split(sep).join('/'), (await stat(path)).size)
    }
  }
  return found
}

const sha256 = async (file: string) => {
  try {
    return createHash('sha256').update(await readFile(file)).digest('hex')
  } catch {
    return null
  }
}

// Removes the folders the removed files leave empty, up to (not including) `root`.
const pruneEmptyDirs = async (root: string, removed: string[]) => {
  const dirs = [...new Set(removed.map(path => dirname(join(root, path))))].sort((a, b) => b.length - a.length)
  for (let dir of dirs) {
    while (dir !== root && dir.startsWith(root)) {
      try {
        await rmdir(dir)
      } catch {
        break
      }
      dir = dirname(dir)
    }
  }
}

export interface MediaPullOptionsType {
  config: CmsConfigType
  db: CmsClientType
  supabaseUrl: string
  // The project's root: files go to <root>/public/cms-media.
  root: string
  fetch?: typeof fetch
  // Each file Storage refused, as it happens.
  warn?: (message: string) => void
}

// Copies the published files into public/cms-media, keeping the ones already there and dropping the ones no longer used.
export const runMediaPull = async ({ config, db, supabaseUrl, root, fetch: get = fetch, warn = () => {} }: MediaPullOptionsType): Promise<MediaPullSummaryType> => {
  const dir = join(root, 'public', LOCAL_MEDIA_FOLDER)
  const rows = await publishedMedia(config, db)
  const local = await listFiles(dir)
  const plan = await planMediaPull(rows, local, path => sha256(join(dir, path)))

  const failed: string[] = []
  let downloadedBytes = 0
  for (const row of plan.download) {
    const target = join(dir, row.path)
    try {
      const response = await get(mediaPublicUrl(supabaseUrl, row.path))
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const bytes = Buffer.from(await response.arrayBuffer())
      await mkdir(dirname(target), { recursive: true })
      await writeFile(`${target}.part`, bytes)
      await rename(`${target}.part`, target)
      downloadedBytes += bytes.byteLength
    } catch (error) {
      failed.push(row.path)
      await rm(`${target}.part`, { force: true })
      warn(`Could not download ${row.path} (${error instanceof Error ? error.message : String(error)}); the site serves it from Storage.`)
    }
  }
  for (const path of plan.remove) await rm(join(dir, path), { force: true })
  await pruneEmptyDirs(dir, plan.remove)

  return {
    downloaded: plan.download.length - failed.length,
    reused: plan.reuse.length,
    removed: plan.remove.length,
    failed,
    downloadedBytes,
    totalBytes: rows.reduce((sum, row) => sum + row.size, 0)
  }
}
