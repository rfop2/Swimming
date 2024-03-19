#!/usr/bin/env nodemjs
import puppeteer, { ElementHandle, Page } from 'puppeteer'
import { format } from 'date-fns'
import 'dotenv/config'
import fs from 'fs'
// import fetch, { FetchError } from 'node-fetch'
import seedrandom from "seedrandom"

// Crashes might be due to running headless when X11 is present
// delete process.env.DISPLAY

const debugEnabled = !!(process.env?.DEBUG === 'true' ) || false;

const rng = seedrandom( "12345" ) // For predictable randomness

const sleep = ( timeout: number ) => new Promise( r => setTimeout( r, timeout ) );
const debug = ( ...args: any[] ) => {
  if ( debugEnabled ) {
    console.log( ...args )
  }
}

const validateActions = async() => {
  debug( `Checking user journeys at ${format( new Date(), "P p" )}` )

  if ( !process.env.USER_EMAIL || !process.env.USER_PASSWORD ) {
    console.error( "No user credentials found" )
    // process.exit( -1 )
  }

  const baseUrl = process.env.SITE_ADDRESS as string
  // const loginUrl = `${baseUrl}/login.html`
  // const diagUrl = `${baseUrl}/index.html#admin_diag/m/4/s/2`
  // const resetUrl = `${baseUrl}/index.html#admin_devreboot/m/4/s/6`
  const screenPath = "debug"

  debug( "Starting browser" )

  const browser = await puppeteer.launch({
    headless: "new",
    defaultViewport: {
      width: 1400,
      height: 1920,
      // isLandscape: false,
    },
    ignoreHTTPSErrors: true,
    // slowMo: 250,
    dumpio: false,
  })

  const page = await browser.newPage()

  page
    //.on('console', message =>
    //  console.log(`${message.type().substring(0, 3).toUpperCase()} ${message.text()}`))
    .on('pageerror', ({ message }) => console.log(message))
    //.on('response', response =>
    //  console.log(`${response.status()} ${response.url()}`))
    .on('requestfailed', request =>
      console.log(`${request.failure()?.errorText} ${request.url()}`))

      if ( !process.env.SITE_ADDRESS ) {
        console.error( "No site address found" )
        process.exit( -1 )
      }
      const dumpPage = async ( page: Page, filename: string ) => {
        if ( debugEnabled )
          await page.screenshot({ path: `${screenPath}/${filename}.png`, fullPage: true })
        // Capture and dump the content
        const html = await page.content();
        fs.writeFileSync( `${screenPath}/${filename}.html`, html );
      }

  const login = async ( page: Page, username: string, password: string ) => {
    debug( "Logging in" )

    await page.waitForSelector( '#js__toggleLogin', { timeout: 1000 })
    await page.click( '#js__toggleLogin' )
    await page.waitForSelector( '#login-ajax', { timeout: 1000 })
    await dumpPage( page, "004-login" )

    try {
      await page.type( '#patient-email', username )
      await page.type( '#patient-password', password )
      await sleep( 1000 )
      await dumpPage( page, "005-login" )
      await page.click( '#uuid-2' )
      await dumpPage( page, "006-logging-in" )

      // Wait for success message
      await page.waitForSelector( '#login-success-fadeout > p > strong', { timeout: 1000, visible: true } )
      await dumpPage( page, "007-logged-in" )

      await page.click( '#js__panel-b > button' )
      await dumpPage( page, "008-logged-in" )
    } catch (error) {
      // Something's gone wrong, did we fail to login?
      const element = await page.waitForSelector( '#login-ajax > fieldset > p.form-error__text', { timeout: 1000, visible: true } )
      const errorText = await page.evaluate( el => el?.textContent, element )
      throw new Error( `Unable to login: ${errorText}` )
    }
  }

  const checkOrders = async ( page: Page ) => {
    debug( "Checking orders" )
    await page.goto( baseUrl, { waitUntil: 'networkidle2' } )

    const accountSelector = "#js__toggleLogin"
    // const linkSelector = "#account-login-topmenu > ul > li:nth-child(1) > a"
    const linkSelector = "#js__panel-b > ul > li:nth-child(1) > a"

    await page.waitForSelector( accountSelector, { timeout: 1000 })
    await page.click( accountSelector )
    await page.waitForSelector( linkSelector, { timeout: 1000 })
    await page.click( linkSelector )
    await page.waitForSelector( '#my_orders_tab > header > h2', { timeout: 5000 })

    await dumpPage( page, "100-orders" )

    // Do some other stuff to check for specific orders or re-order
  }

  const placeOrder = async ( page: Page, catIndex: number, medIndex: number, itemsCount: number=1 ) => {
    debug( `Placing order for ${catIndex} / ${medIndex}` )
    await page.goto( baseUrl, { waitUntil: 'networkidle2' } )
    debug( await page.url() )

    const catSelector = `#js__panel-e > ul > li:nth-child(${catIndex}) > a`
    const medSelector = `#js__panel-e > ul.nav-secondary__list.hide-until--medium.no-mb > li > ul > li:nth-child(${medIndex}) > a`
    const startSelector = "#main-content > div > div:nth-child(1) > div.grid > div:nth-child(1) > a"
    const consultationSelector = "#question_block"

    await page.waitForSelector( catSelector, { timeout: 1000 })
    await dumpPage( page, `101-order-${catIndex}-${medIndex}` )
    await page.click( catSelector )
    await page.waitForSelector( medSelector, { timeout: 1000 })
    await dumpPage( page, `102-order-${catIndex}-${medIndex}` )
    await page.click( medSelector )
    await page.waitForSelector( startSelector, { timeout: 1000 })
    await dumpPage( page, `103-order-${catIndex}-${medIndex}` )
    await page.click( startSelector )
    await page.waitForSelector( consultationSelector, { timeout: 1000 })
    await dumpPage( page, `104-order-${catIndex}-${medIndex}` )
    debug( await page.url() )

    const answerQuestion = async ( question: ElementHandle<HTMLDivElement>, answer?: boolean, answerText?: string ) => {
      const yesAnswer = await question.$( 'input[type=radio].answer[value=yes]' )
      const noAnswer = await question.$( 'input[type=radio].answer[value=no]' )
      const textBox = await question.$( 'textarea' )
      if ( yesAnswer && noAnswer ) {
        const noCorrect = await noAnswer.evaluate( node=>node.getAttribute( "data-correct" ) )
        if ( answer === true || !noCorrect ) {
          await yesAnswer.click()
        } else {
          await noAnswer.click()
        }
        if ( answerText ) {
          if ( !textBox ) {
            throw new Error( "Unable to fill in answer text as no textarea found")
          }
          await textBox.type( answerText )
        }
      }
    }

    const questions = await page.$$( "#questions > div" )
    for ( const [index,question] of questions.entries() ) {
      /* const dataId = await page.evaluate( (obj) => {
        return obj.getAttribute('data-id');
      }, question); */
      debug( `Answering question ${index+1}` )
      await answerQuestion( question )
      await dumpPage( page, `105-order-${catIndex}-${medIndex}-${String(index+1).padStart(2,'0')}` )
    }
    // If we want to add a comment or query, it's the second last question
    debug( "Asking question" )
    const question = questions[questions.length-2]
    await answerQuestion( question, true, "I have a question" )
    await page.keyboard.press( "Tab" )
    await dumpPage( page, `106-order-${catIndex}-${medIndex}-${String(questions.length-1).padStart(2,'0')}` )

    debug( "Checking for errors" )
    // Check for any errors on the form
    const errors = await page.$$( "#questions > div > div.popup > div.notification_incorrect_answer" )
    if ( errors.length ) {
      throw new Error( "Unable to submit consultation, errors in form" )
    }
    await dumpPage( page, `107-order-${catIndex}-${medIndex}` )

    await sleep( 2000 );

    debug( "Submitting form" )
    const submitButtonSelector = "#answer_form button[type=submit]"
    // const chooseHeaderSelector = "#main-content > div.main-content__padding > h2.choose-treatment__heading"
    // const submitButton = await page.$( "#submit_btn" )
    // await submitButton?.click({ delay: 100 })
    //page.$eval( submitButtonSelector, element =>
      //element.click()
    //),
    debug( "Waiting for next page" )
    await Promise.all([
      page.click( submitButtonSelector ),
      page.waitForNavigation(),
    ])
    debug( await page.url() )
    await dumpPage( page, `108-order-${catIndex}-${medIndex}` )

    const treatmentTable = await page.waitForSelector( "table.table-choose-treatment", { timeout: 3000 })
    if ( !treatmentTable )
      return
    let options = await treatmentTable.$$( "input" )
    debug( `Got ${options.length} medication options` )
    // options = await treatmentTable.$$( 'input[type="radio"]' )
    options = await treatmentTable.$$( "input.medication" )
    debug( `Got ${options.length} medication options` )
    options = await treatmentTable.$$( "input.medication:not([disabled])" )
    debug( `Got ${options.length} medication options` )
    while ( itemsCount-- ) {
      const optionIndex = Math.floor( rng() * options.length )
      debug( `Choosing option ${optionIndex+1}` )
      const option = options[optionIndex]
      await option.click()
    }
    await dumpPage( page, `109-order-${catIndex}-${medIndex}` )

    debug( "Submitting form" )
    const submitButtonSelector2 = "#submit_form button[type=submit]"
    debug( "Waiting for next page" )
    await Promise.all([
      page.click( submitButtonSelector2 ),
      page.waitForNavigation(),
    ])
    debug( await page.url() )
    await dumpPage( page, `110-order-${catIndex}-${medIndex}` )

    debug( "Confirming order" )
    const submitButtonSelector3 = "#confirm-form > button"

    debug( "Waiting for next page" )
    await Promise.all([
      page.click( submitButtonSelector3 ),
      page.waitForNavigation(),
    ])
    debug( await page.url() )
    await dumpPage( page, `111-order-${catIndex}-${medIndex}` )

    debug( "Paying for order" )
    const cardNumber = process.env.PAYMENT_CARD_NUMBER ?? "4111 1111 1111 1111"
    // const cardNumber = process.env.PAYMENT_CARD_NUMBER ?? "4000000000001000"
    const cardExpiry = process.env.PAYMENT_CARD_EXPIRY ?? "11/24" // Should be generated off current date
    const cardSecurity = process.env.PAYMENT_CARD_SECURITY ?? "123"
    const cardCode = process.env.PAYMENT_CARD_CODE ?? "1234"

    await page.type( 'input[name=card_number]', cardNumber )
    await page.type( 'input[name=expire_month]', cardExpiry.split( "/" )[0] )
    await page.type( 'input[name=expire_year]', cardExpiry.split( "/" )[1] )
    await page.type( 'input[name=security_code]', cardSecurity )
    await page.click( '#payment_address_0' )
    // Tab off to trigger blur
    await page.keyboard.press( "Tab" )
    await dumpPage( page, `112-order-${catIndex}-${medIndex}` )

    const submitButtonSelector4 = "form.payment_form button[type=submit]"
    debug( "Waiting for next page" )
    await Promise.all([
      page.click( submitButtonSelector4 ),
      page.waitForNavigation()
    ])
    debug( await page.url() )
    await dumpPage( page, `113-order-${catIndex}-${medIndex}` )

    debug( "Approving payment" )
    // await page.waitForNavigation()
    // Does life really have to be this complicated?
    /* const wrapperFrameHandle = await page.waitForSelector( '#st-control-frame-iframe' )
    if ( !wrapperFrameHandle )
      throw new Error( "Can't find wrapper frame handle")
    const wrapperFrame = await wrapperFrameHandle.contentFrame()
    if ( !wrapperFrame )
      throw new Error( "Can't find wrapper frame")
    const outerFrameHandle = await wrapperFrame.waitForSelector( '#Cardinal-collector' )
    if ( !outerFrameHandle )
      throw new Error( "Can't find outer frame handle")
    const outerFrame = await outerFrameHandle.contentFrame()
    if ( !outerFrame )
      throw new Error( "Can't find outer frame") */
    await sleep( 15000 )
    const innerFrameHandle = await page.waitForSelector( '#Cardinal-CCA-IFrame' )
    if ( !innerFrameHandle )
      throw new Error( "Can't find inner frame handle")
    const innerFrame = await innerFrameHandle.contentFrame()
    if ( !innerFrame )
      throw new Error( "Can't find inner frame")
    debug( await page.url() )

    // const html = await innerFrame.content();
    // fs.writeFileSync( `${screenPath}/frame.html`, html );
    await innerFrame.waitForSelector( 'form[name=cardholderInput] input[type=text]', { timeout: 60000 } )
    await dumpPage( page, `114-order-${catIndex}-${medIndex}` )
    await innerFrame.type( 'form[name=cardholderInput] input[type=text]', cardCode )
    await page.keyboard.press( "Tab" )
    await dumpPage( page, `115-order-${catIndex}-${medIndex}` )
    await sleep( 1000 )
    await Promise.all([
      page.keyboard.press( "Enter" ),
      //page.click( '#content input.button.primary' ),
      page.waitForNavigation(),
    ])
    debug( await page.url() )
    await dumpPage( page, `116-order-${catIndex}-${medIndex}` )
  }

  const checkMessages = async ( page: Page ) => {
    debug( "Checking messages" )
    await page.goto( baseUrl, { waitUntil: 'networkidle2' } )

    const accountSelector = "#js__toggleLogin"
    const linkSelector = "#js__panel-b > ul > li:nth-child(2) > a"

    await page.waitForSelector( accountSelector, { timeout: 1000 })
    await page.click( accountSelector )
    await page.waitForSelector( linkSelector, { timeout: 1000 })
    await page.click( linkSelector )
    // await page.waitForSelector( '#my_orders_tab > div:nth-child(1) > h2', { timeout: 10000 })
    await page.waitForXPath( '//*[@id="my_orders_tab"]/div[1]/h2[text()="My messages"]', { timeout: 5000 } )

    await dumpPage( page, "200-messages" )

    // Do some other stuff to check for specific messages or write a new message
  }

  const logout = async ( page: Page ) => {
    debug( "Logging out" )
    await page.goto( baseUrl, { waitUntil: 'networkidle2' } )

    const accountSelector = "#js__toggleLogin"
    const linkSelector = "#js__panel-b > a.button.button--large.button--min-width.button--no-padding.mb_20"

    await page.waitForSelector( accountSelector, { timeout: 1000 })
    await page.click( accountSelector )
    await page.waitForSelector( linkSelector, { timeout: 1000 })
    await dumpPage( page, "990-logging-out" )
    await page.click( linkSelector )
    await page.waitForSelector( '#login-ajax', { timeout: 1000 })
    // await page.waitForNetworkIdle( { timeout: 5000 } )

    await dumpPage( page, "991-logged-out" )
  }

  try {
    // Go to the top-level page
    await page.goto( baseUrl, { waitUntil: 'networkidle2' } )
    await dumpPage( page, "001-index" )

    try {
      // Allow cookies if present
      const cookieConsent = "#channel_ > div.cookie-bar > div > a"
      await page.waitForSelector( cookieConsent, { timeout: 0 })
      await page.click( cookieConsent )
    } catch( error ) {
      // No problem
    }
    await dumpPage( page, "002-index" )

    // await login( page, process.env.USER_EMAIL, process.env.USER_PASSWORD )
    // await checkOrders( page )
    // await placeOrder( page, 18, 1, 2 )
    // await checkMessages( page )
    // await logout( page )

    /* try {
      if ( await testNetwork( page ) ) {
      } else {
        await reboot( page )
      }
    } catch (error) {
      console.error( "Test Error", error )
      await page.screenshot({ path: `${screenPath}/test-error.png`, fullPage: true })
      process.exit( -1 );
    } */

    debug( "Closing browser" )

    await browser.close()
  } catch (error) {
    await dumpPage( page, "000-error" )
    console.error( "General error", error )
    process.exit( -1 );
  }
}

(async () => {
  // const getopts = require( "getopts" )
  /* const options = getopts(process.argv.slice(2), {
    alias: {
      pages: ["p"],
      actions: "a",
    },
  }) */

  await validateActions()

  process.exit(0)
})().catch( error => {
  console.error( "Caught error...", error );
  console.trace( error );
});

process.on('uncaughtException', function(err) {
  console.log( "Possibly uncaught Exception: "+err );
  console.trace( err );
  process.exit( -1 );
});

process.on('unhandledRejection', function(reason, p){
  console.log("Possibly Unhandled Rejection at: Promise ", p, " reason: ", reason);
  console.trace( reason );
  process.exit( -1 );
});
