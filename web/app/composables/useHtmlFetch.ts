export async function useHtmlFetch( url: string ) {
  // Call our server API (no CORS issues)
  const res = await $fetch<{ html: string }>( "/api/proxy", {
    params: { url }
  } )

  if ( !res.html ) {
    throw new Error( "No HTML returned" )
  }

  // Parse in the browser only
  if ( import.meta.client ) {
    const parser = new DOMParser()
    return parser.parseFromString( res.html, "text/html" )
  }

  return null
}
