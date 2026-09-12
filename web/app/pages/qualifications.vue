<script setup lang="ts">
  definePageMeta( {
    layout: "figma-page",
  } )

  const config = useRuntimeConfig()

  useHead( {
    title: `Qualifications — ${ config.public.siteName }`,
  } )
</script>

<template>
  <div class="w-full md:w-[960px] px-5 md:px-0 py-[50px] md:py-[100px] flex flex-col justify-start items-start gap-8">
    <div class="flex flex-col justify-start items-start gap-8">
      <UI-BackLink />
      <div class="text-slate-900 text-[32px] md:text-[64px] font-extrabold font-['Bricolage_Grotesque'] uppercase leading-8 md:leading-[56px]">Qualifications</div>
      <img class="w-full md:w-[960px] h-[190px] rounded-sm object-cover" src="/images/home/Block-I-Qualifications-Img.jpg" >
      <div class="text-slate-900 text-2xl md:text-[32px] font-extrabold font-['Bricolage_Grotesque'] leading-8">Find every cut-off and every county <br>in one place.</div>
      <p class="copy-text">Keep up to date with qualifying periods and cut-off dates for summer, winter and general competitions.</p>
    </div>
    <div class="flex flex-col justify-start items-start gap-8">
      <img class="w-full md:w-[960px] h-[406px] rounded-sm object-cover" src="/images/home/Block-K-Qualifications-Img.png" >
      <div>
        <p class="copy-text">Qualifying standards in Aquatics GB aren’t simple. They vary by age, by event, by county, by region, and by competition period – and they change. For parents and swimmers trying to understand what’s within reach, and for coaches planning a season around specific targets, keeping track of it all manually is a significant undertaking.</p>
        <p class="copy-text">Swim Racing does it automatically.</p>
        <p class="copy-heading">Standards, tracked across every level</p>
        <p class="copy-text">Aquatics GB qualifying standards are built into the platform alongside county and regional standards – so wherever your swimmer competes, and whatever they’re aiming for, the relevant cut-offs are always visible and always current. Summer, winter and general competition periods are all covered, with open and closed qualifying periods clearly indicated so you’re always focused on what’s still achievable.</p>
      </div>
      <CTAButton />
    </div>
  </div>
</template>
