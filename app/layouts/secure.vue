<script setup lang="ts">
  import { Disclosure, DisclosureButton, DisclosurePanel, Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/vue"
  import { Bars3Icon, BellIcon, UserIcon, XMarkIcon } from "@heroicons/vue/24/outline"

  const user = useAuthenticatedUser()

  useHead( {
    title: "Swimming",
    meta: [
      { name: "description", content: "Swimming stats." }
    ],
    link: [
      {
        rel: "stylesheet",
        href: "https://rsms.me/inter/inter.css",
      // crossorigin: ''
      },
    ],
    htmlAttrs: {
      class: "h-full"
    },
    bodyAttrs: {
      class: "h-full"
    },
  } )

  const router = useRouter()

  const config = useRuntimeConfig()

  type NavOption = {
    name: string
    href: string
    condition?: () => boolean
  }

  const navigation = computed<NavOption[]>( () => [
    { name: "Performance", href: "/performance" },
    { name: "Results", href: "/results" },
    { name: "Times", href: "/times" },
    { name: "Training", href: "/training" },
    { name: "Qualifying", href: "/qualifying" },
    { name: "Meets", href: "/meets" },
  ] )

  const activeNavigation = computed( () => navigation.value.filter( item => !item.condition || ( item.condition )() ) )

  const userNavigation = [
    { name: "Account", href: "/account" },
    // { name: "Settings", href: "#" },
    { name: "Sign out", href: "", click: logout },
  ]

  async function logout() {
    await $fetch( "/api/user/logout", {
      method: "POST"
    } )
    // clear Nuxt state after current tick
    await nextTick( () => {
      clearNuxtState()
      clearNuxtData()
    } )
    router.push( "/login" )
  }
</script>

<template>
  <div class="min-h-full">
    <Disclosure
      v-slot="{ open }"
      as="nav"
      class="border-b border-gray-200 bg-white"
    >
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="flex h-16 justify-between">
          <div class="flex">
            <div class="flex flex-shrink-0 items-center">
              <svg
                class="h-6 w-auto"
                aria-hidden="true"
                viewBox="0 0 36 24"
                fill="none"
              >
                <title>swim.racing</title>
                <path
                  d="M18.724 1.714c-4.538 0-7.376 2.286-8.51 6.857 1.702-2.285 3.687-3.143 5.957-2.57 1.296.325 2.22 1.271 3.245 2.318 1.668 1.706 3.6 3.681 7.819 3.681 4.539 0 7.376-2.286 8.51-6.857-1.701 2.286-3.687 3.143-5.957 2.571-1.294-.325-2.22-1.272-3.245-2.32-1.668-1.705-3.6-3.68-7.819-3.68zM10.214 12c-4.539 0-7.376 2.286-8.51 6.857 1.701-2.286 3.687-3.143 5.957-2.571 1.294.325 2.22 1.272 3.245 2.32 1.668 1.705 3.6 3.68 7.818 3.68 4.54 0 7.377-2.286 8.511-6.857-1.702 2.286-3.688 3.143-5.957 2.571-1.295-.326-2.22-1.272-3.245-2.32-1.669-1.705-3.6-3.68-7.82-3.68z"
                  class="fill-sky-400"
                />
              </svg>
            </div>
            <div class="hidden sm:-my-px sm:ml-6 sm:flex sm:space-x-8">
              <nuxt-link
                v-for="item in activeNavigation"
                :key="item.name"
                :href="item.href"
                :class="[item.href === router.currentRoute.value.name ? 'border-indigo-500 text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700', 'inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium']"
                :aria-current="item.href === router.currentRoute.value.name ? 'page' : undefined"
              >
                {{ item.name }}
              </nuxt-link>
            </div>
          </div>
          <div class="hidden sm:ml-6 sm:flex sm:items-center pt-2">
            <p class="mr-2 text-sm text-gray-700">
              v{{ config.public.appVersion }}
            </p>
            <button
              type="button"
              class="relative rounded-full bg-white p-1 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
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
                    v-for="item in userNavigation"
                    :key="item.name"
                    v-slot="{ active, close }"
                  >
                    <a
                      :href="item.href"
                      :class="[active ? 'bg-gray-100' : '', 'block px-4 py-2 text-sm text-gray-700']"
                      @click.prevent="item.click ? item.click() : router.push( item.href ); close()"
                    >
                      {{ item.name }}
                    </a>
                  </MenuItem>
                </MenuItems>
              </transition>
            </Menu>
          </div>
          <div class="-mr-2 flex items-center sm:hidden">
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
      </div>

      <DisclosurePanel class="sm:hidden">
        <div class="space-y-1 pb-3 pt-2">
          <DisclosureButton
            v-for="item in activeNavigation"
            :key="item.name"
            as="a"
            :href="item.href"
            :class="[item.href === router.currentRoute.value.name ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-transparent text-gray-600 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800', 'block border-l-4 py-2 pl-3 pr-4 text-base font-medium']"
            :aria-current="item.href === router.currentRoute.value.name ? 'page' : undefined"
          >
            {{ item.name }}
          </DisclosureButton>
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
              v-for="item in userNavigation"
              :key="item.name"
              as="a"
              :href="item.href"
              class="block px-4 py-2 text-base font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800"
              @click.prevent="item.click ? item.click() : router.push( item.href )"
            >
              {{ item.name }}
            </DisclosureButton>
          </div>
        </div>
      </DisclosurePanel>
    </Disclosure>

    <div class="py-10">
      <main>
        <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>
