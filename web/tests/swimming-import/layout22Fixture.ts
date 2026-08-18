import { existsSync } from "node:fs"

const localLancashire2027Pdf = String.raw`C:\Users\ange4\OneDrive\Documentos\Sprint 5 import files\Lancashire County Times 2027.pdf`
const wslLancashire2027Pdf = "/mnt/c/Users/ange4/OneDrive/Documentos/Sprint 5 import files/Lancashire County Times 2027.pdf"

export const layout22PdfPath = [
  process.env.LAYOUT22_PDF_PATH,
  localLancashire2027Pdf,
  wslLancashire2027Pdf,
].find( candidate => candidate && existsSync( candidate ) )

export function requireLayout22PdfPath() {
  if ( !layout22PdfPath ) {
    throw new Error( "Set LAYOUT22_PDF_PATH to the Lancashire County Times 2027 PDF before running this test." )
  }
  return layout22PdfPath
}
