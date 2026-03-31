<script setup lang="ts">
  definePageMeta( {
    layout: "landing",
  } )

  const config = useRuntimeConfig()

  useHead( {
    title: config.public.siteName,
    meta: [
      { name: "description", content: "Swimmer performance tracking, qualifying times, and race analysis." }
    ]
  } )

  const user = useUser()
  if ( user.value ) {
    await navigateTo( "/performance" )
  }

  const nav = [
    { name: "Pricing", href: "/pricing" },
    { name: "About", href: "/about" },
    { name: "Terms", href: "/terms" },
  ]
</script>

<template>
  <div class="bg-white">
    <!-- Header -->
    <header class="border-b border-gray-100">
      <nav class="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-8">
        <div class="flex items-center gap-x-4">
          <img
            src="/images/SwimRacingLogo.svg"
            :alt="config.public.siteName"
            class="w-10"
          >
          <span class="text-base font-semibold text-gray-900">{{ config.public.siteName }}</span>
        </div>
        <div class="flex items-center gap-x-8">
          <nuxt-link
            v-for="item in nav"
            :key="item.name"
            :href="item.href"
            class="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            {{ item.name }}
          </nuxt-link>
          <nuxt-link
            href="/login"
            class="rounded-md bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Sign in
          </nuxt-link>
        </div>
      </nav>
    </header>

    <!-- Hero -->
    <div class="relative isolate px-6 lg:px-8">
      <div class="mx-auto max-w-2xl py-32 sm:py-48">
        <div class="text-center">
          <div class="flex justify-center mb-10">
            <img
              src="/images/SwimRacing.svg"
              :alt="config.public.siteName"
              class="w-56"
            >
          </div>
          <h1 class="text-5xl font-semibold tracking-tight text-gray-900 sm:text-7xl">
            Swim faster. Know where you stand.
          </h1>
          <p class="mt-8 text-lg text-gray-500 sm:text-xl leading-8">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque vehicula nunc vel
            lorem porttitor, vitae mollis turpis dignissim. Nunc euismod felis id diam maximus, non
            faucibus augue laoreet. Aliquam erat volutpat.
          </p>
          <div class="mt-10 flex items-center justify-center gap-x-6">
            <nuxt-link
              href="/login"
              class="rounded-md bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Sign in
            </nuxt-link>
            <nuxt-link
              href="/about"
              class="text-sm font-semibold text-gray-900"
            >
              Learn more <span aria-hidden="true">&rarr;</span>
            </nuxt-link>
          </div>
        </div>
      </div>
    </div>

    <!-- Feature strip -->
    <div class="border-t border-gray-100 bg-gray-50 py-16">
      <div class="mx-auto max-w-7xl px-6 lg:px-8">
        <dl class="grid grid-cols-1 gap-8 sm:grid-cols-3">
          <div class="text-center">
            <dt class="text-base font-semibold text-gray-900">
              Personal bests &amp; ranking
            </dt>
            <dd class="mt-2 text-sm text-gray-500">
              Track every swimmer's personal best times and see how they rank against county and regional competitors in real time.
            </dd>
          </div>
          <div class="text-center">
            <dt class="text-base font-semibold text-gray-900">
              Qualifying time tracking
            </dt>
            <dd class="mt-2 text-sm text-gray-500">
              Automatically compare swims against current qualifying windows for county and regional championships so nothing is missed.
            </dd>
          </div>
          <div class="text-center">
            <dt class="text-base font-semibold text-gray-900">
              Shareable performance reports
            </dt>
            <dd class="mt-2 text-sm text-gray-500">
              Generate a secure, time-limited link to share a swimmer's full performance summary with coaches and parents.
            </dd>
          </div>
        </dl>
      </div>
    </div>

    <!-- Footer -->
    <footer class="border-t border-gray-200 py-8">
      <div class="mx-auto max-w-7xl px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p class="text-sm text-gray-400">
          &copy; {{ new Date().getFullYear() }} {{ config.public.siteName }}. All rights reserved.
        </p>
        <nav class="flex gap-x-6">
          <nuxt-link
            v-for="item in nav"
            :key="item.name"
            :href="item.href"
            class="text-sm text-gray-400 hover:text-gray-600"
          >
            {{ item.name }}
          </nuxt-link>
        </nav>
      </div>
    </footer>
  </div>
</template>
