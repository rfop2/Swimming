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

export const getBrowserPage = async () => {
  const proxy = "http://proxy-server.scraperapi.com:8001"
  const username = "scraperapi"
  const password = process.env.SCRAPER_API_KEY

  const puppeteer = await import( "puppeteer" ) // dynamic import

  if ( !browser ) {
    const launchOptions: LaunchOptions = {
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        `--proxy-server=${proxy}`,
        "--ignore-certificate-errors",
      ]
    }
    browser = await puppeteer.launch( launchOptions )
  }

  if ( !page || page.isClosed() ) {
    page = await browser.newPage()

    page.setDefaultNavigationTimeout( 120_000 )
    page.setDefaultTimeout( 120_000 )

    await page.authenticate( { username, password: password as string } )

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

    // For visibility:
    client.on( "Network.requestWillBeSent", ( params ) => {
      if ( params.request.url.includes( "google." ) ) {
        console.log( "⚠️  Would have hit Google:", params.request.url )
      }
    } )

    await page.setRequestInterception( true )

    page.on( "request", ( req ) => {
      const url = req.url()
      const resource = req.resourceType()

      try {
        // Block by domain regex
        const hostname = new URL( url ).hostname
        console.log( "H", hostname )
        if ( allowDomainPatterns.some( ( re ) => re.test( hostname ) ) ) {
          console.log( `Force allowed request to domain ${hostname}` )
          return void req.continue()
        }

        if ( blockedDomainPatterns.some( ( re ) => re.test( hostname ) ) ) {
          console.log( `Blocked request to domain ${hostname}` )
          return void req.abort()
        }

        // Block by path regex
        const pathname = new URL( url ).pathname

        if ( allowPathPatterns.some( ( re ) => re.test( pathname ) ) ) {
          console.log( `Force allowed request to path ${pathname}` )
          return void req.continue()
        }

        if ( blockedPathPatterns.some( ( re ) => re.test( pathname ) ) ) {
          console.log( `Blocked request to path ${pathname}` )
          return void req.abort()
        }

        // Block by resource type
        if ( blockedResourceTypes.includes( resource ) ) {
          console.log( `Blocked request for resource ${resource}` )
          return void req.abort()
        }

        console.log( `Allowing request to ${hostname}/${pathname} (${resource})` )
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
  // Close browser
  if ( browser ) {
    await browser.close()
    browser = null
    page = null
  }
}
