import { getPdfParser } from "../../utils/swimming-import/parsers/registry"
import { getXlsxParser } from "../../utils/swimming-import/parsers/xlsx/registry"
import { extractPdfText } from "../../utils/swimming-import/pdf/extractPdfText"
import { readMultipartFormData } from "h3"

export default defineEventHandler( async ( event ) => {
  const parts = await readMultipartFormData( event )
  if ( !parts ) {
    throw createError( {
      message: "No data received",
      status: 400,
    } )
  }

  const layoutField = parts.find( f => f.name === "layout" )
  const selectedLayout = layoutField?.data?.toString() || "layout1"

  const fileField = parts.find( f => f.name === "pdf_file" )
  if ( !fileField ) {
    throw createError( { statusCode: 400, statusMessage: "No file uploaded" } )
  }

  const buffer = fileField.data
  let structured

  if ( fileField.type === "application/pdf" ) {
    const text = await extractPdfText( buffer )
    const parser = getPdfParser( selectedLayout )
    if ( !parser ) {
      throw createError( { statusCode: 400, message: `Unsupported PDF layout: ${selectedLayout}` } )
    }
    structured = parser( text )
  } else if ( fileField.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ) {
    const parser = getXlsxParser( selectedLayout )
    if ( !parser ) {
      throw createError( { statusCode: 400, message: `Unsupported XLSX layout: ${selectedLayout}` } )
    }
    structured = parser( buffer )
  } else {
    throw createError( { statusCode: 400, statusMessage: "Unsupported file type" } )
  }

  return { structured }
} )
