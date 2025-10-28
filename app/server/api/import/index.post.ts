import { parseSwimmingPdf, parseSwimmingPdfLayout10, parseSwimmingPdfLayout11,
  parseSwimmingPdfLayout12, parseSwimmingPdfLayout13, parseSwimmingPdfLayout2,
  parseSwimmingPdfLayout3, parseSwimmingPdfLayout4, parseSwimmingPdfLayout5,
  parseSwimmingPdfLayout6, parseSwimmingPdfLayout7, parseSwimmingPdfLayout8,
  parseSwimmingPdfLayout9, parseSwimmingXlsx }
  from "../../utils/parseSwimmingDocs"

import { readMultipartFormData, readBody } from "h3"
import pdf from "pdf-parse/lib/pdf-parse.js"

export default defineEventHandler( async ( event ) => {
  const parts = await readMultipartFormData( event )

  const layoutField = parts.find( f => f.name === "layout" )
  const selectedLayout = layoutField?.data?.toString() || "layout1"

  const fileField = parts.find( f => f.name === "pdf_file" )
  if ( !fileField ) throw createError( { statusCode: 400, statusMessage: "No file uploaded" } )

  const buffer = fileField.data
  let structured

  if ( fileField.filename.toLowerCase().endsWith( ".pdf" ) ) {
    const data = await pdf( buffer )
    if ( selectedLayout === "layout1" ) structured = parseSwimmingPdf( data.text )
    else if ( selectedLayout === "layout2" ) structured = parseSwimmingPdfLayout2( data.text )
    else if ( selectedLayout === "layout3" ) structured = parseSwimmingPdfLayout3( data.text )
    else if ( selectedLayout === "layout4" ) structured = parseSwimmingPdfLayout4( data.text )
    else if ( selectedLayout === "layout5" ) structured = parseSwimmingPdfLayout5( data.text )
    else if ( selectedLayout === "layout6" ) structured = parseSwimmingPdfLayout6( data.text )
    else if ( selectedLayout === "layout7" ) structured = parseSwimmingPdfLayout7( data.text )
    else if ( selectedLayout === "layout8" ) structured = parseSwimmingPdfLayout8( data.text )
    else if ( selectedLayout === "layout9" ) structured = parseSwimmingPdfLayout9( data.text )
    else if ( selectedLayout === "layout10" ) structured = parseSwimmingPdfLayout10( data.text )
    else if ( selectedLayout === "layout11" ) structured = parseSwimmingPdfLayout11( data.text )
    else if ( selectedLayout === "layout12" ) structured = parseSwimmingPdfLayout12( data.text )
    else if ( selectedLayout === "layout13" ) structured = parseSwimmingPdfLayout13( data.text )
  } else if ( fileField.filename.toLowerCase().endsWith( ".xlsx" ) ) {
    structured = parseSwimmingXlsx( buffer, selectedLayout )
  } else {
    throw createError( { statusCode: 400, statusMessage: "Unsupported file type" } )
  }

  return { structured }
} )
