export class Timer {
  private startTime: [number, number] | null = null
  private elapsedMs: number = 0
  private running: boolean = false
  private lastLap: [number, number] | null = null

  start(): void {
    if ( this.running ) return
    this.startTime = process.hrtime()
    this.lastLap = this.startTime
    this.running = true
  }

  stop(): void {
    if ( !this.running || this.startTime === null ) return
    const diff = process.hrtime( this.startTime )
    this.elapsedMs += diff[0] * 1_000 + diff[1] / 1e6 // convert to ms
    this.running = false
  }

  reset(): void {
    this.startTime = null
    this.elapsedMs = 0
    this.running = false
    this.lastLap = null
  }

  resume(): void {
    if ( this.running ) return
    this.startTime = process.hrtime()
    this.lastLap = this.startTime
    this.running = true
  }

  lap(): number {
    if ( !this.running || this.lastLap === null ) {
      throw new Error( "Timer must be running to record a lap" )
    }
    const diff = process.hrtime( this.lastLap )
    const lapMs = diff[0] * 1000 + diff[1] / 1e6
    this.lastLap = process.hrtime()
    return lapMs / 1000 // return in seconds
  }

  elapsedSeconds(): number {
    let totalMs = this.elapsedMs
    if ( this.running && this.startTime !== null ) {
      const diff = process.hrtime( this.startTime )
      totalMs += diff[0] * 1000 + diff[1] / 1e6
    }
    return totalMs / 1000 // return in seconds
  }
}
