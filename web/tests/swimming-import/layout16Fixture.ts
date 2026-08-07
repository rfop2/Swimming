import { existsSync } from "node:fs"

const localLeicestershire2027Pdf = String.raw`C:\Users\ange4\OneDrive\Documentos\Sprint 5 import files\Leicestershire Swimming Qualifying Times 2027.pdf`
const wslLeicestershire2027Pdf = "/mnt/c/Users/ange4/OneDrive/Documentos/Sprint 5 import files/Leicestershire Swimming Qualifying Times 2027.pdf"

export const layout16PdfPath = [
  process.env.LAYOUT16_PDF_PATH,
  localLeicestershire2027Pdf,
  wslLeicestershire2027Pdf,
].find( candidate => candidate && existsSync( candidate ) )

export function requireLayout16PdfPath() {
  if ( !layout16PdfPath ) {
    throw new Error(
      "Set LAYOUT16_PDF_PATH to the Leicestershire Swimming Qualifying Times 2027 PDF before running this test."
    )
  }
  return layout16PdfPath
}
