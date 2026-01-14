export const useFeedback = () => {
  let audioCtx: AudioContext | null = null

  const isIOS =
    typeof navigator !== "undefined" &&
    /iPad|iPhone|iPod/.test( navigator.userAgent )

  /* -----------------------------
   * Audio (iOS)
   * ----------------------------- */

  const initAudio = () => {
    if ( !isIOS ) return
    if ( audioCtx ) return

    try {
      audioCtx = new AudioContext()
    } catch {
      audioCtx = null
    }
  }

  const playClick = () => {
    if ( !audioCtx ) return

    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()

    osc.type = "square"
    osc.frequency.value = 1200 // sharp, click-like

    gain.gain.value = 0.05 // quiet but audible

    osc.connect( gain )
    gain.connect( audioCtx.destination )

    osc.start()
    osc.stop( audioCtx.currentTime + 0.015 ) // ~15ms
  }

  /* -----------------------------
   * Haptics (Android)
   * ----------------------------- */

  const hapticTap = () => {
    if ( !( "vibrate" in navigator ) ) return
    navigator.vibrate( 8 )
  }

  const hapticStrong = () => {
    if ( !( "vibrate" in navigator ) ) return
    navigator.vibrate( [ 12, 8, 12 ] )
  }

  /* -----------------------------
   * Public API
   * ----------------------------- */

  const tap = () => {
    if ( isIOS ) {
      playClick()
    } else {
      hapticTap()
    }
  }

  const strong = () => {
    if ( isIOS ) {
      playClick()
    } else {
      hapticStrong()
    }
  }

  return {
    initAudio,
    tap,
    strong,
  }
}
