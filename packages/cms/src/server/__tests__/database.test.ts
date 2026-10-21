import { describe, expectTypeOf, it } from 'vitest'
import type { ProjectDatabaseOf } from '../context'
import type { Database } from '../database'

type ProjectDatabaseType = Database & {
  public: Database['public'] & {
    Tables: Database['public']['Tables'] & {
      applications: { Row: { id: string, status: string }, Insert: { status?: string }, Update: { status?: string }, Relationships: [] }
    }
  }
}

describe('ProjectDatabaseOf', () => {
  it('takes the database the project registers, with its own tables', () => {
    expectTypeOf<ProjectDatabaseOf<{ database: ProjectDatabaseType }>['public']['Tables']['applications']['Row']>().toEqualTypeOf<{ id: string, status: string }>()
  })

  it('falls back to the package tables', () => {
    expectTypeOf<ProjectDatabaseOf<object>>().toEqualTypeOf<Database>()
  })
})
