export interface EmailTemplateOptions {
  title: string
  body: string
  actionLabel?: string
  actionUrl?: string
  accentColor?: string
  siteName?: string
  siteUrl?: string
}

/**
 * Creates both HTML and plain-text email content with optional branding footer.
 */
export function createEmailTemplate( {
  title,
  body,
  actionLabel = "Open",
  actionUrl,
  accentColor = "#2563eb",
  siteName = "",
  siteUrl = "",
}: EmailTemplateOptions ) {
  const footerBrand =
    siteName && siteUrl
      ? `© ${new Date().getFullYear()} ${siteName} — <a href="${siteUrl}" style="color:#6b7280; text-decoration:none;">${siteUrl.replace( /^https?:\/\//, "" )}</a>`
      : "This email was sent automatically. Please do not reply."

  const html = `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${title}</title>
    </head>
    <body style="margin:0; padding:0; background-color:#f9fafb; font-family:ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td align="center" style="padding: 40px 16px;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px; background:white; border-radius:0.75rem; overflow:hidden; box-shadow:0 1px 2px rgba(0,0,0,0.05);">
              <tr>
                <td style="background-color:${accentColor}; color:white; padding:20px 32px; font-size:20px; font-weight:600;">
                  ${title}
                </td>
              </tr>
              <tr>
                <td style="padding:32px; color:#111827; font-size:16px; line-height:1.5;">
                  ${body}
                </td>
              </tr>
              ${
                actionUrl
                  ? `<tr>
                      <td style="padding:0 32px 32px;">
                        <a href="${actionUrl}" style="display:inline-block; background-color:${accentColor}; color:white; text-decoration:none; padding:12px 24px; border-radius:0.5rem; font-weight:500;">
                          ${actionLabel}
                        </a>
                      </td>
                    </tr>`
                  : ""
              }
              <tr>
                <td style="padding:24px 32px; font-size:12px; color:#6b7280; border-top:1px solid #e5e7eb;">
                  ${footerBrand}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `

  const text = `
${title}

${body}

${actionUrl ? `→ ${actionLabel}: ${actionUrl}\n\n` : ""}${siteName && siteUrl ? `© ${new Date().getFullYear()} ${siteName} — ${siteUrl}` : "This email was sent automatically. Please do not reply."}
`

  return { html, text }
}
