import { existsSync } from "node:fs"

const localHertfordshire2027Pdf = String.raw`C:\Users\ange4\OneDrive\Documentos\Sprint 5 import files\Hertfordshire Swimming Qualifying Times 2027.pdf`
const wslHertfordshire2027Pdf = "/mnt/c/Users/ange4/OneDrive/Documentos/Sprint 5 import files/Hertfordshire Swimming Qualifying Times 2027.pdf"

export const layout20PdfPath = [
  process.env.LAYOUT20_PDF_PATH,
  localHertfordshire2027Pdf,
  wslHertfordshire2027Pdf,
].find( candidate => candidate && existsSync( candidate ) )

export function requireLayout20PdfPath() {
  if ( !layout20PdfPath ) {
    throw new Error( "Set LAYOUT20_PDF_PATH to the Hertfordshire Swimming Qualifying Times 2027 PDF before running this test." )
  }
  return layout20PdfPath
}
