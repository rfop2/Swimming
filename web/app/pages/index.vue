<script setup lang="ts">
  import { CheckIcon, ChevronUpIcon } from "@heroicons/vue/20/solid"

  definePageMeta( {
    layout: "landing",
  } )

  const menuOpen = ref( false )
  const scrolled = ref( false )

  const handleScroll = () => {
    scrolled.value = window.scrollY > 20
  }

  onMounted( () => {
    window.addEventListener( "scroll", handleScroll, { passive: true } )
  } )

  onUnmounted( () => {
    window.removeEventListener( "scroll", handleScroll )
  } )

  const menuLinks = [
    { name: "About", href: "/about" },
    { name: "Qualifications", href: "/qualifications" },
    { name: "Competition", href: "/competitions" },
    { name: "Timing & Analysis", href: "/timing" },
    { name: "Performance", href: "/performance" },
  ]

  const scrollToTop = () => {
    window.scrollTo( { top: 0, behavior: "smooth" } )
  }

  const config = useRuntimeConfig()

  useHead( {
    title: config.public.siteName,
    meta: [
      { name: "description", content: "Swimmer performance tracking, qualifying times, and race analysis." }
    ]
  } )

  const user = useUser()
  if ( user.value ) {
    await navigateTo( "/personal-bests" )
  }

  const nav = [
    { name: "Pricing", href: "/pricing" },
    { name: "About", href: "/about" },
    { name: "Terms", href: "/terms" },
  ]
</script>

<template>
  <div class="w-full bg-white flex flex-col justify-start items-center overflow-hidden">
    <div class="w-full h-[600px] md:h-[798px] relative overflow-hidden">
      <picture>
        <source media="(min-width: 768px)" srcset="/images/home/Block-A-Bg.jpg">
        <img class="absolute inset-0 w-full h-full object-cover" src="/images/home/Block-A-Bg-Mobile.png" >
      </picture>
      <div class="w-full h-full px-5 md:px-0 flex flex-col justify-between md:block items-center">
        <!-- Spacer to preserve layout height now that the header below is fixed -->
        <div class="h-[74px] md:hidden" aria-hidden="true"/>

        <div
          class="fixed top-0 left-0 z-50 w-full transition-colors duration-300"
          :class="scrolled ? 'bg-white shadow-sm' : 'bg-transparent'"
        >
          <div class="w-full px-5 md:px-[50px] py-5 flex justify-between items-center">
            <nuxt-link to="/" class="flex items-center gap-x-4">
              <div class="w-[80.42px] h-[34px] relative overflow-hidden">
                <svg xmlns="http://www.w3.org/2000/svg" width="81" height="34" viewBox="0 0 81 34" fill="none">
                  <g clip-path="url(#clip0_23_104)">
                    <path d="M14.8321 6.93506C14.7358 7.12768 14.6395 7.12768 14.2542 7.3203C13.0985 7.89817 9.53495 9.43915 9.43864 10.306C9.05339 12.3285 11.9427 10.5949 12.1354 10.4986C13.0985 10.017 14.1579 9.34284 15.2173 9.05391C14.8321 9.63178 12.039 11.2691 10.9796 12.0396C10.4018 12.5211 10.4018 13.0027 10.8833 13.6769C11.6538 13.7732 12.039 13.4842 12.5206 13.1953C13.1948 12.8101 16.2767 10.8838 16.662 10.7875L14.8321 12.3285C14.4468 12.6174 13.0985 13.5805 13.58 14.351C13.6763 14.5437 13.58 14.5437 13.9653 14.64C15.121 14.8326 16.8546 12.9064 18.0104 11.9433C18.4919 11.6543 19.3587 10.6912 19.9366 10.5949C20.1292 11.2691 18.8772 12.9064 18.9735 13.8695C18.9735 14.5437 19.6476 14.7363 20.3218 14.5437C21.2849 14.2547 22.537 11.8469 23.2112 10.7875C23.5001 10.4023 23.789 9.92071 24.078 9.53547C24.3669 9.15022 24.8485 8.47604 24.9448 8.0908C26.871 8.0908 36.9837 7.12768 37.9468 7.41662L43.7255 11.8469C44.1107 12.1359 45.4591 13.1953 45.8443 13.2916L43.6292 14.4473C42.8587 14.9289 42.1845 15.2178 41.5103 15.6994L37.2726 18.2035C42.6661 20.0334 47.7706 21.767 53.4529 23.1154C55.1865 23.5006 57.498 24.0785 59.3279 24.2711C60.0021 23.7896 61.0615 21.767 61.4468 20.6113C62.5062 17.433 62.5062 14.1584 60.6763 11.2691C59.2316 8.9576 56.0534 7.80186 53.4529 7.03137C49.3116 5.68301 47.1927 2.88998 42.3771 0.578508C37.9468 -1.44403 27.4489 2.11949 22.7296 3.0826C19.2624 3.75678 16.5657 4.14203 13.4837 5.39408C12.8095 5.68301 10.8833 6.35719 10.4981 6.74244C10.3054 6.93506 10.1128 7.41662 10.3054 7.80186C10.8833 8.57235 13.0985 7.22399 14.8321 6.93506Z" :fill="scrolled ? '#00123B' : 'white'"/>
                    <path d="M0 31.4945C0.963114 31.2055 2.40778 30.435 4.43032 29.8572C13.4836 27.0641 22.0553 27.642 31.2049 29.3756C41.125 31.3018 52.2008 34.9617 62.6987 33.8059C68.4774 33.1318 75.2192 30.9166 79.6495 27.2568C79.8421 27.1605 79.7458 27.2568 79.9384 27.0641L80.0348 26.9678C80.0348 26.8715 80.0348 26.8715 80.1311 26.8715C79.3606 27.0641 77.627 28.0273 75.7007 28.6051C74.0635 29.183 72.5225 29.5682 70.8852 29.9535C67.0327 30.724 63.3729 30.8203 59.4241 30.6277C45.0737 29.8572 32.6496 21.9596 17.2397 23.9822C13.9652 24.4637 10.209 25.4268 7.6086 26.6789C5.48975 27.7383 2.69672 29.2793 0.866802 30.724L0 31.4945Z" :fill="scrolled ? '#00123B' : 'white'"/>
                    <path d="M72.0409 7.51293C67.6105 8.28344 65.01 12.136 64.1432 16.8554C63.9506 18.0111 63.758 19.1669 63.469 20.419C63.1801 21.671 62.8911 22.9231 63.8543 23.7899C65.299 24.8494 69.4405 24.4641 71.2704 24.0789C73.7746 23.501 75.5082 22.4415 77.0492 21.2858C77.2419 20.9968 77.3382 20.9005 77.5308 20.7079C78.8792 19.4558 79.8423 17.8185 80.2276 15.8922C81.287 10.7876 77.1455 6.54979 72.0409 7.51293Z" :fill="scrolled ? '#00123B' : 'white'"/>
                    <path d="M0.962891 22.8264C13.0018 18.3961 23.9813 20.0334 36.2129 23.0191C45.4587 25.3305 56.8235 29.183 66.6473 27.8346C67.803 27.7383 70.1145 27.3531 70.885 26.8715C66.262 26.9678 65.9731 27.1604 60.9649 26.4863C43.2436 23.8859 26.0039 12.1359 7.89731 18.8777C6.54895 19.4555 1.63707 21.767 0.962891 22.8264Z" :fill="scrolled ? '#00123B' : 'white'"/>
                  </g>
                  <defs>
                    <clipPath id="clip0_23_104">
                      <rect width="80.42" height="33.9992" fill="white"/>
                    </clipPath>
                  </defs>
                </svg>
              </div>
              <div
                class="hidden md:block w-[147px] justify-end text-lg font-extrabold font-['Bricolage_Grotesque'] uppercase leading-[19px] tracking-wide"
                :class="scrolled ? 'text-slate-900' : 'text-white'"
              >Swim Racing</div>
            </nuxt-link>
            <div class="flex items-center gap-x-6">
              <nuxt-link
                to="/login"
                class="justify-center text-sm font-bold font-['DM_Sans'] leading-[22.40px] hover:opacity-80"
                :class="scrolled ? 'text-slate-900' : 'text-white'"
              >Sign In</nuxt-link>
              <button
                type="button"
                class="relative z-10"
                :aria-expanded="menuOpen"
                aria-label="Toggle menu"
                @click="menuOpen = !menuOpen"
              >
                <svg v-if="!menuOpen" width="26" height="18" viewBox="0 0 26 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 9H25M1 1H25M1 17H25" :stroke="scrolled ? '#00123B' : 'white'" stroke-width="2" stroke-linecap="square" stroke-linejoin="round"/>
                </svg>
                <svg v-else width="26" height="24" viewBox="0 0 26.0151 23.8493" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1.01514 1.11211L25.0151 23.1121" :stroke="scrolled ? '#00123B' : 'white'" stroke-width="2"/>
                  <line y1="-1" x2="33.3017" y2="-1" transform="matrix(0.750714 -0.660628 0.507568 0.861612 1.01514 23.7232)" :stroke="scrolled ? '#00123B' : 'white'" stroke-width="2"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Desktop expanded navigation -->
          <div
            v-if="menuOpen"
            class="hidden md:flex w-full md:px-[50px] pb-[10px] items-start justify-between text-xs font-bold font-['DM_Sans'] uppercase leading-[19.2px] tracking-[2.16px] text-right"
            :class="scrolled ? 'text-slate-900' : 'text-white'"
          >
            <NuxtLink
              v-for="link in menuLinks"
              :key="link.name"
              :to="link.href"
              class="hover:opacity-70"
              @click="menuOpen = false"
            >{{ link.name }}</NuxtLink>
          </div>
        </div>

        <!-- Mobile expanded navigation -->
        <Transition
          enter-active-class="transition-opacity ease-out duration-200"
          enter-from-class="opacity-0"
          enter-to-class="opacity-100"
          leave-active-class="transition-opacity ease-in duration-150"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0"
        >
          <div
            v-if="menuOpen"
            class="md:hidden fixed inset-0 z-50 bg-slate-900 px-5 py-10 flex flex-col gap-9 items-end"
          >
            <button
              type="button"
              aria-label="Close menu"
              @click="menuOpen = false"
            >
              <svg width="26" height="24" viewBox="0 0 26.0151 23.8493" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1.01514 1.11211L25.0151 23.1121" stroke="white" stroke-width="2"/>
                <line y1="-1" x2="33.3017" y2="-1" transform="matrix(0.750714 -0.660628 0.507568 0.861612 1.01514 23.7232)" stroke="white" stroke-width="2"/>
              </svg>
            </button>
            <nav class="flex flex-col gap-9 items-end text-white text-xs font-bold font-['DM_Sans'] uppercase leading-[19.2px] tracking-[2.16px] text-right">
              <NuxtLink
                v-for="link in menuLinks"
                :key="link.name"
                :to="link.href"
                class="hover:opacity-70"
                @click="menuOpen = false"
              >{{ link.name }}</NuxtLink>
            </nav>
          </div>
        </Transition>

        <div class="relative md:absolute md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[642px] flex flex-col justify-center items-center gap-10 md:gap-[54px] pb-8 md:pb-0">
          <div class="w-[292px] md:w-auto md:self-stretch text-center text-white text-[32px] md:text-[64px] font-extrabold font-['Bricolage_Grotesque'] uppercase leading-8 md:leading-[56px] [text-shadow:_6px_4px_12px_rgb(0_0_0_/_0.25)]">Everything your swimmer needs. All in one place.</div>
        </div>
      </div>
    </div>
    <div class="w-full bg-cyan-600 flex justify-center">
      <div class="w-full md:w-[1200px] px-5 md:px-[113px] py-[50px] md:py-[13px] flex flex-col md:flex-row justify-center items-center gap-2.5 md:gap-[54px]">
        <div class="text-white text-xs font-bold font-['DM_Sans'] uppercase leading-5 tracking-widest">Swim Clubs</div>
        <div class="w-0 md:w-px h-4 origin-top-left -rotate-90 md:rotate-0 bg-white/30"/>
        <div class="text-white text-xs font-bold font-['DM_Sans'] uppercase leading-5 tracking-widest">Coaches & Trainers</div>
        <div class="w-0 md:w-px h-4 origin-top-left -rotate-90 md:rotate-0 bg-white/30"/>
        <div class="text-white text-xs font-bold font-['DM_Sans'] uppercase leading-5 tracking-widest">Parents</div>
        <div class="w-0 md:w-px h-4 origin-top-left -rotate-90 md:rotate-0 bg-white/30"/>
        <div class="text-white text-xs font-bold font-['DM_Sans'] uppercase leading-5 tracking-widest">Swimmers</div>
      </div>
    </div>
    <div class="w-full bg-white flex justify-center">
      <div class="w-full md:w-[1200px] px-5 md:p-[100px] py-[50px] md:py-[100px] flex flex-col justify-start items-center gap-5 md:gap-10">
        <div class="text-center text-red-600 text-xs font-bold font-['DM_Sans'] uppercase leading-5 tracking-widest">About</div>
        <div class="max-w-[340px] md:max-w-none text-center text-black text-[32px] font-extrabold font-['Bricolage_Grotesque'] uppercase leading-8">The UK's most complete hub for swimmers, parents and clubs.</div>
        <div class="max-w-[340px] md:max-w-none text-center text-black text-xl font-normal font-['DM_Sans'] leading-[26px]">Swim Racing is the new performance and meet hub for county and regional swimmers. Designed to provide accurate statistics and competition results, Swim Racing offers a more in-depth analysis of not only your registered swimmer, but of their competitors too. Log videos, results, and schedule meets — the most detailed and accurate platform for clubs, parents and swimmers to track progress and improve results.</div>
      </div>
    </div>
    <div class="w-full flex justify-center md:bg-[url('/images/home/Block-D-Performance.png')] md:bg-cover md:bg-center md:bg-no-repeat">
      <div class="w-full md:w-[1200px] px-5 md:p-[100px] py-[50px] flex flex-col md:flex-row justify-center items-center gap-5 md:gap-[57px]">
        <img class="order-1 md:order-2 w-full max-w-[351px] md:max-w-none md:w-[535px] h-[215px] md:h-[327px] rounded-sm object-cover" src="/images/home/Block_D_Img.png" >
        <div class="order-2 md:order-1 w-full md:w-[465px] px-5 md:px-[50px] py-[50px] md:py-[50px] bg-slate-900 rounded-sm flex flex-col justify-start items-start gap-5">
          <div class="self-stretch h-3.5 justify-center text-white text-xs font-bold font-['DM_Sans'] uppercase leading-5 tracking-widest">Performance</div>
          <div class="self-stretch justify-center text-white text-[32px] font-extrabold font-['Bricolage_Grotesque'] uppercase leading-8">Your swimmer.       Every stroke.       Every stat. </div>
          <div class="self-stretch md:w-[364px] justify-center text-white text-xl font-normal font-['DM_Sans'] leading-[26px]">Statistics of your swimmer’s performance broken down. Log strokes, time and rank, and find out what’s needed to improve for the next meet. Track progress month by month with a full calendar overview, and compare against competitors. </div>
          <UI-ButtonSlate to="/performance">See What Your Swimmer's Data Can Do</UI-ButtonSlate>
        </div>
      </div>
    </div>
    <div class="w-full bg-white flex flex-col md:flex-row justify-start md:justify-between items-center md:items-stretch">
      <div class="order-2 md:order-1 w-full md:w-1/2 px-5 md:p-[100px] py-[50px] bg-cyan-600 flex flex-col justify-start items-start md:items-center gap-5">
        <div class="flex flex-col items-start gap-5 w-full md:w-[379px]">
          <div class="self-stretch h-3.5 justify-center text-white text-xs font-bold font-['DM_Sans'] uppercase leading-5 tracking-widest">Competition</div>
          <div class="self-stretch justify-center text-white text-[32px] font-extrabold font-['Bricolage_Grotesque'] uppercase leading-8">Every race. <br>Every level. <br>One platform.</div>
          <div class="self-stretch justify-center text-white text-xl font-normal font-['DM_Sans'] leading-[26px]">Track progress month by month with a full calendar overview, and compare against competitors. </div>
          <UI-ButtonSlate to="/competitions" class="px-5 py-2.5">Explore Competitions</UI-ButtonSlate>
        </div>
      </div>
      <div class="order-1 md:order-2 w-full md:w-1/2 h-auto md:h-[488px] p-5 md:p-0 bg-slate-900 flex flex-col justify-center items-center gap-2.5">
        <img class="w-full max-w-[350px] md:max-w-none md:w-[500px] h-[163px] md:h-[227px] rounded-sm object-cover" src="/images/home/Block_E_Img.png" >
      </div>
    </div>
    <div class="w-full flex flex-col md:flex-row justify-start md:justify-end items-center md:items-stretch">
      <div class="w-full md:w-1/2 h-auto md:h-[598px] p-5 md:p-0 bg-slate-900 flex flex-col justify-center items-end md:items-center gap-2.5">
        <img class="w-full max-w-[350px] md:max-w-none md:w-[500px] h-[257px] md:h-[367px] rounded-sm object-cover shadow-[10px_-10px_26.4px_-10px_rgba(0,0,0,0.25)]" src="/images/home/Block_F_Img.png" >
      </div>
      <div class="w-full md:w-1/2 px-5 md:p-[100px] py-[50px] bg-red-600 flex flex-col justify-center items-start md:items-center gap-5">
        <div class="flex flex-col items-start gap-5 w-full md:w-[400px]">
          <div class="w-[181px] justify-center text-white text-xs font-bold font-['DM_Sans'] uppercase leading-5 tracking-widest">Timing & Analysis</div>
          <div class="self-stretch justify-center text-white text-[32px] font-extrabold font-['Bricolage_Grotesque'] uppercase leading-8">From poolside to playback. <br>Every detail captured.</div>
          <div class="self-stretch justify-center text-white text-xl font-normal font-['DM_Sans'] leading-[26px]">Time your swimmer live with our built-in timer, adapted for mobile use. Upload videos of your swimmer and set markers throughout their race to accurately document their strategy and technique. Compare results between strokes and races.</div>
          <UI-ButtonSky to="/timing">Start Timing Your Swimmer</UI-ButtonSky>
        </div>
      </div>
    </div>
    <div class="w-full bg-slate-900 flex flex-col md:flex-row justify-start items-center md:items-stretch">
      <div class="order-1 md:order-2 w-full md:w-1/2 p-5 md:p-0 bg-slate-900 flex flex-col justify-center items-center gap-2.5">
        <img class="w-full max-w-[361px] md:max-w-none md:w-[500px] h-[262px] md:h-[362px] rounded-sm object-cover" src="/images/home/Block_G_Img.png" >
      </div>
      <div class="order-2 md:order-1 w-full md:w-1/2 px-5 md:p-[100px] py-[50px] bg-cyan-600 rounded-sm flex flex-col justify-start items-start md:items-center gap-5 md:gap-[30px]">
        <div class="flex flex-col items-start gap-5 md:gap-[30px] w-full md:w-[379px]">
          <div class="self-stretch h-3.5 justify-center text-white text-xs font-bold font-['DM_Sans'] uppercase leading-5 tracking-widest">Qualifications</div>
          <div class="self-stretch justify-center text-white text-[32px] font-extrabold font-['Bricolage_Grotesque'] uppercase leading-8">Every cut-off.<br>Every county.<br>In one place.</div>
          <div class="self-stretch justify-center text-white text-xl font-normal font-['DM_Sans'] leading-[26px]">Keep up to date with qualifying periods and cut-off dates for summer, winter and general competitions.</div>
          <UI-ButtonSky to="/qualifications">Find Your Swimmer's Ranking</UI-ButtonSky>
        </div>
      </div>
    </div>
    <img class="w-full hidden md:block h-[333px] object-cover" src="/images/home/pool-lanes.png" >
    <img class="w-full h-[333px] object-cover md:hidden" src="/images/home/pool-lanes-mobile.png" >
    <div class="w-full bg-white flex justify-center">
      <div class="w-full md:w-[1200px] px-5 md:px-[50px] py-[50px] md:py-[100px] flex flex-col justify-start items-center gap-5 md:gap-8">
        <div class="max-w-[342px] md:max-w-none md:w-[1100px] text-center text-sky-950 text-[32px] md:text-[40px] font-extrabold font-['Bricolage_Grotesque'] uppercase leading-8 md:leading-[42px]">Plans for Every Swimmer</div>
        <div class="max-w-[342px] md:max-w-none md:w-[1100px] text-center text-sky-950 text-sm font-normal font-['DM_Sans'] leading-5">From tracking a single swimmer to managing a whole club squad — pick the plan that fits.</div>
        <div class="w-full flex flex-col md:flex-row justify-center items-stretch gap-5">
          <div class="w-full md:w-[202px] p-5 md:p-0 bg-white rounded-sm outline outline-1 outline-offset-[-1px] outline-slate-200 flex flex-col">
            <div class="md:px-[21px] md:pt-[37px] flex-1 flex flex-col">
              <div class="text-sky-950 text-[15.20px] font-extrabold font-['DM_Sans'] uppercase leading-6 tracking-wide">Free</div>
              <div class="mt-2.5 md:mt-px md:min-h-[52.2px] text-slate-500 text-xs font-normal font-['DM_Sans'] leading-[17.40px]">Get started tracking personal bests with no commitment.</div>
              <div class="mt-2.5 md:mt-[35px] text-sky-950 text-4xl font-black font-['DM_Sans'] leading-9">£0</div>
              <div class="h-px mt-2.5 md:mt-px md:w-[160.20px] bg-slate-200"/>
              <div class="mt-2.5 md:mt-4 md:w-[160.20px] flex flex-col gap-2.5 md:gap-[9.8px]">
                <div class="flex items-start gap-[5px]">
                  <CheckIcon class="h-3 w-4 mt-[1px] text-slate-500" aria-hidden="true" />
                  <div class="text-slate-500 text-[11px] font-normal font-['DM_Sans'] leading-[15px]">Personal bests</div>
                </div>
                <div class="flex items-start gap-[5px]">
                  <CheckIcon class="h-3 w-4 mt-[1px] text-slate-500" aria-hidden="true" />
                  <div class="text-slate-500 text-[11px] font-normal font-['DM_Sans'] leading-[15px]">1 swimmer in your account</div>
                </div>
                <div class="flex items-start gap-[5px]">
                  <CheckIcon class="h-3 w-4 mt-[1px] text-slate-500" aria-hidden="true" />
                  <div class="text-slate-500 text-[11px] font-normal font-['DM_Sans'] leading-[15px]">Add your club</div>
                </div>
              </div>
            </div>
            <UI-ButtonSolid to="/register" class="mt-2.5 md:mt-6 md:mx-[9px] md:mb-[22px] !px-3">Get started free</UI-ButtonSolid>
          </div>
          <div class="w-full md:w-[202px] p-5 md:p-0 bg-white rounded-sm outline outline-1 outline-offset-[-1px] outline-slate-200 flex flex-col">
            <div class="md:px-[21px] md:pt-[37px] flex-1 flex flex-col">
              <div class="text-sky-950 text-[15.20px] font-extrabold font-['DM_Sans'] uppercase leading-6 tracking-wide">Parent Tier</div>
              <div class="mt-2.5 md:mt-px md:min-h-[52.2px] text-slate-500 text-xs font-normal font-['DM_Sans'] leading-[17.40px]">Follow your swimmers <br>through the full season.</div>
              <div class="mt-2.5 md:mt-[35px] text-sky-950 text-4xl font-black font-['DM_Sans'] leading-9">£6</div>
              <div class="mt-2.5 md:mt-0 text-slate-500 text-xs font-normal font-['DM_Sans'] leading-5">per month</div>
              <div class="h-px mt-2.5 md:mt-px md:w-[160.20px] bg-slate-200"/>
              <div class="mt-2.5 md:mt-4 md:w-[160.20px] flex flex-col gap-2.5 md:gap-[9.8px]">
                <div class="flex items-start gap-[5px]">
                  <CheckIcon class="h-3 w-4 mt-[1px] text-slate-500" aria-hidden="true" />
                  <div class="text-slate-500 text-[11px] font-normal font-['DM_Sans'] leading-[15px]">All Free features</div>
                </div>
                <div class="flex items-start gap-[5px]">
                  <CheckIcon class="h-3 w-4 mt-[1px] text-slate-500" aria-hidden="true" />
                  <div class="text-slate-500 text-[11px] font-normal font-['DM_Sans'] leading-[15px]">Race results</div>
                </div>
                <div class="flex items-start gap-[5px]">
                  <CheckIcon class="h-3 w-4 mt-[1px] text-slate-500" aria-hidden="true" />
                  <div class="text-slate-500 text-[11px] font-normal font-['DM_Sans'] leading-[15px]">Competition meets</div>
                </div>
                <div class="flex items-start gap-[5px]">
                  <CheckIcon class="h-3 w-4 mt-[1px] text-slate-500" aria-hidden="true" />
                  <div class="text-slate-500 text-[11px] font-normal font-['DM_Sans'] leading-[15px]">Up to 3 swimmers</div>
                </div>
                <div class="flex items-start gap-[5px]">
                  <CheckIcon class="h-3 w-4 mt-[1px] text-slate-500" aria-hidden="true" />
                  <div class="text-slate-500 text-[11px] font-normal font-['DM_Sans'] leading-[15px]">Select club</div>
                </div>
                <div class="flex items-start gap-[5px]">
                  <CheckIcon class="h-3 w-4 mt-[1px] text-slate-500" aria-hidden="true" />
                  <div class="text-slate-500 text-[11px] font-normal font-['DM_Sans'] leading-[15px]">Initiate swimmer updates</div>
                </div>
              </div>
            </div>
            <UI-ButtonSolid to="/register?plan=parent" class="mt-2.5 md:mt-6 md:mx-[9px] md:mb-[22px]">Subscribe</UI-ButtonSolid>
          </div>
          <div class="w-full md:w-[202px] p-5 md:p-0 bg-slate-900 rounded-sm outline outline-1 outline-offset-[-1px] outline-black relative flex flex-col">
            <div class="px-2.5 py-[5px] left-1/2 -translate-x-1/2 top-[-11px] absolute bg-red-600 rounded-xs flex justify-center items-center gap-2.5 whitespace-nowrap">
              <div class="text-white text-[10.40px] font-extrabold font-['Bricolage_Grotesque'] uppercase leading-4 tracking-wide">Most popular</div>
            </div>
            <div class="md:px-[21px] md:pt-[37px] flex-1 flex flex-col">
              <div class="text-white text-[15.20px] font-extrabold font-['DM_Sans'] uppercase leading-6 tracking-wide">Trainer Tier</div>
              <div class="mt-2.5 md:mt-px md:min-h-[52.2px] text-white/60 text-xs font-normal font-['DM_Sans'] leading-[17.40px]">Tools for coaches managing<br>athletes across multiple events.</div>
              <div class="mt-2.5 md:mt-[35px] text-white text-4xl font-black font-['DM_Sans'] leading-9">£12</div>
              <div class="mt-2.5 md:mt-0 text-white/40 text-xs font-normal font-['DM_Sans'] leading-5">per month</div>
              <div class="h-px mt-2.5 md:mt-px md:w-[160.20px] bg-white/10"/>
              <div class="mt-2.5 md:mt-4 md:w-[160.20px] flex flex-col gap-2.5 md:gap-[9.8px]">
                <div class="flex items-start gap-[5px]">
                  <CheckIcon class="h-3 w-4 mt-[1px] text-white/60" aria-hidden="true" />
                  <div class="text-white/60 text-[11px] font-normal font-['DM_Sans'] leading-[15px]">All Parent features</div>
                </div>
                <div class="flex items-start gap-[5px]">
                  <CheckIcon class="h-3 w-4 mt-[1px] text-white/60" aria-hidden="true" />
                  <div class="text-white/60 text-[11px] font-normal font-['DM_Sans'] leading-[15px]">Performance comparison</div>
                </div>
                <div class="flex items-start gap-[5px]">
                  <CheckIcon class="h-3 w-4 mt-[1px] text-white/60" aria-hidden="true" />
                  <div class="text-white/60 text-[11px] font-normal font-['DM_Sans'] leading-[15px]">Competition timer</div>
                </div>
                <div class="flex items-start gap-[5px]">
                  <CheckIcon class="h-3 w-4 mt-[1px] text-white/60" aria-hidden="true" />
                  <div class="text-white/60 text-[11px] font-normal font-['DM_Sans'] leading-[15px]">Video timer</div>
                </div>
                <div class="flex items-start gap-[5px]">
                  <CheckIcon class="h-3 w-4 mt-[1px] text-white/60" aria-hidden="true" />
                  <div class="text-white/60 text-[11px] font-normal font-['DM_Sans'] leading-[15px]">Up to 15 swimmers</div>
                </div>
              </div>
            </div>
            <UI-ButtonSolid to="/register?plan=trainer" class="mt-2.5 md:mt-6 md:mx-[9px] md:mb-[22px]">Subscribe</UI-ButtonSolid>
          </div>
          <div class="w-full md:w-[202px] p-5 md:p-0 bg-white rounded-sm outline outline-1 outline-offset-[-1px] outline-slate-200 flex flex-col">
            <div class="md:px-[21px] md:pt-[37px] flex-1 flex flex-col">
              <div class="text-sky-950 text-[15.20px] font-extrabold font-['DM_Sans'] uppercase leading-6 tracking-wide">Club — Small</div>
              <div class="mt-2.5 md:mt-px md:min-h-[52.2px] text-slate-500 text-xs font-normal font-['DM_Sans'] leading-[17.40px]">Full club management for <br>smaller swim clubs.</div>
              <div class="mt-2.5 md:mt-[35px] text-sky-950 text-4xl font-black font-['DM_Sans'] leading-9">£25</div>
              <div class="mt-2.5 md:mt-0 text-slate-500 text-xs font-normal font-['DM_Sans'] leading-5">per month</div>
              <div class="h-px mt-2.5 md:mt-px md:w-[160.20px] bg-slate-200"/>
              <div class="mt-2.5 md:mt-4 md:w-[160.20px] flex flex-col gap-2.5 md:gap-[9.8px]">
                <div class="flex items-start gap-[5px]">
                  <CheckIcon class="h-3 w-4 mt-[1px] text-slate-500" aria-hidden="true" />
                  <div class="text-slate-500 text-[11px] font-normal font-['DM_Sans'] leading-[15px]">All Trainer features</div>
                </div>
                <div class="flex items-start gap-[5px]">
                  <CheckIcon class="h-3 w-4 mt-[1px] text-slate-500" aria-hidden="true" />
                  <div class="text-slate-500 text-[11px] font-normal font-['DM_Sans'] leading-[15px]">Training times & speed charts</div>
                </div>
                <div class="flex items-start gap-[5px]">
                  <CheckIcon class="h-3 w-4 mt-[1px] text-slate-500" aria-hidden="true" />
                  <div class="text-slate-500 text-[11px] font-normal font-['DM_Sans'] leading-[15px]">Qualification view & edit</div>
                </div>
                <div class="flex items-start gap-[5px]">
                  <CheckIcon class="h-3 w-4 mt-[1px] text-slate-500" aria-hidden="true" />
                  <div class="text-slate-500 text-[11px] font-normal font-['DM_Sans'] leading-[15px]">Qualification import</div>
                </div>
                <div class="flex items-start gap-[5px]">
                  <CheckIcon class="h-3 w-4 mt-[1px] text-slate-500" aria-hidden="true" />
                  <div class="text-slate-500 text-[11px] font-normal font-['DM_Sans'] leading-[15px]">Claim club ownership</div>
                </div>
                <div class="flex items-start gap-[5px]">
                  <CheckIcon class="h-3 w-4 mt-[1px] text-slate-500" aria-hidden="true" />
                  <div class="text-slate-500 text-[11px] font-normal font-['DM_Sans'] leading-[15px]">15&ndash;34 swimmers</div>
                </div>
              </div>
            </div>
            <UI-ButtonSolid to="/register?plan=club-small" class="mt-2.5 md:mt-6 md:mx-[9px] md:mb-[22px]">Subscribe</UI-ButtonSolid>
          </div>
          <div class="w-full md:w-[201px] p-5 md:p-0 bg-white rounded-sm outline outline-1 outline-offset-[-1px] outline-slate-200 flex flex-col">
            <div class="md:px-[21px] md:pt-[37px] flex-1 flex flex-col">
              <div class="text-sky-950 text-[15.20px] font-extrabold font-['DM_Sans'] uppercase leading-6 tracking-wide">Club — Large</div>
              <div class="mt-2.5 md:mt-px md:w-[141px] md:min-h-[52.2px] text-slate-500 text-xs font-normal font-['DM_Sans'] leading-[17.40px]">Unlimited scale for large clubs with big squads.</div>
              <div class="mt-2.5 md:mt-[35px] text-sky-950 text-4xl font-black font-['DM_Sans'] leading-9">£35</div>
              <div class="mt-2.5 md:mt-0 text-slate-500 text-xs font-normal font-['DM_Sans'] leading-5">per month</div>
              <div class="h-px mt-2.5 md:mt-px md:w-[159.19px] bg-slate-200"/>
              <div class="mt-2.5 md:mt-4 md:w-[159.19px] flex flex-col gap-2.5 md:gap-[8.8px]">
                <div class="flex items-start gap-[5px]">
                  <CheckIcon class="h-3 w-4 mt-[1px] text-slate-500" aria-hidden="true" />
                  <div class="text-slate-500 text-[11px] font-normal font-['DM_Sans'] leading-4">All Club (small) features</div>
                </div>
                <div class="flex items-start gap-[5px]">
                  <CheckIcon class="h-3 w-4 mt-[1px] text-slate-500" aria-hidden="true" />
                  <div class="text-slate-500 text-[11px] font-normal font-['DM_Sans'] leading-4">35+ swimmers</div>
                </div>
                <div class="flex items-start gap-[5px]">
                  <CheckIcon class="h-3 w-4 mt-[1px] text-slate-500" aria-hidden="true" />
                  <div class="text-slate-500 text-[11px] font-normal font-['DM_Sans'] leading-4">Priority support</div>
                </div>
              </div>
            </div>
            <UI-ButtonSolid to="/register?plan=club-large" class="mt-2.5 md:mt-6 md:mx-[9px] md:mb-[22px]">Subscribe</UI-ButtonSolid>
          </div>
        </div>
      </div>
    </div>
    <div class="w-full bg-cyan-600 flex flex-col justify-start items-center">
      <div class="w-full md:w-[1200px] p-5 md:p-[50px] flex flex-col justify-start items-center gap-5">
        <div class="self-stretch h-[17px] text-center justify-center text-white text-sm font-bold font-['Bricolage_Grotesque'] uppercase leading-[23.04px] tracking-wide">Swim Racing</div>
        <div data-svg-wrapper class="relative">
          <svg width="53" height="22" viewBox="0 0 53 22" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g opacity="0.5" clip-path="url(#clip0_99_369)">
              <path d="M9.59635 4.4881C9.53404 4.61273 9.47173 4.61273 9.22248 4.73735C8.47472 5.11123 6.16915 6.10823 6.10683 6.66905C5.85758 7.97762 7.72697 6.85599 7.85159 6.79368C8.47472 6.48211 9.16016 6.04592 9.8456 5.85898C9.59635 6.23286 7.78928 7.29218 7.10384 7.79068C6.72996 8.10224 6.72996 8.41381 7.04153 8.85C7.54003 8.91231 7.78928 8.72537 8.10084 8.53843C8.53703 8.28918 10.531 7.04293 10.7803 6.98061L9.59635 7.97762C9.3471 8.16456 8.47472 8.78769 8.78629 9.28619C8.8486 9.41081 8.78629 9.41081 9.03554 9.47313C9.78329 9.59775 10.9049 8.3515 11.6527 7.72837C11.9642 7.54143 12.5251 6.9183 12.8989 6.85599C13.0236 7.29218 12.2135 8.3515 12.2758 8.97462C12.2758 9.41081 12.712 9.53544 13.1482 9.41081C13.7713 9.22388 14.5814 7.66606 15.0176 6.98061C15.2045 6.73136 15.3914 6.4198 15.5784 6.17055C15.7653 5.9213 16.0769 5.48511 16.1392 5.23586C17.3855 5.23586 23.9283 4.61273 24.5514 4.79967L28.2902 7.66606C28.5394 7.85299 29.4118 8.53843 29.6611 8.60075L28.2279 9.3485C27.7294 9.66007 27.2932 9.847 26.857 10.1586L24.1152 11.7787C27.6048 12.9626 30.9073 14.0843 34.5838 14.9567C35.7054 15.2059 37.2009 15.5798 38.3849 15.7044C38.8211 15.3928 39.5065 14.0843 39.7558 13.3365C40.4412 11.2802 40.4412 9.16156 39.2573 7.29218C38.3226 5.79667 36.2662 5.04892 34.5838 4.55041C31.9043 3.67803 30.5335 1.87096 27.4178 0.375456C24.5514 -0.933113 17.7593 1.37246 14.706 1.99559C12.4627 2.43178 10.718 2.68103 8.72397 3.4911C8.28778 3.67804 7.04153 4.11422 6.79228 4.36348C6.66765 4.4881 6.54302 4.79967 6.66765 5.04892C7.04153 5.54742 8.47472 4.67504 9.59635 4.4881Z" fill="white"/>
              <path d="M0 20.3776C0.623114 20.1907 1.55778 19.6922 2.86632 19.3184C8.72359 17.5113 14.2693 17.8852 20.1889 19.0068C26.607 20.253 33.7728 22.6209 40.5647 21.8731C44.3034 21.4369 48.6652 20.0038 51.5315 17.6359C51.6561 17.5736 51.5938 17.6359 51.7184 17.5113L51.7808 17.449C51.7808 17.3867 51.7808 17.3867 51.8431 17.3867C51.3446 17.5113 50.223 18.1344 48.9767 18.5083C47.9174 18.8822 46.9205 19.1314 45.8612 19.3807C43.3687 19.8792 41.0009 19.9415 38.4461 19.8168C29.1617 19.3184 21.1236 14.2088 11.1537 15.5174C9.03515 15.8289 6.60501 16.452 4.9226 17.2621C3.55175 17.9475 1.74472 18.9445 0.560802 19.8792L0 20.3776Z" fill="white"/>
              <path d="M46.6092 4.86186C43.7428 5.36036 42.0604 7.85288 41.4996 10.9062C41.375 11.654 41.2503 12.4017 41.0634 13.2118C40.8765 14.0218 40.6895 14.8319 41.3126 15.3927C42.2473 16.0782 44.9268 15.8289 46.1107 15.5797C47.7309 15.2058 48.8525 14.5203 49.8495 13.7726C49.9741 13.5857 50.0364 13.5233 50.1611 13.3987C51.0334 12.5886 51.6566 11.5293 51.9058 10.2831C52.5913 6.9805 49.9118 4.23873 46.6092 4.86186Z" fill="white"/>
              <path d="M0.623047 14.7698C8.41197 11.9034 15.5155 12.9627 23.429 14.8944C29.4109 16.3899 36.7636 18.8823 43.1194 18.01C43.8671 17.9477 45.3626 17.6984 45.8611 17.3868C42.8702 17.4492 42.6832 17.5738 39.443 17.1376C27.9777 15.4552 16.824 7.85321 5.10947 12.215C4.23711 12.5889 1.05923 14.0843 0.623047 14.7698Z" fill="white"/>
            </g>
            <defs>
              <clipPath id="clip0_99_369">
                <rect width="52.03" height="21.9995" fill="white"/>
              </clipPath>
            </defs>
          </svg>
        </div>
        <div class="flex flex-col md:flex-row justify-start items-center gap-2.5 md:gap-[27px]">
          <nuxt-link to="/privacy" class="text-center text-white text-[12.80px] font-normal font-['Barlow'] leading-5 hover:opacity-70">Privacy Policy</nuxt-link>
          <nuxt-link to="/terms" class="text-center text-white text-[12.80px] font-normal font-['Barlow'] leading-5 hover:opacity-70">Terms of Use</nuxt-link>
          <nuxt-link to="/contact" class="text-center text-white text-[12.80px] font-normal font-['Barlow'] leading-5 hover:opacity-70">Contact</nuxt-link>
          <a href="https://www.swimmingresults.org/" target="_blank" rel="noopener noreferrer" class="text-center text-white text-[12.80px] font-normal font-['Barlow'] leading-5 hover:opacity-70">British Swimming</a>
        </div>
        <div class="self-stretch text-center text-white text-xs font-normal font-['DM_Sans'] leading-5">© 2026 Swim Racing. All rights reserved. UK-based platform aligned with British Swimming standards.</div>
      </div>
    </div>

    <button
      type="button"
      class="fixed bottom-6 right-6 z-40 flex items-center justify-center w-12 h-12 rounded-full bg-slate-900/40 backdrop-blur-sm hover:bg-slate-900/60 transition-colors"
      aria-label="Back to top"
      @click="scrollToTop"
    >
      <ChevronUpIcon class="h-6 w-6 text-white" aria-hidden="true" />
    </button>
  </div>
</template>
