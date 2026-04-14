import { getPool, prepareStatement } from "./database.js"

export type LatLon = { latitude: number, longitude: number }

export const toRadians = ( degrees: number ): number => {
  return degrees * ( Math.PI / 180 )
}

export const haversineDistance = ( coord1: LatLon, coord2: LatLon ): number => {
  const R = 3958.8 // Earth radius in miles
  const dLat = toRadians( coord2.latitude - coord1.latitude )
  const dLon = toRadians( coord2.longitude - coord1.longitude )

  const lat1 = toRadians( coord1.latitude )
  const lat2 = toRadians( coord2.latitude )

  const a =
    Math.sin( dLat / 2 ) ** 2 +
    Math.cos( lat1 ) * Math.cos( lat2 ) * Math.sin( dLon / 2 ) ** 2

  const c = 2 * Math.atan2( Math.sqrt( a ), Math.sqrt( 1 - a ) )

  return R * c
}

export interface Location extends LatLon {
  locationId: number
  locationName: string
  locationDescription: string
  locationType: string
}

// export const BASE_URL = "https://www.swimmingresults.org"

const insertLocationsSql =
  `INSERT IGNORE INTO Locations (
  locationId,
  locationName,
  locationDescription,
  locationType,
  latitude,
  longitude
)
VALUES (
  :locationId,
  :locationName,
  :locationDescription,
  :locationType,
  :latitude,
  :longitude
);`

const insertLocationAliasSql =
  `INSERT IGNORE INTO LocationAliases (
  locationId,
  locationAlias
)
VALUES (
  :locationId,
  :locationAlias
);`

export const geocodeLocation = async ( locationName: string ): Promise<Location | undefined> => {
  const getLocation = prepareStatement<{ locationName: string },Location>(
    await getPool(),
    "SELECT Locations.locationId, locationName, GROUP_CONCAT( locationAlias SEPARATOR '|' ) AS locationAliases, locationDescription, locationType, latitude, longitude FROM Locations LEFT JOIN LocationAliases ON Locations.locationId = LocationAliases.locationId WHERE locationName = :locationName OR locationAlias = :locationName GROUP BY Locations.locationId"
  )
  const saveLocation = prepareStatement( await getPool(), insertLocationsSql )
  const saveLocationAlias = prepareStatement( await getPool(), insertLocationAliasSql )
  let location = await getLocation.get( { locationName } )
  if ( location === undefined ) {
    console.log( `Geocoding '${locationName}'` )
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&city=${encodeURIComponent( locationName )}&countrycodes=gb&layer=address&addressdetails=1`,
      { headers: { "User-Agent": "SwimmingResultsApp/1.0 (contact@swim.racing)" } }
    )
    if ( !response.ok ) {
      const text = await response.text()
      const headers: Record<string, string> = {}
      response.headers.forEach( ( value, key ) => { headers[key] = value } )
      console.error( `Nominatim request failed for '${locationName}': ${response.status} ${response.statusText}` )
      console.error( "Response headers:", headers )
      console.error( "Response body:", text )
      return undefined
    }
    const osmLocations = await response.json()
    if ( osmLocations && osmLocations.length > 0 ) {
      osmLocations.sort( ( a: { importance: number }, b: { importance: number } ) => Number( b.importance ) - Number( a.importance ) )
      const osmLocation = osmLocations[0]
      location = {
        locationId: Number( osmLocation.place_id ),
        locationName: osmLocation.name,
        locationDescription: osmLocation.display_name,
        locationType: osmLocation.addresstype,
        latitude: Number( osmLocation.lat ),
        longitude: Number( osmLocation.lon )
      }
      if ( osmLocation.name !== locationName ) {
        await saveLocationAlias.run( { locationId: location.locationId, locationAlias: locationName } )
      }
      await saveLocation.run( location )
    }
  }
  return location
}
