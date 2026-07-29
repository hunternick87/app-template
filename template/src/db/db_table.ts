import { and, eq, inArray, sql } from 'drizzle-orm'
import type { LibSQLDatabase } from 'drizzle-orm/libsql'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

type AnyDatabase = LibSQLDatabase<any> | NodePgDatabase<any>
type DrizzleTable = {
  $inferSelect: Record<string, unknown>
  $inferInsert: Record<string, unknown>
}
type InferSelect<T extends DrizzleTable> = T['$inferSelect']
type InferInsert<T extends DrizzleTable> = T['$inferInsert']
type TableId<T extends DrizzleTable> = InferSelect<T> extends { id: infer Id } ? Id : never

function buildWhere<T extends DrizzleTable>(table: T, filters: Partial<InferSelect<T>>) {
  const conditions = Object.entries(filters)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => {
      const column = (table as any)[key]
      if (Array.isArray(value)) return value.length === 0 ? sql`1=0` : inArray(column, value)
      return eq(column, value)
    })

  return conditions.length === 0 ? undefined : conditions.length === 1 ? conditions[0] : and(...conditions)
}

/** A small typed CRUD layer over a Drizzle table. */
export class DBTable<T extends DrizzleTable> {
  constructor(
    private readonly db: AnyDatabase,
    private readonly table: T,
  ) {}

  async get(filters: Partial<InferSelect<T>> = {}, options?: { limit?: number; offset?: number }): Promise<InferSelect<T>[]> {
    let query = (this.db as any).select().from(this.table as any)
    const where = buildWhere(this.table, filters)
    if (where) query = query.where(where)
    if (options?.limit !== undefined) query = query.limit(options.limit)
    if (options?.offset !== undefined) query = query.offset(options.offset)
    return query
  }

  async getOne(filters: Partial<InferSelect<T>> = {}): Promise<InferSelect<T> | null> {
    const where = buildWhere(this.table, filters)
    if (!where) return null
    const rows = await (this.db as any).select().from(this.table as any).where(where).limit(1)
    return rows[0] ?? null
  }

  async getMulti<K extends keyof InferSelect<T>>(column: K, values: InferSelect<T>[K][]): Promise<InferSelect<T>[]> {
    if (values.length === 0) return []
    return (this.db as any).select().from(this.table as any).where(inArray((this.table as any)[column], values))
  }

  async create(item: InferInsert<T>): Promise<InferSelect<T>> {
    const rows = await (this.db as any).insert(this.table as any).values(item).returning()
    return rows[0]
  }

  async update(id: TableId<T>, updates: Partial<InferInsert<T>>): Promise<InferSelect<T> | null> {
    const rows = await (this.db as any).update(this.table as any)
      .set(this.withUpdatedAt(updates))
      .where(eq((this.table as any).id, id))
      .returning()
    return rows[0] ?? null
  }

  async updateWhere(filters: Partial<InferSelect<T>>, updates: Partial<InferInsert<T>>): Promise<InferSelect<T> | null> {
    const where = buildWhere(this.table, filters)
    if (!where) return null
    const rows = await (this.db as any).update(this.table as any).set(this.withUpdatedAt(updates)).where(where).returning()
    return rows[0] ?? null
  }

  async delete(id: TableId<T>): Promise<boolean> {
    const result = await (this.db as any).delete(this.table as any).where(eq((this.table as any).id, id))
    return (result.rowCount ?? result.rowsAffected ?? 0) > 0
  }

  async deleteWhere(filters: Partial<InferSelect<T>>): Promise<boolean> {
    const where = buildWhere(this.table, filters)
    if (!where) return false
    const result = await (this.db as any).delete(this.table as any).where(where)
    return (result.rowCount ?? result.rowsAffected ?? 0) > 0
  }

  async exists(filters: Partial<InferSelect<T>>): Promise<boolean> {
    const where = buildWhere(this.table, filters)
    if (!where) return false
    const rows = await (this.db as any).select({ value: sql`1` }).from(this.table as any).where(where).limit(1)
    return rows.length > 0
  }

  private withUpdatedAt(data: Partial<InferInsert<T>>) {
    return 'updatedAt' in (this.table as any)
      ? { ...data, updatedAt: new Date().toISOString() }
      : data
  }
}

export default DBTable
