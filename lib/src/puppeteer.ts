import type { Browser, Page, LaunchOptions } from "puppeteer"

const allowDomainPatterns: RegExp[] = [
  // /(^|\.)cloudflare/i,
]

const blockedDomainPatterns: RegExp[] = [
  /(^|\.)google\./i,
  /(^|\.)gstatic\./i,
  // /(^|\.)cloudflare/i,
  /(^|\.)doubleclick\.net$/i,
  /(^|\.)newrelic\./i,
  /(^|\.)nr-data\./i,
  /(^|\.)facebook\.net$/i,
  /(^|\.)twitter\.com$/i,
]

const allowPathPatterns: RegExp[] = [
  /\/cdn-cgi\/scripts\/.*email-decode/i,   // Required to not get 'email protected' on contacts
]

const blockedPathPatterns: RegExp[] = [
  /\/analytics/i,           // block any URL containing /analytics
  /\/javascripts\//i,            // block JS bundles
  /\/css\//i,             // block CSS files
  /\/images/i,
  /\.js/i,                  // block all JS requests (optional)
  /\.css/i,                 // block all CSS requests (optional)
  /\.ico/i,
]

const blockedResourceTypes = [
  "image",
  "media",
  "font",
  "stylesheet",
  "script",
]

let browser: Browser | null = null
let page: Page | null = null
let localHttpProxy: string | null = null

export const getBrowserPage = async () => {
  const username = process.env.NORDVPN_SC_USERNAME!
  const password = process.env.NORDVPN_SC_PASSWORD!

  // closest to UK: Dublin or Amsterdam SOCKS5
  const puppeteer = await import( "puppeteer" ) // dynamic import

  if ( !browser ) {
    const { anonymizeProxy } = await import( "proxy-chain" )

    const socksHost = process.env.NORDVPN_SC_SERVER ?? "nl.socks.nordhold.net"
    const socksPort = 1080

    const nordSocks = `socks5://${encodeURIComponent( username )}:${encodeURIComponent( password )}@${socksHost}:${socksPort}`
    localHttpProxy = await anonymizeProxy( nordSocks ) // converts SOCKS5→HTTP for Puppeteer

    const launchOptions: LaunchOptions = {
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        `--proxy-server=${localHttpProxy}`,
        "--ignore-certificate-errors",
      ]
    }
    browser = await puppeteer.launch( launchOptions )
    process.on( "exit", async () => {
      try {
        if ( browser ) await closeBrowser()
      } catch ( _e ) {
        // Ignore error
      }
    } )

  }

  if ( !page || page.isClosed() ) {
    page = await browser.newPage()

    page.setDefaultNavigationTimeout( 120_000 )
    page.setDefaultTimeout( 120_000 )

    await page.authenticate( { username, password: password } )

    const client = await page.createCDPSession()
    await client.send( "Network.enable" )
    await client.send( "Network.setBlockedURLs", {
      urls: [
        "*://*.google.*/*",
        "*://*.gstatic.com/*",
        "*://*.googleapis.com/*",
        "*://*.recaptcha.net/*",
      ],
    } )

    await page.setRequestInterception( true )
    page.on( "request", ( req ) => {
      const url = req.url()
      const resource = req.resourceType()

      try {
        // Block by domain regex
        const hostname = new URL( url ).hostname
        if ( allowDomainPatterns.some( ( re ) => re.test( hostname ) ) ) {
          return void req.continue()
        }
        if ( blockedDomainPatterns.some( ( re ) => re.test( hostname ) ) ) {
          return void req.abort()
        }

        // Block by path regex
        const pathname = new URL( url ).pathname
        if ( allowPathPatterns.some( ( re ) => re.test( pathname ) ) ) {
          return void req.continue()
        }
        if ( blockedPathPatterns.some( ( re ) => re.test( pathname ) ) ) {
          return void req.abort()
        }

        // Block by resource type
        if ( blockedResourceTypes.includes( resource ) ) {
          return void req.abort()
        }

        // Otherwise continue
        void req.continue()
      } catch {
        // Ignore invalid URLs or race conditions
        void req.continue()
      }
    } )
  }
  return page
}

export const closeBrowser = async () => {
  const { closeAnonymizedProxy } = await import( "proxy-chain" )

  // Close browser
  if ( browser ) {
    if ( page ) {
      page.removeAllListeners()
      await page.close()
      page = null
    }
    await browser.close()
    browser = null
  }
  if ( localHttpProxy ) {
    await closeAnonymizedProxy( localHttpProxy, true )
  }
}
