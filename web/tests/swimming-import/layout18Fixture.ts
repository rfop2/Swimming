import { existsSync } from "node:fs"

const localWarwickshire2027Pdf = String.raw`C:\Users\ange4\OneDrive\Documentos\Sprint 5 import files\Warwickshire Swimming Qualifying Times 2027.pdf`
const wslWarwickshire2027Pdf = "/mnt/c/Users/ange4/OneDrive/Documentos/Sprint 5 import files/Warwickshire Swimming Qualifying Times 2027.pdf"

export const layout18PdfPath = [
  process.env.LAYOUT18_PDF_PATH,
  localWarwickshire2027Pdf,
  wslWarwickshire2027Pdf,
].find( candidate => candidate && existsSync( candidate ) )

export function requireLayout18PdfPath() {
  if ( !layout18PdfPath ) {
    throw new Error(
      "Set LAYOUT18_PDF_PATH to the Warwickshire Swimming Qualifying Times 2027 PDF before running this test."
    )
  }
  return layout18PdfPath
}
