// Some parsers do not include a course because it is selected by the user.
export interface ImportEvent {
  gender: "male" | "female" | null
  age: string | number
  course?: "lc" | "sc" | null
  distance: string
  stroke: string | null
  event: string
  time: string | null
}
