// import { db } from "~/server/utils/db"

// import type { DatabaseUser } from "~/server/utils/db"

export default eventHandler( async ( event ) => {
  const saveData = await readBody( event )
  console.log( saveData )
  /* const username = formData.get( "username" )
  if (
    typeof username !== "string" ||
    username.length < 3 ||
    username.length > 31 ||
    !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test( username )
  ) {
    throw createError( {
      message: "Invalid username",
      statusCode: 400
    } )
  } */
} )
