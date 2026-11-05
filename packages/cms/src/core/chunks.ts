// supabase-js sends in() as the query string of a GET; past ~8 KB of URL the gateway answers 414 URI too long
// and the rows read as empty. 100 UUIDs are about 3.7 KB.
export const IN_CHUNK = 100

export interface ChunkResultType<T> {
  data: T[] | null
  error: { message: string } | null
}

// `query(chunk)` for every slice of `ids`, the rows concatenated; the first error ends it, like one failed query would.
export const inChunks = async <T>(ids: readonly string[], query: (chunk: string[]) => PromiseLike<ChunkResultType<T>>, size = IN_CHUNK): Promise<ChunkResultType<T>> => {
  const rows: T[] = []
  for (let from = 0; from < ids.length; from += size) {
    const { data, error } = await query(ids.slice(from, from + size))
    if (error) return { data: null, error }
    rows.push(...(data ?? []))
  }
  return { data: rows, error: null }
}
