import 'dotenv/config';
import type * as Type from './types';
import { eq, inArray, sql } from 'drizzle-orm';
import * as table from './schema';
{{drizzleImport}}


const db = drizzle(process.env.DB_FILE_NAME!);

class DBTable<T extends Record<string, any>> {
    table: any;

    constructor(table: any) {
        this.table = table;
    }

    async get(filters: Partial<T> = {}, options?: { limit?: number; offset?: number }): Promise<T[]> {
        let query = db.select().from(this.table);

        // Apply filters
        const conditions = Object.entries(filters)
            .filter(([_, value]) => value !== undefined)
            .map(([key, value]) => {
                // Support array filters for "IN" queries
                if (Array.isArray(value)) {
                    // Guard against empty arrays which would generate IN () SQL
                    if ((value as any[]).length === 0) {
                        return sql`1=0`;
                    }
                    return inArray(this.table[key], value as any[]);
                }
                return eq(this.table[key], value as any);
            });

        if (conditions.length > 0) {
            query = query.where(conditions.length === 1 ? conditions[0] : conditions.reduce((a, b) => a && b)) as any;
        }

        if (options?.limit) query = query.limit(options.limit) as any;
        if (options?.offset) query = query.offset(options.offset) as any;

        const rows = await query;

        // Parse JSON fields for curriculums and modules
        return rows.map(row => this.parseJsonFields(row as T));
    }

    async getMulti<K extends keyof T>(filter: K, arr: T[K][]): Promise<T[]> {
        if (arr.length === 0) return [];

        const rows = await db.select()
            .from(this.table)
            .where(inArray(this.table[filter as string], arr));

        return rows.map(row => this.parseJsonFields(row as T));
    }

    async getOne(filters: Partial<T> = {}): Promise<T | null> {
        const conditions = Object.entries(filters)
            .filter(([_, value]) => value !== undefined)
            .map(([key, value]) => eq(this.table[key], value));

        if (conditions.length === 0) return null;

        const rows = await db.select()
            .from(this.table)
            .where(conditions.length === 1 ? conditions[0] : conditions.reduce((a, b) => a && b))
            .limit(1);

        return rows.length > 0 ? this.parseJsonFields(rows[0] as T) : null;
    }

    async create(item: T): Promise<T> {
        const prepared = this.prepareJsonFields(item);
        const rows = await db.insert(this.table).values(prepared).returning() as [T];
        return this.parseJsonFields(rows[0] as T);
    }

    async update(id: string, updates: Partial<T>): Promise<T | null> {
        const prepared = this.prepareJsonFields(updates);
        const setObj: Partial<T> = { ...prepared };
        // Only add updatedAt if this table defines that column
        if ('updatedAt' in this.table) {
            (setObj as any).updatedAt = new Date();
        }

        const rows = await db.update(this.table)
            .set(setObj)
            .where(eq(this.table.id, id))
            .returning() as T[];

        return rows.length > 0 ? this.parseJsonFields(rows[0] as T) : null;
    }

    async updateWhere(filters: Partial<T>, updates: Partial<T>): Promise<T | null> {
        const prepared = this.prepareJsonFields(updates);

        const conditions = Object.entries(filters)
            .filter(([_, value]) => value !== undefined)
            .map(([key, value]) => eq(this.table[key], value));

        if (conditions.length === 0) return null;

        const setObj: Partial<T> = { ...prepared };
        if ('updatedAt' in this.table) {
            (setObj as any).updatedAt = new Date();
        }

        const rows = await db.update(this.table)
            .set(setObj)
            .where(conditions.length === 1 ? conditions[0] : conditions.reduce((a, b) => a && b))
            .returning() as T[];

        return rows.length > 0 ? this.parseJsonFields(rows[0] as T) : null;
    }

    async delete(id: string): Promise<boolean> {
        const result = await db.delete(this.table)
            .where(eq(this.table.id, id)) as any;

        return result.rowCount ? result.rowCount > 0 : false;
    }

    async deleteWhere(filters: Partial<T>): Promise<boolean> {
        const conditions = Object.entries(filters)
            .filter(([_, value]) => value !== undefined)
            .map(([key, value]) => eq(this.table[key], value));

        if (conditions.length === 0) return false;

        const result = await db.delete(this.table)
            .where(conditions.length === 1 ? conditions[0] : conditions.reduce((a, b) => a && b)) as any;

        return result.rowCount ? result.rowCount > 0 : false;
    }

    private parseJsonFields(row: T): T {
        const parsed = { ...row };

        // Parse courses field for curriculums
        if ('courses' in parsed && typeof parsed.courses === 'string') {
            (parsed as any).courses = JSON.parse(parsed.courses as string);
        }

        // Parse content field for modules
        if ('content' in parsed && typeof parsed.content === 'string') {
            (parsed as any).content = JSON.parse(parsed.content as string);
        }

        return parsed;
    }

    private prepareJsonFields(item: Partial<T>): Partial<T> {
        const prepared = { ...item };

        // Stringify courses field for curriculums
        if ('courses' in prepared && Array.isArray(prepared.courses)) {
            (prepared as any).courses = JSON.stringify(prepared.courses);
        }

        // Stringify content field for modules
        if ('content' in prepared && prepared.content !== null && prepared.content !== undefined) {
            (prepared as any).content = JSON.stringify(prepared.content);
        }

        return prepared;
    }
}

// Database class
class DB {
    users: DBTable<Type.User>;

    constructor() {
        this.users = new DBTable<Type.User>(table.usersTable);
    }
}

const dbInstance = new DB();
export { db as _db, dbInstance as db };