export function useContextDate() {
  function parseDate( input: string | Date ): Date {
    if ( input instanceof Date ) return input

    // TIMESTAMP returned as "YYYY-MM-DD HH:mm:ss"
    return new Date( input.replace( " ", "T" ) )
  }

  function format( input: string | Date ): string {
    const date = parseDate( input )
    const now = new Date()

    const diffMs = now.getTime() - date.getTime()
    const diffSeconds = Math.floor( diffMs / 1000 )
    const diffMinutes = Math.floor( diffSeconds / 60 )
    const diffHours = Math.floor( diffMinutes / 60 )

    // ---- Relative ----
    if ( diffSeconds < 60 ) return "just now"
    if ( diffMinutes < 60 ) return `${diffMinutes}m ago`
    if ( diffHours < 6 && isSameDay( date, now ) ) return `${diffHours}h ago`
    // 6h cutoff avoids "23h ago" UX awkwardness

    // ---- Contextual ----
    if ( isSameDay( date, now ) ) {
      return formatTime( date )
    }

    if ( isYesterday( date, now ) ) {
      return `Yesterday, ${formatTime( date )}`
    }

    return formatOlder( date, now )
  }

  function isSameDay( a: Date, b: Date ) {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    )
  }

  function isYesterday( date: Date, now: Date ) {
    const y = new Date( now )
    y.setDate( now.getDate() - 1 )
    return isSameDay( date, y )
  }

  function formatTime( date: Date ) {
    return new Intl.DateTimeFormat( undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    } ).format( date )
  }

  function formatOlder( date: Date, now: Date ) {
    const sameYear = date.getFullYear() === now.getFullYear()

    return new Intl.DateTimeFormat( undefined, {
      month: "2-digit",
      day: "2-digit",
      ...( sameYear ? {} : { year: "2-digit" } ),
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    } ).format( date )
  }

  return { format }
}
