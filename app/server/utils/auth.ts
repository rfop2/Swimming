import { Lucia } from "lucia"
import { DrizzleMySQLAdapter } from "@lucia-auth/adapter-drizzle"
import { db, session, user } from "lib"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const adapter = new DrizzleMySQLAdapter( db as any, session as any, user as any )

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
