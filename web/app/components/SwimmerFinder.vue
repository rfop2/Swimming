<script setup lang="ts">
  import { NATIONALITY } from "lib"
  import type { UserClub, ExtSwimmer } from "lib"

  const model = defineModel<boolean>()

  const props = withDefaults( defineProps<{
    clubs: UserClub[]
    action: ( arg: Partial<ExtSwimmer> ) => void
  }>(), {
  } )

  const swimmerSearch = ref<string>( "" )

  const selectedSwimmer = ref<Partial<ExtSwimmer>>( {} )
  const swimmerOptions = ref<UISelection[]>( [] )
  const selectedOption: Ref<ExtSwimmer["id"]> = ref( "" )

  const parseTable = ( table: HTMLTableElement, style: "horizontal" | "vertical" = "horizontal" ): Array<Record<string, string>> => {
    // const rows = Array.from( table?.rows )
    const rows = Array.from( table.rows ).filter( row => {
      const firstCell = row.cells[0]
      const colspan = Number( firstCell?.getAttribute( "colspan" ) ?? "1" )
      return colspan === 1
    } )
    if ( style === "vertical" ) {
      return [ Object.fromEntries(
        rows.map( row => {
          const [ headerCell, valueCell ] = Array.from( row.cells )
          const key = headerCell?.textContent?.trim().toLocaleLowerCase().replace( /\s+/g, "_" ) ?? ""
          const value = valueCell?.textContent?.trim() ?? ""
          return [ key, value ]
        } )
      ) ]
    }
    const firstRow = rows.at( 0 )
    if ( !firstRow ) {
      return []
    }
    const headers = Array.from( firstRow.cells ).map( cell => cell.textContent.trim().toLocaleLowerCase().replace( /\s+/g, "_" ) ?? "" )
    return rows.slice( 1 ).map( row => {
      const cells = Array.from( row.cells )
      return Object.fromEntries(
        headers.map( ( header, i ) => [ header, cells[i]?.textContent?.trim() ?? "" ] )
      )
    } )
  }

  const lookupSwimmer = async () => {
    const searchValue = swimmerSearch.value.match( /^\d+$/ ) ? swimmerSearch.value : swimmerSearch.value.trim().split( /\s+/ ).pop()
    const url = `https://www.swimmingresults.org/biogs/biogs_details.php?tiref=${searchValue}`
    const doc = await useHtmlFetch( url )
    if ( doc ) {
      if ( swimmerSearch.value.match( /^\d+$/ ) ) {
        const tables = doc.querySelectorAll<HTMLTableElement>( "#outerWrapper > div:nth-child(2) > div.boxRepeat.rankingsContent > div > div:nth-child(1) > div > table" )
        if ( tables[0] ) {
          const personal = parseTable( tables[0], "vertical" )
          console.log( "Personal", personal )
          const details = personal.at( 0 )
          if ( details ) {
            if ( details.name ) {
              [ selectedSwimmer.value.firstName, selectedSwimmer.value.lastName ] = details.name.split( /\s+/ )
            }
            if ( details.eligibility_category ) {
              const gender = details.eligibility_category.toLocaleLowerCase()
              selectedSwimmer.value.gender = gender === "female" ? gender : "male"
            }
            if ( details.year_of_birth ) {
              selectedSwimmer.value.birthday = `${details.year_of_birth}-01-01`
            }
          }
        }
        if ( tables[1] ) {
          const membership = parseTable( tables[1], "vertical" )
          console.log( "Membership", membership )
          const details = membership.at( 0 )
          if ( details ) {
            if ( details.member_number ) {
              selectedSwimmer.value.id = details.member_number
            }
            if ( details.country_of_international_representation ) {
              const country = details.country_of_international_representation.toLocaleUpperCase()
              selectedSwimmer.value.nationality = NATIONALITY[country]
            }
            if ( details.ranked_club ) {
              const clubName = details.ranked_club
              const clubs = await $fetch( `/api/clubs/search?search=${encodeURIComponent( clubName )}` )
              const firstClub = clubs.at( 0 )
              if ( firstClub ) {
                selectedSwimmer.value.county = firstClub.clubCounty
                selectedSwimmer.value.region = firstClub.clubRegion
                selectedSwimmer.value.clubId = firstClub.clubId
              }
            }
          }
        }
        console.log( "Found swimmer", selectedSwimmer )
      } else {
        const table = doc.querySelector<HTMLTableElement>( "#rankTable" )
        if ( table ) {
          const data = parseTable( table )
          const nameWords = swimmerSearch.value.toLocaleLowerCase().trim().split( /\s+/ )
          const filteredData = data.filter( s => {
            if ( s ) {
              if ( !s.member ) return false
              if ( s.family_name && s.family_name.toLocaleLowerCase() === nameWords[nameWords.length - 1] ) return true
              if ( nameWords.length > 1 && ( ( s.given_name && s.given_name.toLocaleLowerCase() === nameWords[0] ) || ( s.known_as && s.known_as.toLocaleLowerCase() !== nameWords[0] ) ) ) return true
            }
            return false
          } )
          filteredData.sort( ( a, b ) => {
            const aInClub = props.clubs.find( club => club.clubName! === a.ranked_club || club.clubAlias! === a.ranked_club )
            const bInClub = props.clubs.find( club => club.clubName! === b.ranked_club || club.clubAlias! === b.ranked_club )
            if ( aInClub && !bInClub ) return -1
            if ( !aInClub && bInClub ) return 1
            const familyCompare = a.family_name && b.family_name ? a.family_name.localeCompare( b.family_name ) : 0
            if ( familyCompare !== 0 ) return familyCompare
            return a.given_name && b.given_name ? a.given_name.localeCompare( b.given_name ) : 0
          } )
          swimmerOptions.value = filteredData.map( s => ( { label: `${s.given_name} ${s.family_name} - ${s.eligibility_category} ${s.yob ? "(" + s.yob + ")" : ""}`, value: s.member ?? "no-id" } ) )
        }
      }
    }
  }

  watch( model, ( value ) => {
    if ( value ) {
      swimmerSearch.value = ""
      selectedSwimmer.value = {}
      swimmerOptions.value = []
    }
  } )
</script>

<template>
  <UI-Dialog
    v-model="model"
    title="Find a swimmer"
    confirm-label="Select"
    :action="() => action( selectedSwimmer )"
    :confirm-enabled="() => !!selectedSwimmer.id"
  >
    <div class="px-3 py-5 sm:p-3">
      <div class="mt-2 max-w-xl text-sm text-gray-500">
        <p>Enter a swimmer id or name to search for details.<br>Name searches will return matches for your selected club first if present.</p>
      </div>
      <form class="mt-5 sm:flex sm:items-center">
        <div class="w-full sm:max-w-xs">
          <UI-Input
            id="swimmerSearch"
            v-model="swimmerSearch"
            type="text"
            aria-label="Swimmer Id"
            class="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600  sm:text-sm/6"
            placeholder="Number or surname"
            clearable
            @update:model-value="( value ) => {
              if ( !value ) {
                selectedSwimmer = {}
                swimmerOptions = []
              }
            }"
          />
        </div>
        <button
          type="button"
          class="mt-3 inline-flex w-full items-center justify-center rounded-md bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-600 shadow-sm hover:bg-indigo-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600  disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed sm:ml-3 sm:mt-0 sm:w-auto"
          :disabled="!swimmerSearch.length"
          @click="lookupSwimmer"
        >
          Search
        </button>
      </form>
      <div
        v-if="swimmerOptions.length>0"
        class="mt-2 max-w-xl text-sm text-gray-500"
      >
        <UI-Select
          v-model="selectedOption"
          :options="swimmerOptions"
          placeholder="Choose swimmer..."
          @update:model-value="( value ) => {
            if ( value ) {
              swimmerSearch = String( value )
              lookupSwimmer()
            }
          }"
        />
      </div>
      <div
        v-if="selectedSwimmer.id"
        class="mt-2 max-w-xl text-sm text-gray-500"
      >
        <p>
          Found - {{ selectedSwimmer.firstName }} {{ selectedSwimmer.lastName }} ({{ selectedSwimmer.birthday ? selectedSwimmer.birthday?.substring( 0, 4 ) : 'no birth year' }}) click 'Select' to continue,
        </p>
      </div>
    </div>
  </UI-Dialog>
</template>
