type PdfParseResultObject = {
  text?: string
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

const hasText = ( value: unknown ): value is PdfParseResultObject =>
  typeof value === "object" && value !== null && "text" in value

export async function extractPdfText( data: ArrayBuffer | Buffer ): Promise<string> {
  const workerModule = await import( "pdf-parse/worker" )
  const pdfParseModule = await import( "pdf-parse" )

  const { CanvasFactory, getData } = workerModule as unknown as WorkerModuleShape
  const { PDFParse } = pdfParseModule as unknown as PdfParseModuleShape

  if ( typeof PDFParse !== "function" ) {
    throw new Error( "PDF parser not available" )
  }

  if ( typeof PDFParse.setWorker === "function" && typeof getData === "function" ) {
    PDFParse.setWorker( getData() )
  }

  const parser = new PDFParse( { data, CanvasFactory } )
  const result = await parser.getText()

  if ( typeof result === "string" ) return result
  if ( hasText( result ) && typeof result.text === "string" ) return result.text
  return ""
}
