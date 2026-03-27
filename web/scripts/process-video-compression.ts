import { pool, processVideo } from "./video-compression-core"

const main = async () => {
  const videoId = process.argv[2]

  if ( !videoId ) {
    throw new Error( "Missing videoId" )
  }

  await processVideo( videoId )
  await pool.end()
}

main().catch( error => {
  console.error( error )
  process.exit( 1 )
} )