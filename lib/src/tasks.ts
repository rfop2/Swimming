import type { Pool, PoolConnection } from "mysql2/promise"
import { prepareStatement } from "./database.js"
import type { Swimmer, SwimmerUpdateType } from "./types.js"

export const addSwimmerTask = async ( conn: Pool | PoolConnection, userId: string, swimmer: Swimmer, updateType: SwimmerUpdateType = "rankings" ) => {
  const addTask = prepareStatement(
    conn,
    `INSERT INTO Tasks (
        creatorId, taskType, taskOptions, taskDescription, targetType, targetId
      )
      SELECT
        :userId, :taskType, :taskOptions, :taskDescription, :targetType, :targetId
      WHERE EXISTS (
        SELECT 1 FROM Swimmers WHERE Swimmers.id = :targetId
      )`
  )
  console.log( "Adding task", swimmer, updateType )
  return await addTask.run( {
    userId,
    taskType: "update",
    taskOptions: JSON.stringify( { updateType } ),
    taskDescription: `Initial '${updateType}' update of swimmer '${swimmer.firstName} ${swimmer.lastName}'`,
    targetType: "swimmer",
    targetId: swimmer.id
  } )
}
