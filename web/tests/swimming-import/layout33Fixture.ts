import { existsSync } from "node:fs"

const localEssexPdf = String.raw`C:\Users\ange4\OneDrive\Documentos\Import files swimming app 2027\novos docs 2027\Essex QT Times 2027.pdf`
const wslEssexPdf = "/mnt/c/Users/ange4/OneDrive/Documentos/Import files swimming app 2027/novos docs 2027/Essex QT Times 2027.pdf"

export const layout33PdfPath = [
  process.env.LAYOUT33_PDF_PATH,
  localEssexPdf,
  wslEssexPdf,
].find( candidate => candidate && existsSync( candidate ) )

export function requireLayout33PdfPath() {
  if ( !layout33PdfPath ) {
    throw new Error( "Set LAYOUT33_PDF_PATH to the Essex 2027 PDF before running this test." )
  }
  return layout33PdfPath
}
