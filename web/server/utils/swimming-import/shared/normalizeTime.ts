export function normalizeTime( time: string | null ): string | null {
  if ( !time ) return null
  const normalized = time.replace( ",", "." ).trim()

  // e.g. "1.33:0" -> "00:01:33", "12.07:3" -> "00:12:07"
  if ( /^\d{1,2}\.\d{1,2}:\d+$/.test( normalized ) ) {
    const [ minPart, secAndTail ] = normalized.split( "." )
    const secPart = secAndTail.split( ":" )[0]
    const minutes = String( parseInt( minPart, 10 ) ).padStart( 2, "0" )
    const seconds = String( parseInt( secPart, 10 ) ).padStart( 2, "0" )
    return `00:${minutes}:${seconds}`
  }

  // Case mm:ss (no decimals) -> convert to mm.ss
  if ( /^\d{1,2}:\d{2}$/.test( normalized ) ) {
    const [ minutes, seconds ] = normalized.split( ":" )
    return `${parseInt( minutes, 10 )}.${seconds}`
  }

  // Case m.ss.xx -> convert to hh:mm:ss (drop hundredths)
  if ( /^\d+\.\d+\.\d+$/.test( normalized ) ) {
    const parts = normalized.split( "." )
    const minutes = String( parseInt( parts[0], 10 ) ).padStart( 2, "0" )
    const seconds = String( parseInt( parts[1], 10 ) ).padStart( 2, "0" )
    return `00:${minutes}:${seconds}`
  }

  // Case mm:ss.xx -> convert to hh:mm:ss
  if ( /^\d{1,2}:\d{2}\.\d+$/.test( normalized ) ) {
    const [ minutesRaw, secondsRaw ] = normalized.split( ":" )
    const minutes = String( parseInt( minutesRaw, 10 ) ).padStart( 2, "0" )
    const seconds = Math.floor( parseFloat( secondsRaw ) ).toString().padStart( 2, "0" )
    return `00:${minutes}:${seconds}`
  }

  // Case hh:mm:ss -> zero-pad just in case
  if ( /^\d{1,2}:\d{2}:\d{2}$/.test( normalized ) ) {
    const [ hours, minutes, seconds ] = normalized.split( ":" )
    return `${hours.padStart( 2, "0" )}:${minutes.padStart( 2, "0" )}:${seconds.padStart( 2, "0" )}`
  }

  return normalized
}
