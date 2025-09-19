// server/api/html-proxy.ts
export default defineEventHandler( async ( event ) => {
  const query = getQuery( event )
  const url = query.url as string

  if ( !url ) {
    throw createError( {
      status: 400,
      message: "Missing url parameter"
    } )
  }

  try {
    const res = await fetch( url, {
      headers: {
        // Optionally spoof a browser user-agent
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
      }
    } )

    if ( !res.ok ) {
      throw createError( {
        status: res.status,
        message: res.statusText
      } )
    }

    const html = await res.text()
    return { html }
  } catch ( err ) {
    console.error( err )
    throw createError( {
      status: 500,
      message: "Failed to fetch external HTML"
    } )
  }
} )
