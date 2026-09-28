import { existsSync } from "node:fs"

const localEastRegionPdf = String.raw`C:\Users\ange4\OneDrive\Documentos\Import files swimming app 2027\novos docs 2027\East Region.pdf`
const wslEastRegionPdf = "/mnt/c/Users/ange4/OneDrive/Documentos/Import files swimming app 2027/novos docs 2027/East Region.pdf"

export const layout32PdfPath = [
  process.env.LAYOUT32_PDF_PATH,
  localEastRegionPdf,
  wslEastRegionPdf,
].find( candidate => candidate && existsSync( candidate ) )

export function requireLayout32PdfPath() {
  if ( !layout32PdfPath ) {
    throw new Error( "Set LAYOUT32_PDF_PATH to the East Region 2026 PDF before running this test." )
  }
  return layout32PdfPath
}
