import { Lucia } from "lucia"
import type { H3Event } from "h3"
import { createPool } from "mysql2/promise"
import { Mysql2Adapter } from "@lucia-auth/adapter-mysql"
import type { DatabaseUser } from "lib"

const pool = createPool( {
  host: process.env.MARIADB_HOST ?? ( process.env.NODE_ENV === "production" ? "db" : "192.168.45.2" ),
  user: process.env.MARIADB_USER,
  password: process.env.MARIADB_PASSWORD,
  database: process.env.MARIADB_DATABASE,
  namedPlaceholders: false, // allows :param style
} )

const adapter = new Mysql2Adapter( pool, {
  user: "User",
  session: "Session"
} )

export const lucia = new Lucia( adapter, {
  sessionCookie: {
    attributes: {
      secure: !import.meta.dev
    }
  },
  getUserAttributes: ( attributes ) => {
    return {
      username: attributes.username,
      firstName: attributes.firstName,
      lastName: attributes.lastName,
      phone: attributes.phone,
      type: attributes.type,
      admin: attributes.admin,
      location: attributes.location,
      locationId: attributes.locationId,
      created: attributes.created,
    }
  }
} )

declare module "lucia" {
  interface Register {
    Lucia: typeof lucia
    DatabaseUserAttributes: Omit<DatabaseUser, "id">
  }
}

export const validateRequest = async ( event: H3Event ) => {
  const sessionId = getCookie( event, lucia.sessionCookieName )
  if ( !sessionId ) return { user: null, session: null, impersonating: false }

  const { session, user } = await lucia.validateSession( sessionId )
  if ( !session || !user ) return { user: null, session: null, impersonating: false }

  const adminSessionId = getCookie( event, "admin_session" )
  const impersonating = !!adminSessionId

  return { user, session, impersonating }
}
