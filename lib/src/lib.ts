import seedrandom from "seedrandom"
import type { AnyNode } from "domhandler"
import type { Cheerio, CheerioAPI } from "cheerio"
import { addMilliseconds, differenceInYears, endOfYear, format, parseISO } from "date-fns"
import { Swimmer } from "./types.js"
import { BASE_URL } from "./config.js"

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

export const timeToSeconds = ( time: string ): number => {
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
    return format( date, "s.SS" )
  }
}

const turnFactors = new Map<string,number>( Object.entries( {
  "50-freestyle": 42.245,
  "100-freestyle": 42.245,
  "200-freestyle": 43.786,
  "400-freestyle": 44.233,
  "800-freestyle": 45.525,
  "1500-freestyle": 46.221,
  "50-breaststroke": 63.616,
  "100-breaststroke": 63.616,
  "200-breaststroke": 66.598,
  "50-butterfly": 38.269,
  "100-butterfly": 38.269,
  "200-butterfly": 39.76,
  "50-backstroke": 40.5,
  "100-backstroke": 40.5,
  "200-backstroke": 41.98,
  "200-individual_medley": 49.7,
  "400-individual_medley": 55.366,
} ) )

const validatePoolAndDistance = ( pool: string, distance: number ) => {
  let turnsPer100 = 0
  let minDistance = 0
  switch ( pool ) {
    case "lc" : {
      turnsPer100 = 1
      minDistance = 50
      break
    }
    case "sc" : {
      turnsPer100 = 3
      minDistance = 25
      break
    }
    default : {
      throw( new Error( `Invalid pool length '${pool}'` ) )
    }
  }
  if ( distance < minDistance ) {
    throw( new Error( `Invalid distance '${distance}' for pool '${pool}'` ) )
  }
  return turnsPer100
}

export const convertTime = ( fromPool: string, toPool: string, stroke: string, distance: string, time: string | number ) => {
  const rawDistance = Number( distance.replace( /m$/, "" ) )
  const fromTurnsPer100 = validatePoolAndDistance( fromPool, rawDistance )
  const toTurnsPer100 = validatePoolAndDistance( toPool, rawDistance )

  let timeInSecs = Number( time )
  if ( isNaN( timeInSecs ) ) {
    timeInSecs = timeToSeconds( String( time ) )
    if ( isNaN( timeInSecs ) ) {
      throw( new Error( `Invalid time '${time}'` ) )
    }
  }

  if ( fromPool === toPool ) {
    return timeInSecs
  }

  const turnFactor = turnFactors.get( `${rawDistance}-${stroke}` )
  if ( !turnFactor ) {
    throw new Error( `Unable to get turn factor for '${rawDistance}-${stroke}'` )
  }

  let timeAs50 = timeInSecs
  if ( fromPool !== "lc" ) {
    const numTurnFactor = ( rawDistance / 100 ) * ( rawDistance / 100 ) * ( fromTurnsPer100 - 1 )
    timeAs50 = ( timeInSecs + Math.sqrt( timeInSecs * timeInSecs + ( 4 * turnFactor * numTurnFactor ) ) ) / 2
  }

  const turnVal = turnFactor / timeAs50 * ( rawDistance / 100 )
  const turnTime = turnVal * ( rawDistance / 100 ) * ( toTurnsPer100 - 1 )

  const convertedTime = Number( ( timeAs50 - turnTime ).toFixed( 1 ) )

  return convertedTime
}

export const getCompetitionAge = ( birthdate: Date ): number => {
  // Function to calculate age on December 31st of the current year
  const dec31 = endOfYear( new Date() ) // Get December 31st of the current year
  return differenceInYears( dec31, birthdate ) // Calculate the difference in years
}

export const getSwimmerAge = ( swimmer: Swimmer ): number => {
  return getCompetitionAge( parseISO( swimmer.birthday ) )
}

export const createUrl = ( base: string, params: Record<string, string> ) => {
  const url = new URL( BASE_URL + base )
  url.search = new URLSearchParams( params ).toString()
  return url
}
