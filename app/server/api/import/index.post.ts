import { parseSwimmingPdf, parseSwimmingPdfLayout2, parseSwimmingPdfLayout3 } from '../../utils/swimming'

import { readMultipartFormData, readBody } from 'h3'
import pdf from 'pdf-parse/lib/pdf-parse.js';


export default defineEventHandler(async (event) => {
  // read all form fields (files + extra fields) from multipart/form-data
  const parts = await readMultipartFormData(event)

  // get the layout field
  const layoutField = parts.find(f => f.name === 'layout')
  const selectedLayout = layoutField?.data?.toString() || 'layout1'

  // get the uploaded PDF file
  const fileField = parts.find(f => f.name === 'pdf_file')
  if (!fileField) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No file uploaded'
    })
  }

  const buffer = fileField.data
  const data = await pdf(buffer)

  let structured
  if (selectedLayout === 'layout1') structured = parseSwimmingPdf(data.text)
  else if (selectedLayout === 'layout2') structured = parseSwimmingPdfLayout2(data.text)
  else if (selectedLayout === 'layout3') structured = parseSwimmingPdfLayout3(data.text)


  if (selectedLayout === 'layout1') {
    structured = parseSwimmingPdf(data.text)
  } else if (selectedLayout === 'layout2') {
    structured = parseSwimmingPdfLayout2(data.text)
  } else if (selectedLayout === 'layout3') {
    structured = parseSwimmingPdfLayout3(data.text)
  }

  return { structured }
})
