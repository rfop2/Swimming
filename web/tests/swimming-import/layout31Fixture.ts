import { existsSync } from "node:fs"

const localCheshirePdf = String.raw`C:\Users\ange4\OneDrive\Documentos\Import files swimming app 2027\novos docs 2027\Cheshire County 2027 Consideration Times.pdf`
const wslCheshirePdf = "/mnt/c/Users/ange4/OneDrive/Documentos/Import files swimming app 2027/novos docs 2027/Cheshire County 2027 Consideration Times.pdf"

export const layout31PdfPath = [
  process.env.LAYOUT31_PDF_PATH,
  localCheshirePdf,
  wslCheshirePdf,
].find( candidate => candidate && existsSync( candidate ) )

export function requireLayout31PdfPath() {
  if ( !layout31PdfPath ) {
    throw new Error( "Set LAYOUT31_PDF_PATH to the Cheshire County 2027 PDF before running this test." )
  }
  return layout31PdfPath
}
