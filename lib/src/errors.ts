// Formats any thrown value into a compact, storable string (e.g. for a
// varchar column). Plain Error objects serialize to '{}' via JSON.stringify
// (message/stack aren't enumerable), so this pulls name/message out directly.
export const formatErrorForStorage = ( error: unknown, maxLength = 240 ): string => {
  const text = error instanceof Error ? `${error.name}: ${error.message}` : String( error )
  return text.length > maxLength ? `${text.slice( 0, maxLength - 1 )}…` : text
}
