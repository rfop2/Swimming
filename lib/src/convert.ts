import fs from "fs"

// Map SQL type to Drizzle type
function mapType( sqlType: string, colName: string ) {
  const type = sqlType.toUpperCase()

  if ( type.startsWith( "VARCHAR" ) ) {
    const length = type.match( /\((\d+)\)/ )?.[1] || 255
    return `varchar("${colName}", { length: ${length} })`
  }
  if ( type.startsWith( "CHAR" ) ) {
    const length = type.match( /\((\d+)\)/ )?.[1] || 1
    return `char("${colName}", { length: ${length} })`
  }
  if ( type.startsWith( "INT" ) || type.startsWith( "BIGINT" ) || type.startsWith( "TINYINT" ) ) {
    return `int("${colName}")`
  }
  if ( type.startsWith( "DECIMAL" ) ) {
    const [ precision, scale ] = type.match( /\((\d+),\s*(\d+)\)/ )?.slice( 1 ).map( Number ) || []
    return `decimal("${colName}", { precision: ${precision || 10}, scale: ${scale || 0} })`
  }
  if ( type.startsWith( "DATE" ) ) {
    return `date("${colName}")`
  }
  if ( type.startsWith( "TIMESTAMP" ) || type.startsWith( "DATETIME" ) ) {
    return `timestamp("${colName}")`
  }
  if ( type.startsWith( "TEXT" ) ) {
    return `text("${colName}")`
  }

  return `/* TODO: map type: ${type} */ varchar("${colName}", { length: 255 })`
}

function parseCreateTable( sql: string ) {
  const tables = []
  const regex = /CREATE TABLE\s+`(\w+)`\s*\(([^;]+)\)\s*ENGINE=/gis
  let match

  while ( ( match = regex.exec( sql ) ) !== null ) {
    const [ , tableName, body ] = match
    const lines = body.split( /,\s*\n/ ).map( ( l ) => l.trim() )

    const columns = []
    const pkCols = []
    const fks = []
    const indexes = []

    for ( const line of lines ) {
      // Primary key
      if ( line.toUpperCase().startsWith( "PRIMARY KEY" ) ) {
        const cols = [ ...line.matchAll( /`(\w+)`/gi ) ].map( ( m ) => m[1] )
        pkCols.push( ...cols )
        continue
      }

      // Foreign key
      if ( line.toUpperCase().startsWith( "CONSTRAINT" ) || line.toUpperCase().startsWith( "FOREIGN KEY" ) ) {
        const [ localCol ] = [ ...line.matchAll( /FOREIGN KEY\s*\(`(\w+)`\)/gi ) ].map( ( m ) => m[1] )
        const [ refTable, refCol ] = [ ...line.matchAll( /REFERENCES\s+`(\w+)`\s*\(`(\w+)`\)/gi ) ].map( ( m ) => [ m[1], m[2] ] )[0] || []
        if ( localCol && refTable && refCol ) fks.push( { localCol, refTable, refCol } )
        continue
      }

      // Indexes
      if ( line.toUpperCase().startsWith( "KEY" ) || line.toUpperCase().startsWith( "UNIQUE KEY" ) ) {
        const unique = line.toUpperCase().startsWith( "UNIQUE KEY" )
        const cols = [ ...line.matchAll( /`(\w+)`/gi ) ].map( ( m ) => m[1] )
        indexes.push( { cols, unique } )
        continue
      }

      // Column definition
      const parts = line.split( /\s+/ )
      const colName = parts[0].replace( /[`"]/g, "" )
      const colType = parts[1]
      let drizzleType = mapType( colType, colName )

      if ( /NOT NULL/i.test( line ) ) drizzleType += ".notNull()"
      if ( /AUTO_INCREMENT/i.test( line ) ) drizzleType += ".autoincrement()"
      if ( /DEFAULT current_timestamp\(\)/i.test( line ) ) {
        if ( drizzleType.startsWith( "timestamp(" ) ) drizzleType += ".defaultNow()"
      }

      columns.push( { colName, code: `  ${colName}: ${drizzleType},` } )
    }

    // Apply PK
    for ( const pk of pkCols ) {
      const col = columns.find( ( c ) => c.colName === pk )
      if ( col ) col.code = col.code.replace( /,?$/, ".primaryKey()," )
    }

    // Apply FKs
    for ( const fk of fks ) {
      const col = columns.find( ( c ) => c.colName === fk.localCol )
      if ( col ) col.code = col.code.replace( /,?$/, `.references(() => ${fk.refTable.toLowerCase()}.${fk.refCol}),` )
    }

    // Apply single-column indexes
    for ( const idx of indexes ) {
      if ( idx.cols.length === 1 ) {
        const col = columns.find( ( c ) => c.colName === idx.cols[0] )
        if ( col ) col.code = col.code.replace( /,?$/, idx.unique ? ".unique()," : ".index()," )
      }
    }

    tables.push( {
      name: tableName,
      code:
        `export const ${tableName.toLowerCase()} = mysqlTable("${tableName}", {\n` +
        columns.map( ( c ) => c.code ).join( "\n" ) +
        "\n});\n" +
        // Add TODO comments for multi-column indexes
        indexes
          .filter( ( idx ) => idx.cols.length > 1 )
          .map(
            ( idx ) =>
              `// TODO: ${idx.unique ? "UNIQUE " : ""}INDEX on columns: (${idx.cols.join( ", " )})`
          )
          .join( "\n" ),
    } )
  }

  return tables
}

function parseViews( sql: string ) {
  const regex = /CREATE\s+.*VIEW\s+`(\w+)`\s+AS\s+([^;]+);/gis
  const views = []
  let match
  while ( ( match = regex.exec( sql ) ) !== null ) {
    const [ , viewName, definition ] = match
    views.push( {
      name: viewName,
      code: `// View ${viewName}\n// SQL: ${definition.trim()}\n// You can use mysqlView("${viewName}", { /* columns */ }) if needed.\n`,
    } )
  }
  return views
}

// --- Run ---
const sqlFile = "../data/schema.sql"
const sql = fs.readFileSync( sqlFile, "utf-8" )

console.log(
  "import { mysqlTable, varchar, int, text, date, timestamp, char, decimal } from \"drizzle-orm/mysql-core\";\n"
)

for ( const t of parseCreateTable( sql ) ) {
  console.log( t.code )
}

for ( const v of parseViews( sql ) ) {
  console.log( v.code )
}
