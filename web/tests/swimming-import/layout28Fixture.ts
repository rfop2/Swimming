import { existsSync } from "node:fs"

const localStaffordshirePdf = String.raw`C:\Users\ange4\OneDrive\Documentos\Import files swimming app 2027\novos docs 2027\Staffordshire QT_2027_15Sep26.pdf`
const wslStaffordshirePdf = "/mnt/c/Users/ange4/OneDrive/Documentos/Import files swimming app 2027/novos docs 2027/Staffordshire QT_2027_15Sep26.pdf"

export const layout28PdfPath = [
  process.env.LAYOUT28_PDF_PATH,
  localStaffordshirePdf,
  wslStaffordshirePdf,
].find( candidate => candidate && existsSync( candidate ) )

export function requireLayout28PdfPath() {
  if ( !layout28PdfPath ) {
    throw new Error( "Set LAYOUT28_PDF_PATH to the Staffordshire QT 2027 PDF before running this test." )
  }
  return layout28PdfPath
}
