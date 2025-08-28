// server/api/html-proxy.ts
export default defineEventHandler( async ( event ) => {
  const query = getQuery( event )
  const url = query.url as string

  if ( !url ) {
    throw createError( { statusCode: 400, statusMessage: "Missing url parameter" } )
  }

  try {
    const res = await fetch( url, {
      headers: {
        // Optionally spoof a browser user-agent
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
      }
    } )

    if ( !res.ok ) {
      throw createError( { statusCode: res.status, statusMessage: res.statusText } )
    }

    const html = await res.text()
    return { html }
  } catch ( err ) {
    console.error( err )
    throw createError( { statusCode: 500, statusMessage: "Failed to fetch external HTML" } )
  }
} )
