import {
  parseSwimmingPdf,
  parseSwimmingPdfLayout10,
  parseSwimmingPdfLayout11,
  parseSwimmingPdfLayout12,
  parseSwimmingPdfLayout13,
  parseSwimmingPdfLayout2,
  parseSwimmingPdfLayout3,
  parseSwimmingPdfLayout4,
  parseSwimmingPdfLayout5,
  parseSwimmingPdfLayout6,
  parseSwimmingPdfLayout7,
  parseSwimmingPdfLayout8,
  parseSwimmingPdfLayout9,
  parseSwimmingXlsx
} from "../../utils/parseSwimmingDocs"
import { readMultipartFormData } from "h3"

type PdfParseResultObject = {
  text?: string
}

const isPdfParseResultObject = ( value: unknown ): value is PdfParseResultObject => {
  return typeof value === "object" && value !== null && "text" in value
}

type WorkerModuleShape = {
  CanvasFactory?: unknown
  getData?: () => unknown
}

type PDFParseInstance = {
  getText: () => Promise<unknown>
}

type PDFParseConstructor = {
  new ( options: { data: ArrayBuffer | Buffer, CanvasFactory?: unknown } ): PDFParseInstance
  setWorker?: ( worker: unknown ) => void
}

type PdfParseModuleShape = {
  PDFParse?: PDFParseConstructor
}

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
    const workerMod = await import( "pdf-parse/worker" )
    const pdfParseMod = await import( "pdf-parse" )

    const { CanvasFactory, getData } = workerMod as unknown as WorkerModuleShape
    const { PDFParse } = pdfParseMod as unknown as PdfParseModuleShape

    if ( typeof PDFParse !== "function" ) {
      throw createError( { statusCode: 500, statusMessage: "PDF parser not available" } )
    }

    if ( typeof PDFParse.setWorker === "function" && typeof getData === "function" ) {
      PDFParse.setWorker( getData() )
    }

    const parser = new PDFParse( { data: buffer, CanvasFactory } )
    const result = await parser.getText()

    let text = ""
    if ( typeof result === "string" ) {
      text = result
    } else if ( isPdfParseResultObject( result ) && typeof result.text === "string" ) {
      text = result.text
    }

    if ( selectedLayout === "layout1" ) structured = parseSwimmingPdf( text )
    else if ( selectedLayout === "layout2" ) structured = parseSwimmingPdfLayout2( text )
    else if ( selectedLayout === "layout3" ) structured = parseSwimmingPdfLayout3( text )
    else if ( selectedLayout === "layout4" ) structured = parseSwimmingPdfLayout4( text )
    else if ( selectedLayout === "layout5" ) structured = parseSwimmingPdfLayout5( text )
    else if ( selectedLayout === "layout6" ) structured = parseSwimmingPdfLayout6( text )
    else if ( selectedLayout === "layout7" ) structured = parseSwimmingPdfLayout7( text )
    else if ( selectedLayout === "layout8" ) structured = parseSwimmingPdfLayout8( text )
    else if ( selectedLayout === "layout9" ) structured = parseSwimmingPdfLayout9( text )
    else if ( selectedLayout === "layout10" ) structured = parseSwimmingPdfLayout10( text )
    else if ( selectedLayout === "layout11" ) structured = parseSwimmingPdfLayout11( text )
    else if ( selectedLayout === "layout12" ) structured = parseSwimmingPdfLayout12( text )
    else if ( selectedLayout === "layout13" ) structured = parseSwimmingPdfLayout13( text )
  } else if ( fileField.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ) {
    structured = parseSwimmingXlsx( buffer )
  } else {
    throw createError( { statusCode: 400, statusMessage: "Unsupported file type" } )
  }

  return { structured }
} )
