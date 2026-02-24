import fs from 'fs';
import path from 'path';
import { spawn } from "node:child_process";
import { safeWriteFile } from '../utls.js';

export async function drizzle(targetDir, dbType) {
    const drizzleConfigPath = path.join(targetDir, 'drizzle.config.ts');
    const dbIndexPath = path.join(targetDir, 'src', 'db', 'index.ts');
    let drizzleConfigJson = fs.readFileSync(drizzleConfigPath, 'utf8');
    let dbIndexJson = fs.readFileSync(dbIndexPath, 'utf8');

    if (dbType === 'sqlite') {
        dbIndexJson = dbIndexJson.replace('{{drizzleImport}}', "import { drizzle } from 'drizzle-orm/bun-sqlite';");
        drizzleConfigJson = drizzleConfigJson.replace('{{drizzleDialect}}', "sqlite");

        safeWriteFile(targetDir + '/src/db/schema.ts', `import { sqliteTable, text } from "drizzle-orm/sqlite-core";\n\nexport const usersTable = sqliteTable("users", {\nid: text().primaryKey(),\nname: text().notNull(),\n});`);

        await new Promise((resolve, reject) => {
            const install = spawn('bun', ['install', '@libsql/client'], { cwd: targetDir, stdio: 'pipe' });
            install.on('close', (code) => code === 0 ? resolve() : reject());
        });
    }  else if (dbType === 'postgresql') {
        // PostgreSQL specific setup if needed
        dbIndexJson = dbIndexJson.replace('{{drizzleImport}}', "import { drizzle } from 'drizzle-orm/node-postgres';");
        drizzleConfigJson = drizzleConfigJson.replace('{{drizzleDialect}}', "postgresql");

        await new Promise((resolve, reject) => {
            const install = spawn('bun', ['install', '-d', '@types/pg', 'tsx'], { cwd: targetDir, stdio: 'pipe' });
            install.on('close', (code) => code === 0 ? resolve() : reject());
        });

        await new Promise((resolve, reject) => {
            const install = spawn('bun', ['install', 'pg'], { cwd: targetDir, stdio: 'pipe' });
            install.on('close', (code) => code === 0 ? resolve() : reject());
        });

        safeWriteFile(targetDir + '/src/db/schema.ts', `import { integer, pgTable, varchar } from "drizzle-orm/pg-core";\n\nexport const usersTable = pgTable("users", {\nid: integer().primaryKey().generatedAlwaysAsIdentity(),\nname: varchar({ length: 255 }).notNull(),\nemail: varchar({ length: 255 }).notNull().unique(),\n});`);
    }

    fs.writeFileSync(drizzleConfigPath, drizzleConfigJson);
    fs.writeFileSync(dbIndexPath, dbIndexJson);
}
