import { parseSwimmingPdf, parseSwimmingPdfLayout2, parseSwimmingPdfLayout3, parseSwimmingXlsx } from '../../utils/parseSwimmingDocs'

import { readMultipartFormData, readBody } from 'h3'
import pdf from 'pdf-parse/lib/pdf-parse.js';


export default defineEventHandler(async (event) => {
  const parts = await readMultipartFormData(event)

  const layoutField = parts.find(f => f.name === 'layout')
  const selectedLayout = layoutField?.data?.toString() || 'layout1'

  const fileField = parts.find(f => f.name === 'pdf_file')
  if (!fileField) throw createError({ statusCode: 400, statusMessage: 'No file uploaded' })

  const buffer = fileField.data
  let structured

  if (fileField.filename.toLowerCase().endsWith('.pdf')) {
    const data = await pdf(buffer)
    if (selectedLayout === 'layout1') structured = parseSwimmingPdf(data.text)
    else if (selectedLayout === 'layout2') structured = parseSwimmingPdfLayout2(data.text)
    else if (selectedLayout === 'layout3') structured = parseSwimmingPdfLayout3(data.text)
  } else if (fileField.filename.toLowerCase().endsWith('.xlsx')) {
    structured = parseSwimmingXlsx(buffer, selectedLayout)
  } else {
    throw createError({ statusCode: 400, statusMessage: 'Unsupported file type' })
  }

  return { structured }
})
