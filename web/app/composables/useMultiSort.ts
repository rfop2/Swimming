interface SortMeta<K> {
  field: keyof K
  order: 1 | -1
}

export const useMultiSort = <T>( initialSort: Array<SortMeta<T>> = [] ) => {
  const multiSortMeta = shallowRef<Array<SortMeta<T>>>( initialSort )

  const updateSort = ( field: keyof T ) => {
    const existing = multiSortMeta.value.find( meta => meta.field === field )
    if ( existing ) {
      if ( existing.order === 1 ) {
        multiSortMeta.value = multiSortMeta.value.map( meta =>
          meta.field === field ? { ...meta, order: -1 as const } : meta
        )
      } else {
        multiSortMeta.value = multiSortMeta.value.filter( meta => meta.field !== field )
      }
    } else {
      multiSortMeta.value = [ ...multiSortMeta.value, { field, order: 1 } ]
    }
  }

  const getSortIcon = ( field: keyof T ) => {
    const sortMeta = multiSortMeta.value.find( meta => meta.field === field )
    if ( sortMeta ) {
      return sortMeta.order === 1 ? "pi pi-sort-up" : "pi pi-sort-down"
    }
    return "pi pi-sort"
  }

  const compareValues = ( a: unknown, b: unknown ): number => {
    if ( a == null && b == null ) return 0
    if ( a == null ) return 1   // nulls sort last
    if ( b == null ) return -1
    if ( typeof a === "string" && typeof b === "string" ) {
      return a.localeCompare( b )
    }
    return a > b ? 1 : a < b ? -1 : 0
  }

  const sortRecords = ( records: Array<T> ) => {
    const copy = [ ...( records ?? [] ) ]
    if ( multiSortMeta.value.length === 0 ) return copy
    return copy.sort( ( a, b ) => {
      for ( const meta of multiSortMeta.value ) {
        const result = compareValues( a[meta.field], b[meta.field] )
        if ( result !== 0 ) return meta.order * result
      }
      return 0
    } )
  }

  const resetSort = () => {
    multiSortMeta.value = []
  }

  return { updateSort, getSortIcon, sortRecords, resetSort }
}
