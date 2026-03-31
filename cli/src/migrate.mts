#!/usr/bin/env node
import "dotenv/config"
import { readdir, readFile } from "node:fs/promises"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { getPool, prepareStatement } from "lib"

const MIGRATIONS_DIR = resolve( dirname( fileURLToPath( import.meta.url ) ), "../../migrations" )

// ─────────────────────────────────────────────────────────
// Bootstrap: ensure the tracking table exists
// ─────────────────────────────────────────────────────────
const ensureTrackingTable = async (): Promise<void> => {
  const pool = await getPool()
  await prepareStatement( pool, `
    CREATE TABLE IF NOT EXISTS _Migrations (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      filename    VARCHAR(255) NOT NULL UNIQUE,
      appliedAt   TIMESTAMP    DEFAULT NOW()
    )
  ` ).run()
}

// ─────────────────────────────────────────────────────────
// Find which migrations have already been applied
// ─────────────────────────────────────────────────────────
const appliedMigrations = async (): Promise<Set<string>> => {
  const pool = await getPool()
  const rows = await prepareStatement<Record<string, never>, { filename: string }>(
    pool,
    "SELECT filename FROM _Migrations"
  ).all()
  return new Set( rows.map( r => r.filename ) )
}

// ─────────────────────────────────────────────────────────
// Find all .sql files in migrations/ sorted numerically
// ─────────────────────────────────────────────────────────
const pendingFiles = async ( applied: Set<string> ): Promise<string[]> => {
  const files = ( await readdir( MIGRATIONS_DIR ) )
    .filter( f => f.endsWith( ".sql" ) )
    .sort() // lexicographic sort works for zero-padded names like 001_, 002_

  return files.filter( f => !applied.has( f ) )
}

// ─────────────────────────────────────────────────────────
// Apply a single migration file
// ─────────────────────────────────────────────────────────
const applyMigration = async ( filename: string ): Promise<void> => {
  const pool = await getPool()
  const sql = await readFile( resolve( MIGRATIONS_DIR, filename ), "utf8" )

  // Split on semicolons so we can run multi-statement files.
  // MySQL DDL (CREATE TABLE etc.) auto-commits and can't be rolled back,
  // but wrapping in a connection ensures statements run sequentially.
  const conn = await pool.getConnection()
  try {
    const statements = sql
      .split( ";" )
      .map( s => s.trim() )
      .filter( s => s.length > 0 && !s.startsWith( "--" ) )

    for ( const statement of statements ) {
      await conn.query( statement )
    }

    await prepareStatement<{ filename: string }>( conn,
      "INSERT INTO _Migrations (filename) VALUES (:filename)"
    ).run( { filename } )

    console.log( `  ✓ ${filename}` )
  } catch ( err ) {
    console.error( `  ✗ ${filename} — failed, aborting` )
    throw err
  } finally {
    conn.release()
  }
}

// ─────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────
( async () => {
  await ensureTrackingTable()

  const applied = await appliedMigrations()
  const pending = await pendingFiles( applied )

  if ( pending.length === 0 ) {
    console.log( "Database is up to date — no migrations to run." )
    process.exit( 0 )
  }

  console.log( `Running ${pending.length} migration(s)...\n` )

  for ( const filename of pending ) {
    await applyMigration( filename )
  }

  console.log( "\nDone." )
  process.exit( 0 )
} )().catch( err => {
  console.error( "\nMigration failed:", err )
  process.exit( 1 )
} )
