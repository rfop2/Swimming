import { existsSync } from "node:fs"

const localCumbria2027Pdf = String.raw`C:\Users\ange4\OneDrive\Documentos\Import files swimming app 2027\Cumbria 27-Qualifying-Times-FINAL-v2.pdf`
const wslCumbria2027Pdf = "/mnt/c/Users/ange4/OneDrive/Documentos/Import files swimming app 2027/Cumbria 27-Qualifying-Times-FINAL-v2.pdf"

export const layout23PdfPath = [
  process.env.LAYOUT23_PDF_PATH,
  localCumbria2027Pdf,
  wslCumbria2027Pdf,
].find( candidate => candidate && existsSync( candidate ) )

export function requireLayout23PdfPath() {
  if ( !layout23PdfPath ) {
    throw new Error( "Set LAYOUT23_PDF_PATH to the Cumbria 27-Qualifying-Times-FINAL-v2 PDF before running this test." )
  }
  return layout23PdfPath
}
