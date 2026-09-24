// Formats any thrown value into a storable string (e.g. for a text column).
// Plain Error objects serialize to '{}' via JSON.stringify (message/stack
// aren't enumerable), so this pulls the stack (which already includes the
// name and message as its first line) out directly, falling back to name +
// message alone if there's no stack. maxLength is a sanity cap, not a target.
export const formatErrorForStorage = ( error: unknown, maxLength = 4000 ): string => {
  let text: string
  if ( error instanceof Error ) {
    text = error.stack ?? `${error.name}: ${error.message}`
  } else {
    text = String( error )
  }
  return text.length > maxLength ? `${text.slice( 0, maxLength - 1 )}…` : text
}
