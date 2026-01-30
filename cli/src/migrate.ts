import "dotenv/config"
import { readdir, readFile } from "node:fs/promises"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { closePool, getPool, runTransaction } from "lib"
import type { PoolConnection, RowDataPacket } from "lib"

const __dirname = dirname( fileURLToPath( import.meta.url ) )
const MIGRATIONS_DIR = join( __dirname, "..", "..", "data", "migrations" )

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
  await runTransaction( await getPool(), ( async ( conn: PoolConnection ) => {
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
  } ) )

  try {
    await closePool()
  } catch {
    void 0
  }
}

( async () => {
  await main()
} )().catch( ( error ) => {
  console.error( "Uncaught error...", error )
} )
