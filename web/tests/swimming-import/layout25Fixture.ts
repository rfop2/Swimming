import { existsSync } from "node:fs"

const localSouthWestPdf = String.raw`C:\Users\ange4\OneDrive\Documentos\Import files swimming app 2027\novos docs 2027\South West QT.pdf`
const wslSouthWestPdf = "/mnt/c/Users/ange4/OneDrive/Documentos/Import files swimming app 2027/novos docs 2027/South West QT.pdf"

export const layout25PdfPath = [
  process.env.LAYOUT25_PDF_PATH,
  localSouthWestPdf,
  wslSouthWestPdf,
].find( candidate => candidate && existsSync( candidate ) )

export function requireLayout25PdfPath() {
  if ( !layout25PdfPath ) {
    throw new Error( "Set LAYOUT25_PDF_PATH to the South West QT PDF before running this test." )
  }
  return layout25PdfPath
}
