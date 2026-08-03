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
  <div class="w-full md:w-[768px] px-5 md:px-0 py-[50px] md:py-[100px] flex flex-col justify-start items-start gap-8">
    <div class="flex flex-col justify-start items-start gap-8">
      <UI-BackLink />
      <div class="text-slate-900 text-[32px] md:text-[64px] font-extrabold font-['Bricolage_Grotesque'] uppercase leading-8 md:leading-[56px]">Performance</div>
      <img class="w-full md:w-[768px] h-[190px] rounded-sm object-cover" src="/images/home/Block-I-Performace-Img.jpg" >
      <div class="text-slate-900 text-2xl md:text-[32px] font-extrabold font-['Bricolage_Grotesque'] leading-8">Your swimmer. Every stroke. Every stat. </div>
      <p class="copy-text">Most platforms tell you a time. Swim Racing tells you what that time means.</p>
    </div>
    <div class="flex flex-col justify-start items-start gap-8">
      <img class="w-full md:w-[768px] aspect-[564/345] rounded-sm object-cover" src="/images/home/Block-K-Performance-Img.png" >
      <div>
        <p class="copy-text">Every result your swimmer posts is automatically pulled from British Swimming records and placed in context – against qualifying standards, against competitors, and against their own personal best. The result is a performance picture that’s detailed enough to inform real decisions, and clear enough that you don’t need a coaching background to understand it.</p>
        <p class="copy-heading">What you can see at glance</p>
        <p class="copy-text">Personal best times are highlighted in purple, so progress is immediately visible. Qualifying times that have been achieved are clearly marked, and if your swimmer is within 5% or 10% of a qualifying standard, the exact time difference is shown – so you always know how close they are and what they’re working towards. Qualifying periods that have closed are shown in italics, keeping the focus on what’s still achievable.</p>
        <p class="copy-text">Where your swimmer appears in the top 100 rankings in the last 12 months, you’ll also see their performance relative to the event leader – giving a true sense of where they sit in the field, not just on paper. Rankings are broken down into top 10, top 20, and top 50, so progress through the competitive field is easy to track over time.</p>
        <p class="copy-heading">Compare. Understand. Improve.</p>
        <p class="copy-text">The performance view isn’t just about your swimmer in isolation. Results can be shared directly from the platform, making it simple to loop in a coach, discuss progress with your club, or keep the wider support network informed. You can also see how their times compare directly against competitors within the same chart – identifying where the gaps are, which events represent the biggest opportunities, and where consistent improvement is already happening.</p>
      </div>
      <CTAButton />
    </div>
  </div>
</template>
