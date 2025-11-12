import {
  parseSwimmingPdf,
  parseSwimmingPdfLayout10,
  parseSwimmingPdfLayout11,
  parseSwimmingPdfLayout12,
  parseSwimmingPdfLayout13,
  parseSwimmingPdfLayout2,
  parseSwimmingPdfLayout3,
  parseSwimmingPdfLayout4,
  parseSwimmingPdfLayout5,
  parseSwimmingPdfLayout6,
  parseSwimmingPdfLayout7,
  parseSwimmingPdfLayout8,
  parseSwimmingPdfLayout9,
  parseSwimmingXlsx
} from "../../utils/parseSwimmingDocs"
import { readMultipartFormData } from "h3"

export default defineEventHandler(async (event) => {
  const parts = await readMultipartFormData(event)

  const layoutField = parts.find(f => f.name === "layout")
  const selectedLayout = layoutField?.data?.toString() || "layout1"

  const fileField = parts.find(f => f.name === "pdf_file")
  if (!fileField) {
    throw createError({ statusCode: 400, statusMessage: "No file uploaded" })
  }

  const buffer = fileField.data
  let structured

  if (fileField.filename.toLowerCase().endsWith(".pdf")) {
    // 🔹 garante que pdfjs e o worker entram no bundle do Nitro
    await import("pdfjs-dist/legacy/build/pdf.worker.mjs")
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs")

    const pdfParseMod = await import("pdf-parse")
    const PDFParse = (pdfParseMod as any).PDFParse || (pdfParseMod as any).default?.PDFParse
    if (typeof PDFParse !== "function") {
      throw createError({ statusCode: 500, statusMessage: "PDF parser not available" })
    }

    // algumas versões aceitam injeção do pdfjs
    const parser = new PDFParse({ data: buffer, pdfjs })
    const result = await parser.getText()
    const text = typeof result === "string" ? result : (result as any).text ?? ""

    if (selectedLayout === "layout1") structured = parseSwimmingPdf(text)
    else if (selectedLayout === "layout2") structured = parseSwimmingPdfLayout2(text)
    else if (selectedLayout === "layout3") structured = parseSwimmingPdfLayout3(text)
    else if (selectedLayout === "layout4") structured = parseSwimmingPdfLayout4(text)
    else if (selectedLayout === "layout5") structured = parseSwimmingPdfLayout5(text)
    else if (selectedLayout === "layout6") structured = parseSwimmingPdfLayout6(text)
    else if (selectedLayout === "layout7") structured = parseSwimmingPdfLayout7(text)
    else if (selectedLayout === "layout8") structured = parseSwimmingPdfLayout8(text)
    else if (selectedLayout === "layout9") structured = parseSwimmingPdfLayout9(text)
    else if (selectedLayout === "layout10") structured = parseSwimmingPdfLayout10(text)
    else if (selectedLayout === "layout11") structured = parseSwimmingPdfLayout11(text)
    else if (selectedLayout === "layout12") structured = parseSwimmingPdfLayout12(text)
    else if (selectedLayout === "layout13") structured = parseSwimmingPdfLayout13(text)

  } else if (fileField.filename.toLowerCase().endsWith(".xlsx")) {
    structured = parseSwimmingXlsx(buffer, selectedLayout)
  } else {
    throw createError({ statusCode: 400, statusMessage: "Unsupported file type" })
  }

  return { structured }
})
