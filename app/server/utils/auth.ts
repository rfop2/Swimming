import { Lucia } from "lucia"
import { createPool } from "mysql2/promise"
import { Mysql2Adapter } from "@lucia-auth/adapter-mysql"
import type { DatabaseUser} from "lib"

const pool = createPool( {
  host: process.env.NODE_ENV === "production" ? "db" : "192.168.45.2",
  user: "swimming",
  password: "gTM8FfPx6wQL",
  database: "swimming",
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
      type: attributes.type,
      admin: attributes.admin,
      location: attributes.location,
      created: attributes.created,
    }
  }
} )

declare module "lucia" {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: Omit<DatabaseUser, "id">;
  }
}
