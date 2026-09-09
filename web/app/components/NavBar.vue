<script setup lang="ts">
  import { Menu, MenuButton, MenuItems, MenuItem, Disclosure, DisclosureButton, DisclosurePanel } from "@headlessui/vue"
  import { Bars3Icon, BellIcon, ChevronDownIcon, ChevronRightIcon, UserIcon, XMarkIcon } from "@heroicons/vue/24/outline"
  import { notificationTypes, type NotificationType, type Notification } from "lib"

  const user = useAuthenticatedUser()
  const { canAccess } = useSubscription()

  // ──────────────────────────────────────────────────────────────
  // Type guards
  // ──────────────────────────────────────────────────────────────
  const isLink = ( o: MainNavOption ): o is NavOptionLink => "href" in o
  const isClick = ( o: MainNavOption ): o is NavOptionClick => "click" in o
  const hasChildren = ( o: MainNavOption ): o is NavOptionChildren => "children" in o
  const isExternal = ( href: string ): boolean =>
    /^(https?:)?\/\//.test( href ) || href.startsWith( "mailto:" )

  // ──────────────────────────────────────────────────────────────
  // Props builder
  // ──────────────────────────────────────────────────────────────
  const linkOrButtonProps = ( item: MainNavOption, close?: () => void ) => {
    if ( isLink( item ) ) {
      return isExternal( item.href )
        ? {
          as: "a",
          props: {
            href: item.href,
            target: "_blank",
            rel: "noopener noreferrer",
          },
        }
        : {
          as: "a",
          props: {
            href: item.href,
            onClick: ( e: MouseEvent ) => {
              e.preventDefault()
              close?.()
              navigateTo( item.href )
            }
          },
        }
    }

    if ( isClick( item ) ) {
      return {
        as: "button",
        props: {
          type: "button",
          onClick: ( e: MouseEvent ) => {
            item.click()
            close?.()
            e.preventDefault()
          },
        },
      }
    }

    return { as: "div", props: {} }
  }

  // ──────────────────────────────────────────────────────────────
  // Route highlighting
  // ──────────────────────────────────────────────────────────────
  const route = useRoute()

  const isActive = ( item: MainNavOption ): boolean => {
    if ( isLink( item ) && route.path.startsWith( item.href ) ) return true
    if ( hasChildren( item ) ) return item.children.some( isActive )
    return false
  }

  // ──────────────────────────────────────────────────────────────
  // Recursive condition filter
  // ──────────────────────────────────────────────────────────────
  const filterNav = ( options: MainNavOption[] ): MainNavOption[] =>
    options
      .map( option => {
        const visible = option.condition ? option.condition() : true

        if ( hasChildren( option ) ) {
          const kids = filterNav( option.children )
          return visible && kids.length ? { ...option, children: kids } : null
        }

        return visible ? option : null
      } )
      .filter( ( o ): o is MainNavOption => o !== null )

  interface NavOptionBase {
    name: string
    condition?: () => boolean
  }

  interface NavOptionLink extends NavOptionBase {
    href: string
  }

  interface NavOptionClick extends NavOptionBase {
    click: () => unknown
  }

  interface NavOptionChildren extends NavOptionBase {
    children: MainNavOption[]
  }

  type UserNavOption = NavOptionLink | NavOptionClick
  type MainNavOption = NavOptionLink | NavOptionClick | NavOptionChildren

  const navigation = computed<MainNavOption[]>( () => [
    { name: "Performance", children: [
      { name: "Personal Bests", href: "/personal-bests" },
      { name: "Results", href: "/results", condition: () => canAccess( "results" ) },
      { name: "Compare", href: "/compare", condition: () => canAccess( "compare" ) },
    ] },
    // { name: "Training", children: [
    // { name: "Training", href: "/training/targets" },
    // { name: "Speedcharts", href: "/training/speedchart", condition: () => canAccess( "speedcharts" ) },
    // ] },
    { name: "Competition", children: [
      { name: "Meets", href: "/competition/meets" },
      { name: "Race Times", href: "/competition/times", condition: () => canAccess( "trainingTimes" ) },
      { name: "Race Results", href: "/competition/races" },
    ] },
    { name: "Video", children: [
      // { name: "Timer", href: "/competition/timer" },
      { name: "Library", href: "/competition/video-timer/videos" },
      { name: "Timer", href: "/competition/video-timer" },
      { name: "Sessions", href: "/competition/video-timer/sessions" },
      { name: "Progress", href: "/competition/video-timer/progress" },
      { name: "Compare", href: "/competition/video-timer/compare" },
    ] },
    { name: "Qualifications", children: [
      { name: "Cut-off Dates", href: "/qualifying/dates" },
      { name: "Times", href: "/qualifying/times", condition: () => canAccess( "qualifyingView" ) },
      { name: "Ranking Timer", href: "/qualifying/ranking-timer", condition: () => canAccess( "qualifyingView" ) },
      { name: "Matrix", href: "/qualifying/matrix", condition: () => user.value.role === "admin" },
      { name: "Import", href: "/qualifying/import", condition: () => user.value.role === "admin" || canAccess( "qualifyingImport" ) },
    ] },
  ] )

  const activeNavigation = computed( () => filterNav( navigation.value ) )

  const { impersonating, revert } = useImpersonation()

  const revertUser = async () => {
    await revert()
    navigateTo( "/users" )
  }

  const config = useRuntimeConfig()

  async function logout() {
    await $fetch( "/api/user/logout", {
      method: "POST"
    } )
    window.location.href = "/"
  }

  const userNavigation = computed<UserNavOption[]>( () => [
    { name: "Account", href: "/account" },
    { name: "Pricing", href: "/pricing" },
    { name: "Updates", href: "/updates" },
    { name: "Tasks", href: "/tasks" },
    { name: "Users", href: "/users", condition: () => user.value.role === "admin" },
    // { name: "Settings", href: "#" },
    { name: "Revert user", click: revertUser, condition: () => !!impersonating.value },
    { name: "Sign out", click: logout },
  ] )

  const activeUserNavigation = computed( () => filterNav( userNavigation.value ) )

  const { notifications } = useNotificationsCheck()
  const { readNotification, readNotifications, deleteNotifications } = useNotifications()
  const newNotifications = computed<Notification[]>( () => notifications.value.filter( n => !Number( n.notificationViewed ) ) )
  const maxNotificationSeverity = computed<NotificationType>( () => {
    if ( notifications.value.length > 0 ) {
      const maxIndex = notifications.value.reduce( ( index, notification ) => {
        const typeIndex = notificationTypes.findIndex( t => notification.notificationType === t )
        return typeIndex > index ? typeIndex : index
      }, -1 )
      return notificationTypes[maxIndex]!
    }
    return "info"
  } )

  const notificationClass = computed( () => {
    const classes = []
    if ( !notifications.value.length ) return []
    classes.push( `notification-${maxNotificationSeverity.value}`  )
    if ( newNotifications.value.length )
      classes.push( "new" )
    return classes
  } )

  const showNotifications = ref( false )
</script>

<template>
  <Disclosure
    v-slot="{ open }"
    as="nav"

    class="border-b border-gray-200 bg-white"
  >
    <AlertBanner />
    <UpdateNotifier />
    <NotificationsDrawer
      v-model="showNotifications"
      :notifications="notifications"
      :mark-read="readNotification"
      :mark-all-read="readNotifications"
      :delete-all="deleteNotifications"
    />
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="flex h-16 justify-between">
        <!-- Left: Logo + main menu -->
        <div class="flex">
          <!-- Logo -->
          <div class="flex flex-shrink-0 items-center">
            <nuxt-link to="/">
              <img
                src="/images/SwimRacingLogo.svg"
                :title="config.public.siteName"
                class="w-20"
              >
            </nuxt-link>
          </div>

          <!-- Desktop navigation -->
          <div class="hidden sm:-my-px sm:ml-6 sm:flex sm:space-x-8 relative">
            <template
              v-for="item in activeNavigation"
              :key="item.name"
            >
              <Menu
                v-if="hasChildren(item)"
                as="div"
                class="relative"
              >
                <MenuButton
                  :class="[
                    isActive(item)
                      ? 'border-indigo-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                    'h-full inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium'
                  ]"
                >
                  {{ item.name }}
                  <ChevronDownIcon
                    class="ml-1 mt-1 h-5 w-5"
                    aria-hidden="true"
                  />
                </MenuButton>
                <MenuItems
                  class="absolute left-0 mt-2 w-48 origin-top-left rounded-md bg-white shadow-lg ring-1 ring-black/5 focus:outline-none z-50"
                >
                  <MenuItem
                    v-for="child in item.children"
                    :key="child.name"
                    v-slot="{ active, close }"
                  >
                    <component
                      :is="linkOrButtonProps(child, close).as"
                      v-bind="linkOrButtonProps(child, close).props"
                      :class="[
                        active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                        'block w-full text-left px-4 py-2 text-sm'
                      ]"
                    >
                      {{ child.name }}
                    </component>
                  </MenuItem>
                </MenuItems>
              </Menu>
              <div
                v-else
                class="pt-2"
                :class="[isActive(item) ? 'border-indigo-500 text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700', 'inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium']"
              >
                <component
                  :is="linkOrButtonProps(item).as"
                  v-bind="linkOrButtonProps(item).props"
                  :class="[
                    isActive(item)
                      ? 'border-indigo-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                    'inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium'
                  ]"
                >
                  {{ item.name }}
                </component>
              </div>
            </template>
          </div>
        </div>

        <!-- Right: version + profile -->
        <div class="hidden sm:ml-6 sm:flex sm:items-center pt-2">
          <p class="mr-2 text-sm text-gray-700">
            <nuxt-link
              v-if="user.role === 'admin'"
              to="/changelog"
            >
              v{{ config.public.appVersion }}
            </nuxt-link>
            <span v-else>v{{ config.public.appVersion }}</span>
          </p>
          <button
            type="button"
            class="relative rounded-full bg-white p-1 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            :class="notificationClass"
            @click="showNotifications = true"
          >
            <span class="absolute -inset-1.5" />
            <span class="sr-only">View notifications</span>
            <BellIcon
              class="h-6 w-6"
              aria-hidden="true"
            />
          </button>
          <!-- Profile dropdown -->
          <Menu
            as="div"
            class="relative ml-3"
          >
            <div>
              <MenuButton class="relative flex max-w-xs items-center rounded-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                <span class="absolute -inset-1.5" />
                <span class="sr-only">Open user menu</span>
                <UserIcon
                  class="block h-6 w-6"
                  aria-hidden="true"
                />
              </MenuButton>
            </div>
            <transition
              enter-active-class="transition ease-out duration-200"
              enter-from-class="transform opacity-0 scale-95"
              enter-to-class="transform opacity-100 scale-100"
              leave-active-class="transition ease-in duration-75"
              leave-from-class="transform opacity-100 scale-100"
              leave-to-class="transform opacity-0 scale-95"
            >
              <MenuItems class="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                <MenuItem
                  v-for="item in activeUserNavigation"
                  :key="item.name"
                  v-slot="{ active, close }"
                >
                  <component
                    :is="linkOrButtonProps(item,close).as"
                    v-bind="linkOrButtonProps(item,close).props"
                    :class="[active ? 'bg-gray-100' : '', 'block px-4 py-2 text-sm text-gray-700']"
                  >
                    {{ item.name }}
                  </component>
                </MenuItem>
              </MenuItems>
            </transition>
          </Menu>
        </div>

        <!-- Mobile menu -->
        <div
          class="-mr-2 flex items-center sm:hidden"
        >
          <!-- Mobile menu button -->
          <DisclosureButton class="relative inline-flex items-center justify-center rounded-md bg-white p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
            <span class="absolute -inset-0.5" />
            <span class="sr-only">Open main menu</span>
            <Bars3Icon
              v-if="!open"
              class="block h-6 w-6"
              aria-hidden="true"
            />
            <XMarkIcon
              v-else
              class="block h-6 w-6"
              aria-hidden="true"
            />
          </DisclosureButton>
        </div>
      </div>

      <DisclosurePanel
        v-slot="{ close }"
        class="sm:hidden"
      >
        <div class="space-y-1 pb-3 pt-2">
          <template
            v-for="item in activeNavigation"
            :key="item.name"
          >
            <Disclosure
              v-if="hasChildren(item)"
              as="div"
              class="border-b border-gray-100"
            >
              <DisclosureButton
                class="w-full flex justify-between items-center px-4 py-2 text-base font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-800"
              >
                <span>{{ item.name }}</span>
                <ChevronRightIcon
                  class="h-6 w-6"
                />
              </DisclosureButton>
              <DisclosurePanel class="space-y-1">
                <component
                  :is="linkOrButtonProps(child,close).as"
                  v-for="child in item.children"
                  :key="child.name"
                  v-bind="linkOrButtonProps(child,close).props"
                  class="block w-full text-left pl-8 pr-4 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                >
                  {{ child.name }}
                </component>
              </DisclosurePanel>
            </Disclosure>

            <component
              :is="linkOrButtonProps(item,close).as"
              v-else
              v-bind="linkOrButtonProps(item,close).props"
              class="block w-full text-left px-4 py-2 text-base font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-800"
            >
              {{ item.name }}
            </component>
          </template>
        </div>
        <div class="border-t border-gray-200 pb-3 pt-4">
          <div class="flex items-center px-4">
            <div class="flex-shrink-0">
              <UserIcon
                class="block h-6 w-6"
                aria-hidden="true"
              />
            </div>
            <div class="ml-3">
              <div class="text-base font-medium text-gray-800">
                {{ user.username }}
              </div>
            </div>
            <button
              type="button"
              class="relative ml-auto flex-shrink-0 rounded-full bg-white p-1 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <span class="absolute -inset-1.5" />
              <span class="sr-only">View notifications</span>
              <BellIcon
                class="h-6 w-6"
                aria-hidden="true"
              />
            </button>
          </div>
          <div class="mt-3 space-y-1">
            <DisclosureButton
              v-for="item in activeUserNavigation"
              :key="item.name"
              v-slot="{ active }"
            >
              <component
                :is="linkOrButtonProps(item,close).as"
                v-bind="linkOrButtonProps(item,close).props"
                :class="[active ? 'bg-gray-100' : '', 'block px-4 py-2 text-sm text-gray-700']"
              >
                {{ item.name }}
              </component>
            </DisclosureButton>
          </div>
        </div>
      </DisclosurePanel>
    </div>
  </Disclosure>
</template>

<style lang="scss" scoped>
  @keyframes notification-pulse {
    0% {
      box-shadow: 0 0 0 0 var(--pulse-color);
    }
    70% {
      box-shadow: 0 0 0 6px transparent;
    }
    100% {
      box-shadow: 0 0 0 0 transparent;
    }
  }

  .notification-info {
    color: rgb(59 130 246);
    animation: notification-pulse 2.5s infinite;
    &.new {
      --pulse-color: rgb(59 130 246 / 0.5); /* blue-500 */
    }
  }

  .notification-success {
    color: rgb(34 197 94);
    animation: notification-pulse 2.0s infinite;
    &.new {
      --pulse-color: rgb(34 197 94 / 0.5); /* green-500 */
    }
  }

  .notification-warning {
    --pulse-color: rgb(234 179 8 / 0.5); /* yellow-500 */
    color: rgb(234 179 8);
    animation: notification-pulse 1.5s infinite;
    &.new {
      --pulse-color: rgb(234 179 8 / 0.5); /* yellow-500 */
    }
  }

  .notification-error {
    color: rgb(239 68 68);
    animation: notification-pulse 1.2s infinite;
    &.new {
      --pulse-color: rgb(239 68 68 / 0.5); /* red-500 */
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .notification-info,
    .notification-success,
    .notification-warning,
    .notification-error {
      animation: none;
      box-shadow: 0 0 0 2px var(--pulse-color);
    }
  }
</style>
