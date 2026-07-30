<script setup lang="ts">
  definePageMeta( {
    layout: "figma-page",
  } )

  const config = useRuntimeConfig()

  useHead( {
    title: `About — ${ config.public.siteName }`,
  } )
</script>

<template>
  <div class="w-full md:w-[555px] px-5 md:px-0 py-[50px] md:py-[100px] flex flex-col justify-start items-start gap-8">
    <UI-BackLink />
    <div class="text-slate-900 text-[32px] md:text-[64px] font-extrabold font-['Bricolage_Grotesque'] uppercase leading-8 md:leading-[56px]">About</div>
    <img class="w-full md:w-[555px] h-[190px] rounded-sm object-cover" src="https://placehold.co/555x190" >
    <div class="text-slate-900 text-2xl md:text-[32px] font-extrabold font-['Bricolage_Grotesque'] leading-8">Built by someone who needed it. Designed for everyone who does.</div>
    <div>
      <span class="text-black text-xl font-normal font-['DM_Sans'] leading-[26px]">Swim Racing started with a simple problem. A parent – deeply invested in their child’s passion for competitive swimming, and determined to be the best possible support – found themselves without the tools to do it well.<br><br>The data existed. British Swimming records were there. Competition calendars existed somewhere. Qualifying standards were published. But none of it was in one place, none of it was easy to act on, and none of it was designed with a non-specialist in mind. Supporting a swimmer seriously – understanding their results, knowing what competitions to target, tracking what the qualifying standards actually meant for them – required either a coaching background or hours of manual research.<br><br></span><span class="text-black text-xl font-bold font-['DM_Sans'] leading-[26px]">What Swim Racing is<br></span><span class="text-black text-xl font-normal font-['DM_Sans'] leading-[26px]"><br></span><span class="text-black text-xl font-normal font-['DM_Sans'] leading-[26px]">Swim Racing is the UK’s most complete performance and meet hub for competitive swimmers. It connects automatically to British Swimming records, tracks qualifying standards across every county and region, and brings competition calendars, race results, timing tools and video analysis together in a single platform – detailed enough for coaches, and clear enough for any parent or swimmer to use without a background in performance sport.<br><br>It is the first platform of its kind to prioritise genuine usability alongside genuine data depth. Not a results table. Not a spreadsheet. A properly designed tool that reflects how swimmers, parents, clubs and coaches actually think about performance.<br><br></span><span class="text-black text-xl font-bold font-['DM_Sans'] leading-[26px]">Who it’s for<br></span><span class="text-black text-xl font-normal font-['DM_Sans'] leading-[26px]"><br></span><span class="text-black text-xl font-normal font-['DM_Sans'] leading-[26px]">Swim Racing is built for anyone serious about competitive swimming in the UK – at any level.<br><br>•  </span><span class="text-black text-xl font-bold font-['DM_Sans'] leading-[26px]">Parents</span><span class="text-black text-xl font-normal font-['DM_Sans'] leading-[26px]"> – who want to support their swimmer’s progress without needing a coaching qualification<br>•  </span><span class="text-black text-xl font-bold font-['DM_Sans'] leading-[26px]">Coaches and trainers</span><span class="text-black text-xl font-normal font-['DM_Sans'] leading-[26px]"> – who need detailed, comparable data across a full squad<br>•  </span><span class="text-black text-xl font-bold font-['DM_Sans'] leading-[26px]">Clubs</span><span class="text-black text-xl font-normal font-['DM_Sans'] leading-[26px]"> – managing multiple swimmers, meets and qualification targets simultaneously<br>•  </span><span class="text-black text-xl font-bold font-['DM_Sans'] leading-[26px]">Swimmers</span><span class="text-black text-xl font-normal font-['DM_Sans'] leading-[26px]"> – tracking their own progress and understanding what’s within reach</span>
    </div>
    <CTAButtonPair />
  </div>
</template>
