export default defineNuxtPlugin( () => {
  addRouteMiddleware( ( to, _from ) => {
    console.log( "Middleware", to )
    if ( to.path === "/" ) {
      return navigateTo( "/performance", { replace: true } )
    }
  } )
} )
