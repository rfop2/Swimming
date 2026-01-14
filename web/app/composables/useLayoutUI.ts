export const useLayoutUi = () => {
  const navVisible = useState( "nav-visible", () => true )

  const hideNav = () => {
    navVisible.value = false
  }

  const showNav = () => {
    navVisible.value = true
  }

  return {
    navVisible,
    hideNav,
    showNav,
  }
}
