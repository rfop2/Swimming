import { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise"

let pool: Pool | null = null

export const getPool = async () => {
  if ( !pool ) {
    const mysql = await import( "mysql2/promise" ) // Dynamic import
    pool = mysql.createPool( {
      host: process.env.NODE_ENV === "production" ? "db" : "192.168.45.2",
      user: process.env.MARIADB_USER,
      password: process.env.MARIADB_PASSWORD,
      database: process.env.MARIADB_DATABASE,
      namedPlaceholders: true
    } )
  }
  return pool
}

export const closePool = async () => {
  if ( pool ) {
    try {
      await pool.end()
      console.log( "closePool] Connection pool closed." )
    } catch ( err ) {
      console.error( "[closePool] Error closing connection pool:", err )
    }
  }
}

// Mimic better-sqlite3 RunResult
export type RunResult = {
  affectedRows: number
  insertId: number
}

export interface MySql2Error extends Error {
  code?: string;
  errno?: number;
  sqlState?: string;
  sqlMessage?: string;
  sql?: string;
  fatal?: boolean;
}

export const isMySql2Error = ( err: unknown ): err is MySql2Error => {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    typeof ( err as any ).code === "string"
  )
}

type Statement<Params, Result = RowDataPacket> = {
  get: ( params: Params ) => Promise<( Result ) | undefined>;
  all: ( params?: Params ) => Promise<( Result )[]>;
  run: ( params?: Params ) => Promise<RunResult>;
}

// Helper to create a typed statement
export const prepareStatement = <Params, Result = RowDataPacket>(
  executor: Pool | PoolConnection,
  sql: string
): Statement<Params, Result> => {
  return {
    async get( params: Params ) {
      const [ rows ] = await executor.execute<RowDataPacket[]>( sql, params )
      return rows[0] as Result | undefined
    },
    async all( params?: Params ) {
      const [ rows ] = await executor.execute<RowDataPacket[]>( sql, params )
      return rows as ( Result )[]
    },
    async run( params?: Params ) {
      const [ result ] = await executor.execute<ResultSetHeader>( sql, params )
      return {
        affectedRows: result.affectedRows,
        insertId: result.insertId,
      }
    },
  }
}

export const runTransaction = async <ExtraArgs extends unknown[] = []>(
  pool: Pool,
  callback: ( conn: PoolConnection, ...args: ExtraArgs ) => Promise<void>,
  ...args: ExtraArgs
) => {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    await callback( conn, ...args )
    await conn.commit()
  } catch ( err ) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}
