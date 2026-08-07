import { existsSync } from "node:fs"

const localNorthamptonshire2027Pdf = String.raw`C:\Users\ange4\OneDrive\Documentos\Sprint 5 import files\Northamptonshire ASA - County 2027 Times.pdf`
const wslNorthamptonshire2027Pdf = "/mnt/c/Users/ange4/OneDrive/Documentos/Sprint 5 import files/Northamptonshire ASA - County 2027 Times.pdf"

export const layout21PdfPath = [
  process.env.LAYOUT21_PDF_PATH,
  localNorthamptonshire2027Pdf,
  wslNorthamptonshire2027Pdf,
].find( candidate => candidate && existsSync( candidate ) )

export function requireLayout21PdfPath() {
  if ( !layout21PdfPath ) {
    throw new Error( "Set LAYOUT21_PDF_PATH to the Northamptonshire ASA - County 2027 Times PDF before running this test." )
  }
  return layout21PdfPath
}
