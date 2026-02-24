interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Periodically clean up expired entries to prevent memory growth
setInterval( () => {
  const now = Date.now()
  for ( const [ key, entry ] of store ) {
    if ( now > entry.resetAt ) store.delete( key )
  }
}, 60_000 )

export function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const entry = store.get( key )

  if ( !entry || now > entry.resetAt ) {
    store.set( key, { count: 1, resetAt: now + windowMs } )
    return { allowed: true }
  }

  if ( entry.count >= maxAttempts ) {
    const retryAfter = Math.ceil( ( entry.resetAt - now ) / 1000 )
    return { allowed: false, retryAfter }
  }

  entry.count++
  return { allowed: true }
}
