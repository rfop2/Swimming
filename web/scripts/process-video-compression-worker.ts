import { claimNextQueuedVideo, pool, processVideo, sleep } from "./video-compression-core"

const main = async () => {
  console.log( "[video-compression-worker] started" )

  while ( true ) {
    try {
      const videoId = await claimNextQueuedVideo()

      if ( !videoId ) {
        await sleep( 5000 )
        continue
      }

      console.log( "[video-compression-worker] claimed", { videoId } )
      await processVideo( videoId )
    } catch ( error ) {
      console.error( "[video-compression-worker] error", error )
      await sleep( 5000 )
    }
  }
}

main().catch( async error => {
  console.error( error )
  await pool.end()
  process.exit( 1 )
} )