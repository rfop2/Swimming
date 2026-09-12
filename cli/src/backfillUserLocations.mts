#!/usr/bin/env nodemjs
import "dotenv/config"
import { geocodeLocation, getPool, prepareStatement } from "lib"

interface UserLocation {
  id: string
  location: string
}

( async () => {
  const pool = await getPool()

  const selectUsers = prepareStatement<Record<string, never>, UserLocation>(
    pool,
    `SELECT User.id, User.location
     FROM User
     LEFT JOIN Locations ON User.locationId = Locations.locationId
     WHERE User.location IS NOT NULL AND User.location != '' AND Locations.locationId IS NULL`
  )
  const updateUserLocationId = prepareStatement<{ userId: string, locationId: number }>(
    pool,
    "UPDATE User SET locationId = :locationId WHERE id = :userId"
  )

  const users = await selectUsers.all()
  console.log( `Found ${users.length} user(s) with an unresolved location` )

  let resolved = 0
  let failed = 0

  for ( const user of users ) {
    try {
      const geocoded = await geocodeLocation( user.location )
      if ( !geocoded ) {
        console.warn( `Could not geocode '${user.location}' for user ${user.id}` )
        failed++
        continue
      }
      await updateUserLocationId.run( { userId: user.id, locationId: geocoded.locationId } )
      console.log( `Resolved '${user.location}' -> locationId ${geocoded.locationId} for user ${user.id}` )
      resolved++
    } catch ( e ) {
      console.error( `Failed to resolve location for user ${user.id}:`, e )
      failed++
    }
  }

  console.log( `Done. Resolved ${resolved}, failed ${failed}, out of ${users.length}` )
  process.exit( 0 )

} )().catch( ( error ) => {
  console.error( "Caught error...", error )
  console.trace( error )
  process.exit( -1 )
} )
