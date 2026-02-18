import "dotenv/config"
import { readdir, readFile } from "node:fs/promises"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import mysql from "mysql2/promise"
import type { Pool, PoolConnection, RowDataPacket } from "mysql2/promise"

const __dirname = dirname(fileURLToPath(import.meta.url))
const MIGRATIONS_DIR = join(__dirname, "..", "..", "data", "migrations")

const splitStatements = (sql: string) => {
  const cleaned = sql
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")

  return cleaned
    .split(/;\s*\n/g)
    .map((s) => s.trim())
    .filter(Boolean)
}

type MigrationRow = RowDataPacket & { name: string }

async function main() {
  const host = process.env.MARIADB_HOST ?? "127.0.0.1"
  const port = Number(process.env.MARIADB_PORT ?? "3308")
  const user = process.env.MARIADB_USER ?? ""
  const password = process.env.MARIADB_PASSWORD ?? ""
  const database = process.env.MARIADB_DATABASE ?? ""

  const pool: Pool = mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    namedPlaceholders: true,
    dateStrings: true,
  })

  const conn: PoolConnection = await pool.getConnection()

  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS SchemaMigrations (
        name varchar(255) NOT NULL,
        runAt timestamp NOT NULL DEFAULT current_timestamp(),
        PRIMARY KEY (name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci
    `)

    const files = (await readdir(MIGRATIONS_DIR))
      .filter((f) => f.endsWith(".sql"))
      .sort((a, b) => a.localeCompare(b))

    const [rows] = await conn.query<MigrationRow[]>("SELECT name FROM SchemaMigrations")
    const done = new Set<string>(rows.map((r) => String(r.name)))

    for (const file of files) {
      if (done.has(file)) continue

      const full = join(MIGRATIONS_DIR, file)
      const sql = await readFile(full, "utf8")
      const statements = splitStatements(sql)

      await conn.beginTransaction()
      for (const stmt of statements) {
        await conn.query(stmt)
      }
      await conn.query("INSERT INTO SchemaMigrations (name) VALUES (?)", [file])
      await conn.commit()

      console.log(`applied ${file}`)
    }

    console.log("migrations ok")
  } catch (e) {
    try {
      await conn.rollback()
    } catch {
      void 0
    }
    console.error(e)
    process.exitCode = 1
  } finally {
    try {
      conn.release()
    } catch {
      void 0
    }
    try {
      await pool.end()
    } catch {
      void 0
    }
  }
}

main()
