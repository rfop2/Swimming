#!/usr/bin/env nodemjs
import "dotenv/config"
import type { User } from "lucia"
import { addClubSwimmers } from "./lib.js"
import { getPool, prepareStatement } from "lib"

( async () => {
  const args = process.argv.slice( 2 )

  if ( args.length < 2 ) {
    throw( "Error, username, club must be given. Country, region and county may also be provided" )
  }

  const [ username, clubCode, country, region, county ] = args

  // https://www.swimmingresults.org/12months/last12.php?Pool=S&Stroke=1&Sex=F&AgeGroup=OP&StartNumber=1&RecordsToView=100&TargetNationality=P&TargetRegion=P&TargetCounty=XXXX&Level=O&TargetClub=CHIWWLTW
  // https://www.swimmingresults.org/12months/index.php?Pool=S&Stroke=1&Sex=F&AgeGroup=OP&date-1-dd=&date-1-mm=&date-1=&StartNumber=1&RecordsToView=100&Level=O&TargetNationality=P&TargetRegion=P&TargetCounty=XXXX&TargetClub=CHIWWLTW
  // https://www.swimmingresults.org/12months/last12.php?Pool=S&Stroke=1&Sex=F&AgeGroup=OP&StartNumber=10&RecordsToView=100&TargetNationality=P&TargetRegion=P&TargetCounty=XXXX&Level=O&TargetClub=CHIWWLTW

  const getUser = prepareStatement<{username: string}, User>( await getPool(), "SELECT * FROM User where username = :username" )
  const user = await getUser.get( { username } )
  if ( !user ) {
    throw new Error ( `Invalid user '${username}'` )
  }

  await addClubSwimmers( user, clubCode, country, region, county )

  console.log( "Club import completed" )
  process.exit( 0 )

} )().catch( ( error ) => {
  console.error( "Caught error...", error )
  console.trace( error )
  process.exit( -1 )
} )
