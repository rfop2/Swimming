import { getPool, prepareStatement } from "lib"
import type { User } from "lucia"

interface ExtUser extends User {
  clubs: string
  lastLogin: Date
  loginCount: number
  swimmerCount: number
  subscriptionTier: string
  subscriptionStatus: string
}

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) {
    throw createError( {
      status: 401
    } )
  }

  const userId = getRouterParam( event, "id" )
  if ( userId && !Number( event.context.user.admin ) ) {
    throw createError( {
      status: 403
    } )
  }

  const ignoreIPs = ( process.env.IGNORE_IPS ?? "" ).split( /\s*,\s*/ )
  const ipParams: Record<string, string> = {}
  const ipPlaceholders = ignoreIPs
    .map( ( ip, i ) => {
      const key = `ip_${i}`
      ipParams[key] = ip
      return `:${key}`
    } )
    .join( ", " ) || "''" // fallback if array is empty

  const selectRecords = prepareStatement<Record<string, string>, ExtUser>(
    await getPool(),
    `SELECT
      u.id,
      u.username,
      u.firstName,
      u.lastName,
      u.phone,
      u.location,
      u.type,
      GROUP_CONCAT(
          CONCAT(IF(uc.ClubOwner, '*', ''), c.ClubName) SEPARATOR ','
      ) AS clubs,
      st.lastLogin,
      st.loginCount,
      sw.swimmerCount,
      COALESCE( stier.name, 'Free' ) AS subscriptionTier,
      COALESCE( usub.status, 'active' ) AS subscriptionStatus,
      u.admin,
      u.created,
      u.updated
    FROM
      User u
      LEFT JOIN (
          SELECT
              userId,
              MAX(actionTime) AS lastLogin,
              COUNT(sessionId) AS loginCount
          FROM
              SessionTracking
          WHERE
              sessionAction = 'login'
              AND sessionIP NOT IN (${ipPlaceholders})
          GROUP BY
              userId
      ) AS st ON st.userId = u.id
      LEFT JOIN (
          SELECT
              userId,
              COUNT(swimmerId) AS swimmerCount
          FROM
              UserSwimmers
          GROUP BY
              userId
      ) AS sw ON sw.userId = u.id
      LEFT JOIN UserClubs uc ON u.id = uc.userId
      LEFT JOIN Clubs c ON uc.clubId = c.clubId
      LEFT JOIN UserSubscription usub ON usub.userId = u.id
      LEFT JOIN SubscriptionTiers stier ON stier.id = usub.tier
    GROUP BY
      u.id`
  )
  const data = await selectRecords.all( ipParams )
  return data
} )
