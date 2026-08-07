import { existsSync } from "node:fs"

const localNorfolk2027Pdf = String.raw`C:\Users\ange4\OneDrive\Documentos\Sprint 5 import files\Norfolk Swimming Qualifying Times 2027.pdf`
const wslNorfolk2027Pdf = "/mnt/c/Users/ange4/OneDrive/Documentos/Sprint 5 import files/Norfolk Swimming Qualifying Times 2027.pdf"

export const layout14PdfPath = [
  process.env.LAYOUT14_PDF_PATH,
  localNorfolk2027Pdf,
  wslNorfolk2027Pdf,
].find( ( candidate ): candidate is string => !!candidate && existsSync( candidate ) )

export function requireLayout14PdfPath(): string {
  if ( !layout14PdfPath ) {
    throw new Error(
      "Set LAYOUT14_PDF_PATH to the Norfolk Swimming Qualifying Times 2027 PDF before running this test."
    )
  }
  return layout14PdfPath
}
