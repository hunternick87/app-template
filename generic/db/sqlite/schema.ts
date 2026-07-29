import { sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const usersTable = sqliteTable('users', {
  id: text().primaryKey(),
  name: text().notNull(),
})
