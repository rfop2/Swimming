<script setup lang="ts">
  definePageMeta( {
    layout: "figma-page",
  } )

  const config = useRuntimeConfig()

  useHead( {
    title: `Performance — ${ config.public.siteName }`,
  } )
</script>

<template>
  <div class="w-full md:w-[564px] px-5 md:px-0 py-[50px] md:py-[100px] flex flex-col justify-start items-start gap-8">
    <div class="flex flex-col justify-start items-start gap-8">
      <UI-BackLink />
      <div class="text-slate-900 text-[32px] md:text-[64px] font-extrabold font-['Bricolage_Grotesque'] uppercase leading-8 md:leading-[56px]">Performance</div>
      <img class="w-full md:w-[555px] h-[190px] rounded-sm object-cover" src="https://placehold.co/555x190" >
      <div class="text-slate-900 text-2xl md:text-[32px] font-extrabold font-['Bricolage_Grotesque'] leading-8">Your swimmer. Every stroke. Every stat. </div>
      <div class="text-black text-xl font-normal font-['DM_Sans'] leading-[26px]">Most platforms tell you a time. Swim Racing tells you what that time means.</div>
    </div>
    <div class="flex flex-col justify-start items-start gap-8">
      <img class="w-full md:w-[564px] aspect-[564/345] rounded-sm object-cover" src="https://placehold.co/564x345" >
      <div>
        <span class="text-black text-xl font-normal font-['DM_Sans'] leading-[26px]">Every result your swimmer posts is automatically pulled from British Swimming records and placed in context – against qualifying standards, against competitors, and against their own personal best. The result is a performance picture that’s detailed enough to inform real decisions, and clear enough that you don’t need a coaching background to understand it.<br><br></span><span class="text-black text-xl font-bold font-['DM_Sans'] leading-[26px]">What you can see at glance<br></span><span class="text-black text-xl font-normal font-['DM_Sans'] leading-[26px]"><br></span><span class="text-black text-xl font-normal font-['DM_Sans'] leading-[26px]">Personal best times are highlighted in purple, so progress is immediately visible. Qualifying times that have been achieved are clearly marked, and if your swimmer is within 5% or 10% of a qualifying standard, the exact time difference is shown – so you always know how close they are and what they’re working towards. Qualifying periods that have closed are shown in italics, keeping the focus on what’s still achievable.<br><br>Where your swimmer appears in the top 100 rankings in the last 12 months, you’ll also see their performance relative to the event leader – giving a true sense of where they sit in the field, not just on paper. Rankings are broken down into top 10, top 20, and top 50, so progress through the competitive field is easy to track over time.<br><br></span><span class="text-black text-xl font-bold font-['DM_Sans'] leading-[26px]">Compare. Understand. Improve.<br></span><span class="text-black text-xl font-normal font-['DM_Sans'] leading-[26px]"><br></span><span class="text-black text-xl font-normal font-['DM_Sans'] leading-[26px]">The performance view isn’t just about your swimmer in isolation. Results can be shared directly from the platform, making it simple to loop in a coach, discuss progress with your club, or keep the wider support network informed. You can also see how their times compare directly against competitors within the same chart – identifying where the gaps are, which events represent the biggest opportunities, and where consistent improvement is already happening.</span>
      </div>
      <CTAButtonPair />
    </div>
  </div>
</template>
