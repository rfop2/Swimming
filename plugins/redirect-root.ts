export default defineNuxtPlugin( () => {
  addRouteMiddleware( ( to, _from ) => {
    if ( to.path === "/" ) {
      return navigateTo( "/performance", { replace: true } )
    }
  } )
} )
