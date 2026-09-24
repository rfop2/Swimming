export type FetchMethod = "scraperapi" | "nordvpn"

let fetchMethod: FetchMethod | null = null

// Resolves and caches which upstream fetch method to use, so the choice is made
// once per run and every caller (fetchPage, fetchPages, fetchPageBrowser, setup
// code) agrees on it instead of re-checking env vars independently.
export const getFetchMethod = (): FetchMethod => {
  if ( fetchMethod ) return fetchMethod

  if ( process.env.SCRAPER_API_KEY ) {
    fetchMethod = "scraperapi"
  } else if ( process.env.NORDVPN_SC_USERNAME && process.env.NORDVPN_SC_PASSWORD ) {
    fetchMethod = "nordvpn"
  } else {
    throw new Error( "No fetch method configured: set SCRAPER_API_KEY or NORDVPN_SC_USERNAME/NORDVPN_SC_PASSWORD" )
  }

  console.log( `Using fetch method: ${fetchMethod}` )
  return fetchMethod
}
