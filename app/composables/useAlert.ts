export type AlertType = "success" | "warning" | "error" | "info"

export interface Alert {
  id: number
  message: string
  type: AlertType
}

const alerts = ref<Alert[]>( [] )
let counter = 0

export function showAlert( message: string, type: AlertType = "info", duration = 60_000 ) {
  const id = counter++
  alerts.value.push( { id, message, type } )

  // Auto-dismiss after duration
  if ( duration ) {
    setTimeout( () => dismissAlert( id ), duration )
  }
}

export function dismissAlert( id: number ) {
  const index = alerts.value.findIndex( a => a.id === id )
  if ( index !== -1 ) alerts.value.splice( index, 1 )
}

export function useAlert() {
  return { alerts, showAlert, dismissAlert }
}
