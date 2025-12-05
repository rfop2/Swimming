import type { Swimmer } from "lib"

export const hasSwimmer = ( s: Ref<Swimmer> ): s is Ref<Swimmer> & { value: NonNullable<typeof s.value> } => s.value != null && s.value !== undefined
