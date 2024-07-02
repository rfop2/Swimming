import seedrandom from "seedrandom"
import type { Cheerio, CheerioAPI, AnyNode } from "cheerio"
import { addMilliseconds, format } from "date-fns"

const debugEnabled = !!( process.env?.DEBUG === "true" ) || false

export const debug = ( ...args: unknown[] ) => {
  if ( debugEnabled ) {
    console.log( ...args )
  }
}

export const rng = seedrandom()
export const sleep = ( timeout: number ) => new Promise( r => setTimeout( r, timeout * 1_000 ) )

export const shuffle = <T>( array: T[] ) => {
  for ( let i = array.length - 1; i > 0; i-- ) {
    const j = Math.floor( Math.random() * ( i + 1 ) );
    [ array[i], array[j] ] = [ array[j], array[i] ]
  }
  return array
}

export const extractTableData = ( $: CheerioAPI, table: Cheerio<AnyNode> ) => {
  // const data = await page.evaluate( ( tbody: HTMLTableSectionElement ) => {
  const headers: Array<string> = []
  const dataObject: Array<Record<string, string>> = []

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
    const rowData: Record<string, string> = {}
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

export const secondsToTime = ( seconds: number ): string => {
  // Calculate the whole seconds and fractional part
  const wholeSeconds = Math.floor( seconds )
  const milliseconds = Math.round( ( seconds - wholeSeconds ) * 1000 )

  // Add the given number of milliseconds to the epoch start (1970-01-01T00:00:00Z)
  const date = addMilliseconds( new Date( 0 ), wholeSeconds * 1000 + milliseconds )

  // Format the date based on the total seconds
  if ( seconds >= 60 ) {
    return format( date, "m:ss.SS" )
  } else {
    return format( date, "ss.SS" )
  }
}
