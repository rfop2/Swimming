<script setup lang="ts">
  definePageMeta( {
    layout: "figma-page",
  } )

  const config = useRuntimeConfig()

  useHead( {
    title: `Competition — ${ config.public.siteName }`,
  } )
</script>

<template>
  <div class="w-full md:w-[768px] px-5 md:px-0 py-[50px] md:py-[100px] flex flex-col justify-start items-start gap-8">
    <div class="flex flex-col justify-start items-start gap-8">
      <UI-BackLink />
      <div class="text-slate-900 text-[32px] md:text-[64px] font-extrabold font-['Bricolage_Grotesque'] uppercase leading-8 md:leading-[56px]">Competition</div>
      <img class="w-full md:w-[768px] h-[190px] rounded-sm object-cover" src="/images/home/Block-I-Competition-Img.jpg" >
      <div class="text-slate-900 text-2xl md:text-[32px] font-extrabold font-['Bricolage_Grotesque'] leading-8">Every race. Every level. One platform.</div>
      <p class="copy-text">Track progress month by month with a full calendar overview, and compare against competitors.</p>
    </div>
    <div class="self-stretch flex flex-col justify-start items-start gap-8">
      <img class="self-stretch h-[249px] rounded-sm object-cover" src="/images/home/Block-E-Img.png" >
      <div>
        <p class="copy-text">Finding the right competitions used to mean cross-referencing club notices, county calendars and British Swimming bulletins. Swim Racing brings all of it into one place – organised, filterable, and easy to act on whether you’re a parent planning ahead or a coach managing a full squad.</p>
        <p class="copy-heading">Upcoming meets</p>
        <p class="copy-text">The meets calendar shows forthcoming events and competitions across the UK, updated automatically so you’re never working from outdated information. Filter by course, competition level, club or distance to find what’s relevant to your swimmer – whether that’s a local club gala or a Level 1 national qualifier.</p>
        <p class="copy-text">Competitions are organised across all four levels:</p>
        <p class="copy-text">•  <span class="font-bold">Level 1</span> – National and elite competition<br>•  <span class="font-bold">Level 2</span> – Regional and inter-county<br>•  <span class="font-bold">Level 3</span> – County level<br>•  <span class="font-bold">Level 4</span> – Club and development</p>
        <p class="copy-text">When you find a meet worth targeting, you can save or flag it directly – keeping your swimmer’s competition schedule in one place rather than scattered across notes and emails.</p>
        <p class="copy-heading">Race results</p>
        <p class="copy-text">The results tab gives you a full record of your swimmer’s past events, races and results, displayed in calendar view so you can see how the season has unfolded at a glance. Long course results are shown in italics, making it easy to differentiate between pool formats when reviewing performance over time.</p>
      </div>
      <CTAButtonPair />
    </div>
  </div>
</template>
