export default defineEventHandler( ( event ) => {
  return {
    user: event.context.user ?? null,
    impersonating: event.context.isImpersonating ?? false,
  }
} )
