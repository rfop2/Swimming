import { COUNTIES, REGIONS } from "lib"

const normalizeName = ( name: string ): string =>
  name
    .toLowerCase()
    .replace( /&/g, "and" )
    .replace( /[^a-z0-9\s]/g, "" )
    .replace( /\s+/g, " " )
    .trim()

// Known mismatches between the two source sites' naming and the COUNTIES/REGIONS
// labels in lib. Add to this table as new mismatches are discovered.
const AREA_NAME_OVERRIDES: Record<string, string> = {
  "berkshire and south buckinghamshire": "BSBS",
  "oxfordshire and north buckinghamshire": "ONBS",
  "northumberland and durham": "NDRE",
  "gloucestershire": "GLUW",
  "worcestershire": "WRCM",
  // lib's REGIONS uses the singular "East Midland" (code "A"); swimturn.com uses "East Midlands".
  "east midlands": "A",
  // lib's REGIONS uses the plural "West Midlands" (code "M"); swimturn.com uses "West Midland".
  "west midland": "M",
}

const buildLookup = ( source: Record<string, string> ): Record<string, string> => {
  const lookup: Record<string, string> = {}
  for ( const [ code, name ] of Object.entries( source ) ) {
    lookup[normalizeName( name )] = code
  }
  for ( const [ name, code ] of Object.entries( AREA_NAME_OVERRIDES ) ) {
    lookup[normalizeName( name )] = code
  }
  return lookup
}

const countyLookup = buildLookup( COUNTIES )
const regionLookup = buildLookup( REGIONS )

/**
 * Resolves a county or region display name (as scraped from a source site) to
 * its British Swimming area code, per the COUNTIES/REGIONS tables in lib.
 * Throws if no mapping can be found — callers should catch, log, and skip
 * that area rather than guess.
 */
export const normalizeAreaCode = ( rawName: string, kind: "county" | "region" ): string => {
  const lookup = kind === "county" ? countyLookup : regionLookup
  const code = lookup[normalizeName( rawName )]
  if ( !code ) {
    throw new Error( `No ${kind} code mapping for '${rawName}' — add it to AREA_NAME_OVERRIDES in normalize.mts` )
  }
  return code
}
