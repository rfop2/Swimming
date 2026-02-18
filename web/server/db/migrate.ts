import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"
import { getPool, type Pool, type PoolConnection } from "lib"
import type { RowDataPacket } from "mysql2/promise"
import "dotenv/config"

const MIGRATIONS_DIR = join( process.cwd(), "server", "db", "migrations" )

const splitStatements = ( sql: string ) => {
  const cleaned = sql
    .replace( /\r\n/g, "\n" )
    .split( "\n" )
    .filter( ( line ) => !line.trim().startsWith( "--" ) )
    .join( "\n" )

  return cleaned
    .split( /;\s*\n/g )
    .map( ( s ) => s.trim() )
    .filter( Boolean )
}

type MigrationRow = RowDataPacket & { name: string }

async function main() {
  const pool: Pool = await getPool()
  const conn: PoolConnection = await pool.getConnection()

  try {
    await conn.query( `
      CREATE TABLE IF NOT EXISTS SchemaMigrations (
        name varchar(255) NOT NULL,
        runAt timestamp NOT NULL DEFAULT current_timestamp(),
        PRIMARY KEY (name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci
    ` )

    const files = ( await readdir( MIGRATIONS_DIR ) )
      .filter( ( f ) => f.endsWith( ".sql" ) )
      .sort( ( a, b ) => a.localeCompare( b ) )

    const [ rows ] = await conn.query<MigrationRow[]>( "SELECT name FROM SchemaMigrations" )
    const done = new Set<string>( rows.map( ( r ) => String( r.name ) ) )

    for ( const file of files ) {
      if ( done.has( file ) ) continue

      const full = join( MIGRATIONS_DIR, file )
      const sql = await readFile( full, "utf8" )
      const statements = splitStatements( sql )

      await conn.beginTransaction()
      for ( const stmt of statements ) {
        await conn.query( stmt )
      }
      await conn.query( "INSERT INTO SchemaMigrations (name) VALUES (?)", [ file ] )
      await conn.commit()

      console.log( `applied ${file}` )
    }

    console.log( "migrations ok" )
  } catch ( e ) {
    try {
      await conn.rollback()
    } catch {
      void 0
    }
    console.error( e )
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
