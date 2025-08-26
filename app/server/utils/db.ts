import sqlite from "better-sqlite3"
import { DB_PATH } from "lib"

export const db = sqlite( DB_PATH )

db.exec( `CREATE TABLE IF NOT EXISTS User (
  id TEXT NOT NULL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL
)` )

db.exec( `CREATE TABLE IF NOT EXISTS Session (
  id TEXT NOT NULL PRIMARY KEY,
  expires_at INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES User(id)
)` )

export interface DatabaseUser {
  id: string;
  username: string;
  password_hash: string;
  firstName: string;
  lastName: string;
  type: string;
  admin: boolean;
  location: string;
}
