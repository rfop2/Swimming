import "dotenv/config"
import { promises as fs } from "fs"
import fetch, { FetchError } from "node-fetch"
import { differenceInHours } from "date-fns"
import { Cheerio, CheerioAPI, AnyNode } from "cheerio"
import seedrandom from "seedrandom"
import { BASE_URL, CACHE_DIR } from "./config.js"

const debugEnabled = !!( process.env?.DEBUG === "true" ) || false

export const debug = ( ...args: unknown[] ) => {
  if ( debugEnabled ) {
    console.log( ...args )
  }
}

export const rng = seedrandom( "12345" ) // For predictable randomness
export const sleep = ( timeout: number ) => new Promise( r => setTimeout( r, timeout * 1_000 ) )

export const extractTableData = ( $: CheerioAPI, table: Cheerio<AnyNode> ) => {
  // const data = await page.evaluate( ( tbody: HTMLTableSectionElement ) => {
  const headers: Array<string> = []
  const dataObject: Array<Record<string,string>> = []

  let lastRowHeader = ""
  table.find( "tr" ).each( ( rowIndex, rowElement ) => {
    const row = $( rowElement )
    if ( rowIndex === 0 ) {
      row.find( "th" ).each( ( cellIndex, cellElement ) => {
        headers.push( $( cellElement ).text().toLowerCase().replace( /\s+/g, "_" ) )
      } )
      return
    }

    const valueCells = row.find( "td" )
    const rowData: Record<string,string> = {}
    let headerIndex = 0
    for ( const valueCell of valueCells ) {
      let value = $( valueCell ).text().trim()
      if ( headerIndex === 0 ) {
        if ( value === "" ) {
          value = lastRowHeader
        } else {
          lastRowHeader = value
        }
      }
      rowData[headers[headerIndex++]] = value
    }
    dataObject.push( rowData )
  } )
  return dataObject
}

export const timetoSeconds = ( time: string ): number => {
  // Split the input time string by colons
  const timeParts = time.split( ":" )

  // Initialize total seconds
  let totalSeconds = 0

  if ( timeParts.length === 3 ) {
    // If format is hours:minutes:seconds.decimal
    const hours = parseFloat( timeParts[0] )
    const minutes = parseFloat( timeParts[1] )
    const seconds = parseFloat( timeParts[2] )

    // Convert to total seconds
    totalSeconds = hours * 3600 + minutes * 60 + seconds
  } else if ( timeParts.length === 2 ) {
    // If format is minutes:seconds.decimal
    const minutes = parseFloat( timeParts[0] )
    const seconds = parseFloat( timeParts[1] )

    // Convert to total seconds
    totalSeconds = minutes * 60 + seconds
  } else if ( timeParts.length === 1 ) {
    // If only one part, it's already in seconds
    totalSeconds = parseFloat( timeParts[0] )
  } else {
    throw new Error( "Invalid time format" )
  }

  return totalSeconds
}

export const createUrl = ( base: string, params: Record<string,string> ) => {
  const url = new URL( BASE_URL + base )
  url.search = new URLSearchParams( params ).toString()
  return url
}

export const fetchPage = async ( pageInfo: PageInfo ) => {
  const contentFile = CACHE_DIR + "/" + pageInfo.label
  console.log( `Processing ${pageInfo.label} -> ${pageInfo.url}` )
  try {
    const stats = await fs.stat( contentFile )
    // Page has been cached
    const age = differenceInHours( Date.now(), stats.mtime )
    console.log( `Cached: ${age}` )
    if ( age < 12 ) {
      // Page is new enough
      console.log( `Reading ${contentFile}` )
      const content = await fs.readFile( contentFile )
      return content
    }
  } catch( error ) {
    if ( error instanceof Error && ( error as NodeJS.ErrnoException ).code ) {
      const err = error as NodeJS.ErrnoException
      if ( err.code !== "ENOENT" ) {
        console.error( `Error code: ${err.code} - ${err.message}` )
      }
    } else {
      console.error( "Unknown error:", error )
    }
  }
  try {
    console.log( `Fetching ${pageInfo.url}` )
    const response = await fetch( pageInfo.url )
    const content = await response.text()
    await fs.writeFile( contentFile, content )
    await sleep( rng() * 60.0 )
    return content
  } catch( error ) {
    if ( error instanceof FetchError ) {
      console.error( `Failed to fetch ${pageInfo.url}: ${error.message}` )
    }
  }
}
