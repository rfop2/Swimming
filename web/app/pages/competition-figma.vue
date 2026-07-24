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
  <div class="w-full md:w-[550px] px-5 md:px-0 py-[100px] flex flex-col justify-start items-start gap-8">
    <div class="flex flex-col justify-start items-start gap-8">
      <UI-BackLink />
      <div class="text-slate-900 text-[64px] font-extrabold font-['Bricolage_Grotesque'] uppercase leading-[56px]">Competition</div>
      <img class="w-full" src="https://placehold.co/555x190" >
      <div class="text-slate-900 text-[32px] font-extrabold font-['Bricolage_Grotesque'] leading-8">Every race. Every level. One platform.</div>
      <div class="text-black text-xl font-normal font-['DM_Sans'] leading-[26px]">Track progress month by month with a full calendar overview, and compare against competitors. </div>
    </div>
    <div class="self-stretch flex flex-col justify-start items-start gap-8">
      <img class="self-stretch h-[249px] rounded-sm" src="https://placehold.co/550x249" >
      <div>
        <span class="text-black text-xl font-normal font-['DM_Sans'] leading-[26px]">Finding the right competitions used to mean cross-referencing club notices, county calendars and British Swimming bulletins. Swim Racing brings all of it into one place – organised, filterable, and easy to act on whether you’re a parent planning ahead or a coach managing a full squad.       <br></span><span class="text-black text-xl font-bold font-['DM_Sans'] leading-[26px]">Upcoming meets<br><br></span><span class="text-black text-xl font-normal font-['DM_Sans'] leading-[26px]">The meets calendar shows forthcoming events and competitions across the UK, updated automatically so you’re never working from outdated information. Filter by course, competition level, club or distance to find what’s relevant to your swimmer – whether that’s a local club gala or a Level 1 national qualifier.<br><br>Competitions are organised across all four levels:<br><br>•  </span><span class="text-black text-xl font-bold font-['DM_Sans'] leading-[26px]">Level 1 </span><span class="text-black text-xl font-normal font-['DM_Sans'] leading-[26px]">– National and elite competition<br>•  </span><span class="text-black text-xl font-bold font-['DM_Sans'] leading-[26px]">Level 2</span><span class="text-black text-xl font-normal font-['DM_Sans'] leading-[26px]"> – Regional and inter-county<br>•  </span><span class="text-black text-xl font-bold font-['DM_Sans'] leading-[26px]">Level 3</span><span class="text-black text-xl font-normal font-['DM_Sans'] leading-[26px]"> – County level<br>•  </span><span class="text-black text-xl font-bold font-['DM_Sans'] leading-[26px]">Level 4</span><span class="text-black text-xl font-normal font-['DM_Sans'] leading-[26px]"> – Club and development<br><br>When you find a meet worth targeting, you can save or flag it directly – keeping your swimmer’s competition schedule in one place rather than scattered across notes and emails.<br><br></span><span class="text-black text-xl font-bold font-['DM_Sans'] leading-[26px]">Race results<br><br></span><span class="text-black text-xl font-normal font-['DM_Sans'] leading-[26px]">The results tab gives you a full record of your swimmer’s past events, races and results, displayed in calendar view so you can see how the season has unfolded at a glance. Long course results are shown in italics, making it easy to differentiate between pool formats when reviewing performance over time.</span>
      </div>
      <CTAButtonPair />
    </div>
  </div>
</template>
