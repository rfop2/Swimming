export function normalizeTime( time: string | null ): string | null {
  if ( !time ) return null
  const normalized = time.replace( ",", "." ).trim()

  // e.g. "1.33:0" -> "00:01:33.0", "12.07:3" -> "00:12:07.3"
  if ( /^\d{1,2}\.\d{1,2}:\d+$/.test( normalized ) ) {
    const [ minPart, secAndTail ] = normalized.split( "." ) as [ string, string ]
    const [ secPart, decPart ] = secAndTail.split( ":" ) as [ string, string ]
    const minutes = String( parseInt( minPart, 10 ) ).padStart( 2, "0" )
    const seconds = String( parseInt( secPart, 10 ) ).padStart( 2, "0" )
    return `00:${minutes}:${seconds}.${decPart}`
  }

  // Case mm:ss (no decimals) -> convert to mm.ss
  if ( /^\d{1,2}:\d{2}$/.test( normalized ) ) {
    const [ minutes, seconds ] = normalized.split( ":" ) as [ string, string ]
    return `${parseInt( minutes, 10 )}.${seconds}`
  }

  // Case m.ss.xx -> convert to hh:mm:ss.xx
  if ( /^\d+\.\d+\.\d+$/.test( normalized ) ) {
    const [ minPart, secPart, decPart ] = normalized.split( "." ) as [ string, string, string ]
    const minutes = String( parseInt( minPart, 10 ) ).padStart( 2, "0" )
    const seconds = String( parseInt( secPart, 10 ) ).padStart( 2, "0" )
    return `00:${minutes}:${seconds}.${decPart}`
  }

  // Case mm:ss.xx -> convert to hh:mm:ss.xx
  if ( /^\d{1,2}:\d{2}\.\d+$/.test( normalized ) ) {
    const [ minutesRaw, secondsRaw ] = normalized.split( ":" ) as [ string, string ]
    const minutes = String( parseInt( minutesRaw, 10 ) ).padStart( 2, "0" )
    const [ secPart, decPart ] = secondsRaw.split( "." ) as [ string, string ]
    const seconds = secPart.padStart( 2, "0" )
    return `00:${minutes}:${seconds}.${decPart}`
  }

  // Case hh:mm:ss -> zero-pad just in case
  if ( /^\d{1,2}:\d{2}:\d{2}$/.test( normalized ) ) {
    const [ hours, minutes, seconds ] = normalized.split( ":" ) as [ string, string, string ]
    return `${hours.padStart( 2, "0" )}:${minutes.padStart( 2, "0" )}:${seconds.padStart( 2, "0" )}`
  }

  return normalized
}
