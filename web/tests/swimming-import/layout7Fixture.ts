import { existsSync } from "node:fs"

const localBerkshire2027Pdf = String.raw`C:\Users\ange4\OneDrive\Documentos\Sprint 5 import files\Berkshire & South Buckinghamshire.pdf`
const wslBerkshire2027Pdf = "/mnt/c/Users/ange4/OneDrive/Documentos/Sprint 5 import files/Berkshire & South Buckinghamshire.pdf"

export const layout7PdfPath = [
  process.env.LAYOUT7_PDF_PATH,
  localBerkshire2027Pdf,
  wslBerkshire2027Pdf,
].find( ( candidate ): candidate is string => !!candidate && existsSync( candidate ) )

export function requireLayout7PdfPath(): string {
  if ( !layout7PdfPath ) {
    throw new Error(
      "Set LAYOUT7_PDF_PATH to the Berkshire & South Buckinghamshire 2027 PDF before running this test."
    )
  }
  return layout7PdfPath
}
