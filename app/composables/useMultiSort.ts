import type { UnwrapRef } from "vue"

interface SortMeta<K> {
  field: keyof K
  order: number
}

export const useMultiSort = <T>() => {
  // const multiSortMeta = useState<Array<SortMeta<T>>>( 'multiSort', () => [] )
  const multiSortMeta = ref<Array<SortMeta<T>>>( [] )
  // const records = ref<Array<T>>( [] )

  const updateSort = ( field: keyof T ) => {
    const existingSortMeta = multiSortMeta.value.find( meta => meta.field === field )
    if ( existingSortMeta ) {
      if ( existingSortMeta.order === 1 ) {
        existingSortMeta.order = -1
      } else {
        multiSortMeta.value = multiSortMeta.value.filter( meta => meta.field !== field )
      }
    } else {
      multiSortMeta.value.push( { field: field as UnwrapRef<keyof T>, order: 1 } )
    }
  }

  const getSortIcon = ( field: keyof T ) => {
    const sortMeta = multiSortMeta.value.find( meta => meta.field === field )
    if ( sortMeta ) {
      return sortMeta.order === 1 ? "pi pi-sort-up" : "pi pi-sort-down"
    }
    return "pi pi-sort"
  }

  const sortRecords = ( records: Array<T> ) => {
    if ( multiSortMeta.value.length === 0 ) {
      return records
    }
    return [ ...records || [] ].sort( ( a, b ) => {
      for ( const meta of multiSortMeta.value ) {
        const field = meta.field as keyof T
        const valueA = a[field]
        const valueB = b[field]
        const result = valueA > valueB ? 1 : valueA < valueB ? -1 : 0
        if ( result !== 0 ) {
          return meta.order * result
        }
      }
      return 0
    } )
  }

 const resetSort = () => {
    multiSortMeta.value = []
  }

  return { updateSort, getSortIcon, sortRecords, resetSort }
}
