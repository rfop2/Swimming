<script setup lang="ts">
  import { CheckIcon } from "@heroicons/vue/20/solid"
  import type { TierInfo } from "~/composables/useTiers"

  definePageMeta( {
    layout: "figma-page",
  } )

  const config = useRuntimeConfig()

  useHead( {
    title: `Pricing — ${ config.public.siteName }`,
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
  <div class="w-full md:w-[1200px] px-5 md:px-[50px] py-[50px] md:py-[100px] flex flex-col justify-start items-center gap-8">
    <UI-BackLink class="self-start" />

    <div class="max-w-[342px] md:max-w-none md:w-[1100px] text-center text-sky-950 text-[32px] md:text-[40px] font-extrabold font-['Bricolage_Grotesque'] uppercase leading-8 md:leading-[42px]">Plans for Every Swimmer</div>
    <div class="max-w-[342px] md:max-w-none md:w-[1100px] text-center text-sky-950 text-sm font-normal font-['DM_Sans'] leading-5">From tracking a single swimmer to managing a whole club squad — pick the plan that fits.</div>

    <div
      v-if="error"
      class="w-full max-w-md text-center text-red-600 text-sm font-normal font-['DM_Sans'] leading-5"
    >
      {{ error }}
    </div>

    <div class="w-full flex flex-col md:flex-row justify-center items-stretch gap-5">
      <div
        v-for="tier in tiers"
        :key="tier.id"
        class="w-full md:w-[202px] p-5 md:p-0 rounded-sm outline outline-1 outline-offset-[-1px] flex flex-col relative"
        :class="tier.featured ? 'bg-slate-900 outline-black' : 'bg-white outline-slate-200'"
      >
        <div
          v-if="tier.featured"
          class="px-2.5 py-[5px] left-1/2 -translate-x-1/2 top-[-11px] absolute bg-red-600 rounded-xs flex justify-center items-center gap-2.5 whitespace-nowrap"
        >
          <div class="text-white text-[10.40px] font-extrabold font-['Bricolage_Grotesque'] uppercase leading-4 tracking-wide">Most popular</div>
        </div>
        <div class="md:px-[21px] md:pt-[37px] flex-1 flex flex-col">
          <div
            class="text-[15.20px] font-extrabold font-['DM_Sans'] uppercase leading-6 tracking-wide"
            :class="tier.featured ? 'text-white' : 'text-sky-950'"
          >{{ tier.name }}</div>
          <div
            class="mt-2.5 md:mt-px md:min-h-[52.2px] text-xs font-normal font-['DM_Sans'] leading-[17.40px]"
            :class="tier.featured ? 'text-white/60' : 'text-slate-500'"
          >{{ tier.description }}</div>
          <div
            class="mt-2.5 md:mt-[35px] text-4xl font-black font-['DM_Sans'] leading-9"
            :class="tier.featured ? 'text-white' : 'text-sky-950'"
          >{{ tier.price }}</div>
          <div
            v-if="tier.id !== 'free'"
            class="mt-2.5 md:mt-0 text-xs font-normal font-['DM_Sans'] leading-5"
            :class="tier.featured ? 'text-white/40' : 'text-slate-500'"
          >per month</div>
          <div
            class="h-px mt-2.5 md:mt-px md:w-[160.20px]"
            :class="tier.featured ? 'bg-white/10' : 'bg-slate-200'"
          />
          <div class="mt-2.5 md:mt-4 md:w-[160.20px] flex flex-col gap-2.5 md:gap-[9.8px]">
            <div
              v-for="feature in tier.features"
              :key="feature"
              class="flex items-start gap-[5px]"
            >
              <CheckIcon
                class="h-3 w-4 mt-[1px]"
                :class="tier.featured ? 'text-white/60' : 'text-slate-500'"
                aria-hidden="true"
              />
              <div
                class="text-[11px] font-normal font-['DM_Sans'] leading-[15px]"
                :class="tier.featured ? 'text-white/60' : 'text-slate-500'"
              >{{ feature }}</div>
            </div>
          </div>
        </div>
        <UI-ButtonSolid
          class="mt-2.5 md:mt-6 md:mx-[9px] md:mb-[22px]"
          :class="{ '!px-3': tier.id === 'free' }"
          :disabled="loading === tier.id"
          @click="handleCta(tier)"
        >{{ loading === tier.id ? "Redirecting…" : tier.cta }}</UI-ButtonSolid>
      </div>
    </div>

    <div class="max-w-[342px] md:max-w-none md:w-[600px] text-center text-slate-500 text-xs font-normal font-['DM_Sans'] leading-5">All plans are billed monthly via GoCardless Direct Debit. Cancel any time — your access continues to the end of the billing period.</div>
  </div>
</template>
