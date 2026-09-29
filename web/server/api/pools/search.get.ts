import { getPool, prepareStatement, type PoolRecord } from "lib"

type PoolSummary = Pick<PoolRecord, "poolId" | "poolName" | "poolTown" | "poolPostCode">

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) {
    throw createError( {
      status: 401
    } )
  }

  const query = getQuery( event )

  if ( query.id ) {
    const selectRecord = prepareStatement<{ poolId: number }, PoolSummary>(
      await getPool(),
      "SELECT poolId, poolName, poolTown, poolPostCode FROM Pools WHERE poolId = :poolId"
    )
    const record = await selectRecord.get( { poolId: Number( query.id ) } )
    return record ? [ record ] : []
  }

  const search = String( query.search ?? "" ).trim()
  if ( !search ) return []

  const selectRecords = prepareStatement<{ searchPattern: string }, PoolSummary>(
    await getPool(),
    "SELECT poolId, poolName, poolTown, poolPostCode FROM Pools WHERE poolName LIKE :searchPattern OR poolTown LIKE :searchPattern ORDER BY poolName ASC LIMIT 20"
  )
  return await selectRecords.all( { searchPattern: `%${search}%` } )
} )
