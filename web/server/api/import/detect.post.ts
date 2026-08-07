import { readMultipartFormData } from "h3"
import { detectImportLayout } from "../../utils/swimming-import/detectLayout"
import { extractPdfText } from "../../utils/swimming-import/pdf/extractPdfText"
import * as XLSX from "xlsx"

function extractXlsxText( buffer: Buffer ) {
  const workbook = XLSX.read( buffer, { type: "buffer" } )
  return workbook.SheetNames.flatMap( sheetName => {
    const sheet = workbook.Sheets[sheetName]
    if ( !sheet ) return []
    const rows: unknown[][] = XLSX.utils.sheet_to_json( sheet, { header: 1, raw: false, defval: "" } )
    return rows.flatMap( row => row.map( value => String( value ?? "" ) ) )
  } ).join( " " )
}

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) {
    throw createError( { statusCode: 401, statusMessage: "Authentication required" } )
  }

  const parts = await readMultipartFormData( event )
  const file = parts?.find( part => part.name === "import_file" )
  if ( !file ) throw createError( { statusCode: 400, statusMessage: "No file uploaded" } )

  const fileName = file.filename ?? ""
  const isPdf = file.type === "application/pdf" || fileName.toLowerCase().endsWith( ".pdf" )
  const isXlsx = file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || fileName.toLowerCase().endsWith( ".xlsx" )

  if ( !isPdf && !isXlsx ) {
    throw createError( { statusCode: 400, statusMessage: "Unsupported file type" } )
  }

  const text = isPdf ? await extractPdfText( file.data ) : extractXlsxText( file.data )
  return detectImportLayout( text, fileName, isPdf ? "pdf" : "xlsx" )
} )
