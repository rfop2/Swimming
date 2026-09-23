import { existsSync } from "node:fs"

const localLondonWinterPdf = String.raw`C:\Users\ange4\OneDrive\Documentos\Import files swimming app 2027\novos docs 2027\London Winter 26 champs QT and CT v0.1.pdf`
const wslLondonWinterPdf = "/mnt/c/Users/ange4/OneDrive/Documentos/Import files swimming app 2027/novos docs 2027/London Winter 26 champs QT and CT v0.1.pdf"

export const layout34PdfPath = [
  process.env.LAYOUT34_PDF_PATH,
  localLondonWinterPdf,
  wslLondonWinterPdf,
].find( candidate => candidate && existsSync( candidate ) )

export function requireLayout34PdfPath() {
  if ( !layout34PdfPath ) {
    throw new Error( "Set LAYOUT34_PDF_PATH to the London Winter 2026 PDF before running this test." )
  }
  return layout34PdfPath
}
