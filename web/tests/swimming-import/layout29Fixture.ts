import { existsSync } from "node:fs"

const localCornwallPdf = String.raw`C:\Users\ange4\OneDrive\Documentos\Import files swimming app 2027\novos docs 2027\Cornwall-County-Champs-2027-QTs_V2.1_30082026.pdf`
const wslCornwallPdf = "/mnt/c/Users/ange4/OneDrive/Documentos/Import files swimming app 2027/novos docs 2027/Cornwall-County-Champs-2027-QTs_V2.1_30082026.pdf"

export const layout29PdfPath = [
  process.env.LAYOUT29_PDF_PATH,
  localCornwallPdf,
  wslCornwallPdf,
].find( candidate => candidate && existsSync( candidate ) )

export function requireLayout29PdfPath() {
  if ( !layout29PdfPath ) {
    throw new Error( "Set LAYOUT29_PDF_PATH to the Cornwall County Champs 2027 PDF before running this test." )
  }
  return layout29PdfPath
}
