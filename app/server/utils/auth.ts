import { Lucia } from "lucia"
import { BetterSqlite3Adapter } from "@lucia-auth/adapter-sqlite"
import { db } from "./db"

import type { DatabaseUser } from "./db"

const adapter = new BetterSqlite3Adapter( db, {
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
    }
  }
} )

declare module "lucia" {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: Omit<DatabaseUser, "id">;
  }
}
