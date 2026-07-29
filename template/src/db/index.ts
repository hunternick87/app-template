import 'dotenv/config'
import * as table from './schema'
import { DBTable } from './db_table'

{{drizzleSetup}}

class DB {
  users = new DBTable(db, table.usersTable)
}

const dbInstance = new DB()
export { db as _db, dbInstance as db }
export default dbInstance
