import { addMilliseconds, differenceInYears, endOfYear, format, parseISO } from "date-fns"
import { LatLon, Swimmer } from "./types.js"

const debugEnabled = !!( process.env?.DEBUG === "true" ) || false

export const debug = ( ...args: unknown[] ) => {
  if ( debugEnabled ) {
    console.log( ...args )
  }
}

export const sleep = ( timeout: number ) => new Promise( r => setTimeout( r, timeout * 1_000 ) )

export const shuffle = <T>( array: T[] ) => {
  for ( let i = array.length - 1; i > 0; i-- ) {
    const j = Math.floor( Math.random() * ( i + 1 ) );
    [ array[i], array[j] ] = [ array[j], array[i] ]
  }
  return array
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

export const secondsToTime = ( seconds: number, decimals: number=2 ): string => {
  // Calculate the whole seconds and fractional part
  const wholeSeconds = Math.floor( seconds )
  const milliseconds = Math.round( ( seconds - wholeSeconds ) * Math.pow( 10, decimals ) ) * Math.pow( 10, 3-decimals )

  // Add the given number of milliseconds to the epoch start (1970-01-01T00:00:00Z)
  const date = addMilliseconds( new Date( 0 ), wholeSeconds * 1000 + milliseconds )

  // Format the date based on the total seconds
  const timeFormat = `${seconds >= 60 ? 'm:ss' : 's'}.${'S'.repeat( decimals )}`
  return format( date, timeFormat )
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

export const getSwimmerAgeGroup = ( swimmer: Swimmer ): string => {
  const swimmerAge = getSwimmerAge( swimmer )
  return swimmerAge <= 18 ? String( swimmerAge ) : "OP"
}

export const getSwimmerScopeArea = ( swimmer: Swimmer, scope: string ) => {
  if ( scope === "county" )
    return swimmer.county
  if ( scope === "regional" )
    return swimmer.region
  if ( scope === "national" )
    return swimmer.nationality
  throw new Error( `Unable to find swimmer area for scope '${scope}'` )
}

export const toRadians = ( degrees: number ): number => {
  return degrees * ( Math.PI / 180 )
}

export const haversineDistance = ( coord1: LatLon, coord2: LatLon ): number => {
  const R = 3958.8 // Earth radius in miles
  const dLat = toRadians( coord2.latitude - coord1.latitude )
  const dLon = toRadians( coord2.longitude - coord1.longitude )

  const lat1 = toRadians( coord1.latitude )
  const lat2 = toRadians( coord2.latitude )

  const a =
    Math.sin( dLat / 2 ) ** 2 +
    Math.cos( lat1 ) * Math.cos( lat2 ) * Math.sin( dLon / 2 ) ** 2

  const c = 2 * Math.atan2( Math.sqrt( a ), Math.sqrt( 1 - a ) )

  return R * c
}

export class Timer {
  private startTime: [number, number] | null = null
  private elapsedMs: number = 0
  private running: boolean = false
  private lastLap: [number, number] | null = null

  start(): void {
    if ( this.running ) return
    this.startTime = process.hrtime()
    this.lastLap = this.startTime
    this.running = true
  }

  stop(): void {
    if ( !this.running || this.startTime === null ) return
    const diff = process.hrtime( this.startTime )
    this.elapsedMs += diff[0] * 1_000 + diff[1] / 1e6 // convert to ms
    this.running = false
  }

  reset(): void {
    this.startTime = null
    this.elapsedMs = 0
    this.running = false
    this.lastLap = null
  }

  resume(): void {
    if ( this.running ) return
    this.startTime = process.hrtime()
    this.lastLap = this.startTime
    this.running = true
  }

  lap(): number {
    if ( !this.running || this.lastLap === null ) {
      throw new Error( "Timer must be running to record a lap" )
    }
    const diff = process.hrtime( this.lastLap )
    const lapMs = diff[0] * 1000 + diff[1] / 1e6
    this.lastLap = process.hrtime()
    return lapMs / 1000 // return in seconds
  }

  elapsedSeconds(): number {
    let totalMs = this.elapsedMs
    if ( this.running && this.startTime !== null ) {
      const diff = process.hrtime( this.startTime )
      totalMs += diff[0] * 1000 + diff[1] / 1e6
    }
    return totalMs / 1000 // return in seconds
  }
}
