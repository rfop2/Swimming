import { onBeforeRouteLeave } from "vue-router"

export function useUnsavedWarning( isDirty: () => boolean ) {
  // In-app navigation
  onBeforeRouteLeave( ( _to, _from, next ) => {
    if ( isDirty() ) {
      const leave = confirm( "You have unsaved changes. Do you really want to leave?" )
      if ( !leave ) return next( false )
    }
    next()
  } )

  // Browser unload
  const handleBeforeUnload = ( e: BeforeUnloadEvent ) => {
    if ( isDirty() ) {
      e.preventDefault()
    }
  }

  onMounted( () => {
    window.addEventListener( "beforeunload", handleBeforeUnload )
  } )

  onBeforeUnmount( () => {
    window.removeEventListener( "beforeunload", handleBeforeUnload )
  } )
}
