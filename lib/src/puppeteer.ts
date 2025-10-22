import type { Browser, Page, LaunchOptions } from "puppeteer"

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
