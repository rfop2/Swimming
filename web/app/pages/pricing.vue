<script setup lang="ts">
  import { CheckIcon } from "@heroicons/vue/20/solid"
  import type { TierInfo } from "~/composables/useTiers"

  useHead( {
    title: "Pricing",
    meta: [ { name: "description", content: "Choose the right plan for your swimming club, coaches and parents" } ],
  } )

  const user = useUser()
  const loading = ref<string | null>( null )
  const error = ref<string | null>( null )

  const { tiers: dbTiers, formatPrice } = useTiers()

  interface TierUi {
    features: string[]
    cta: string
    ctaHref?: string
  }

  const TIER_UI: Record<string, TierUi> = {
    "free": {
      features: [
        "Personal bests",
        "1 swimmer in your account",
        "Add your club",
      ],
      cta:     "Get started free",
      ctaHref: "/register",
    },
    "parent": {
      features: [
        "All Free features",
        "Race results",
        "Competition meets & races",
        "Up to 3 swimmers",
        "Select club",
        "Initiate swimmer updates",
      ],
      cta: "Subscribe",
    },
    "trainer": {
      features: [
        "All Parent features",
        "Performance comparison",
        "Competition timer & video timer",
        "Up to 15 swimmers",
      ],
      cta: "Subscribe",
    },
    "club-small": {
      features: [
        "All Trainer features",
        "Training times & speedcharts",
        "Qualification times (view & edit)",
        "Qualification import",
        "Claim club ownership",
        "15–34 swimmers",
      ],
      cta: "Subscribe",
    },
    "club-large": {
      features: [
        "All Club (small) features",
        "35+ swimmers",
        "Priority support",
      ],
      cta: "Subscribe",
    },
  }

  interface Tier extends Omit<TierInfo, "featured">, TierUi {
    price: string
    featured: boolean
  }

  const tiers = computed<Tier[]>( () =>
    ( dbTiers.value ?? [] ).map( t => ( {
      ...t,
      price:    formatPrice( t ),
      featured: !!t.featured,
      ...( TIER_UI[t.id] ?? { features: [], cta: "Subscribe" } ),
    } ) )
  )

  const handleCta = async ( tier: Tier ) => {
    if ( tier.ctaHref ) {
      navigateTo( tier.ctaHref )
      return
    }

    if ( !user.value ) {
      navigateTo( `/register?plan=${tier.id}` )
      return
    }

    loading.value = tier.id
    error.value = null
    try {
      const { url } = await $fetch<{ url: string }>( "/api/billing/start", {
        method: "POST",
        body:   { tier: tier.id },
      } )
      window.location.href = url!
    } catch ( err: unknown ) {
      error.value = ( err as { data?: { message?: string } } ).data?.message ?? "Something went wrong. Please try again."
      loading.value = null
    }
  }
</script>

<template>
  <div class="bg-white py-24 sm:py-32">
    <div class="mx-auto max-w-7xl px-6 lg:px-8">
      <!-- Header -->
      <div class="mx-auto max-w-4xl text-center">
        <h2 class="text-base/7 font-semibold text-indigo-600">
          Pricing
        </h2>
        <p class="mt-2 text-balance text-5xl font-semibold tracking-tight text-gray-900 sm:text-6xl">
          Plans for every swimmer
        </p>
      </div>
      <p class="mx-auto mt-6 max-w-2xl text-pretty text-center text-lg font-medium text-gray-600 sm:text-xl/8">
        From tracking a single swimmer to managing a whole club squad — pick the plan that fits.
      </p>

      <!-- Error banner -->
      <div
        v-if="error"
        class="mx-auto mt-8 max-w-md rounded-md bg-red-50 p-4 text-center text-sm text-red-700 ring-1 ring-red-200"
      >
        {{ error }}
      </div>

      <!-- Tier cards -->
      <div class="isolate mx-auto mt-10 grid max-w-md grid-cols-1 gap-8 md:max-w-2xl md:grid-cols-2 lg:max-w-4xl xl:mx-0 xl:max-w-none xl:grid-cols-5">
        <div
          v-for="tier in tiers"
          :key="tier.id"
          class="rounded-3xl p-8 ring-1 ring-gray-200"
          :class="{ 'ring-2 ring-indigo-600': tier.featured }"
        >
          <!-- Name + badge -->
          <div class="flex items-center justify-between gap-x-4">
            <h3
              class="text-lg/8 font-semibold text-gray-900"
              :class="{ 'text-indigo-600': tier.featured }"
            >
              {{ tier.name }}
            </h3>
            <p
              v-if="tier.featured"
              class="rounded-full bg-indigo-600/10 px-2.5 py-1 text-xs/5 font-semibold text-indigo-600"
            >
              Most popular
            </p>
          </div>

          <!-- Description -->
          <p class="mt-4 text-sm/6 text-gray-600">
            {{ tier.description }}
          </p>

          <!-- Price -->
          <p class="mt-6 flex items-baseline gap-x-1">
            <span class="text-4xl font-semibold tracking-tight text-gray-900">{{ tier.price }}</span>
            <span
              v-if="tier.id !== 'free'"
              class="text-sm/6 font-semibold text-gray-600"
            >/month</span>
          </p>

          <!-- CTA button -->
          <button
            class="mt-6 block w-full rounded-md px-3 py-2 text-center text-sm/6 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-60"
            :class="tier.featured
              ? 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-500'
              : 'text-indigo-600 ring-1 ring-inset ring-indigo-200 hover:ring-indigo-300'"
            :disabled="loading === tier.id"
            @click="handleCta(tier)"
          >
            <span v-if="loading === tier.id">Redirecting…</span>
            <span v-else>{{ tier.cta }}</span>
          </button>

          <!-- Features -->
          <ul
            role="list"
            class="mt-8 space-y-3 text-sm/6 text-gray-600"
          >
            <li
              v-for="feature in tier.features"
              :key="feature"
              class="flex gap-x-3"
            >
              <CheckIcon
                class="h-6 w-5 flex-none text-indigo-600"
                aria-hidden="true"
              />
              {{ feature }}
            </li>
          </ul>
        </div>
      </div>

      <!-- Footer note -->
      <p class="mx-auto mt-12 max-w-2xl text-center text-sm text-gray-500">
        All plans are billed monthly via GoCardless Direct Debit. Cancel any time — your access continues to the end of the billing period.
      </p>
    </div>
  </div>
</template>
