import type { Swimmer } from "lib"

export const useSwimmer = () => {
  const swimmer = useState<Swimmer | undefined>( "swimmer", () => undefined )
  const { swimmers } = useSwimmers()

  // only initialize swimmer if it's not already set
  watch(
    swimmers,
    ( newSwimmers ) => {
      if ( !swimmer.value && newSwimmers.length ) {
        swimmer.value = newSwimmers[0]
      }
    },
    { immediate: true }
  )

  return swimmer
}
