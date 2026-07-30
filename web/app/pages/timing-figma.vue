<script setup lang="ts">
  definePageMeta( {
    layout: "figma-page",
  } )

  const config = useRuntimeConfig()

  useHead( {
    title: `Timing & Analysis — ${ config.public.siteName }`,
  } )
</script>

<template>
  <div class="w-full md:w-[561px] px-5 md:px-0 py-[50px] md:py-[100px] flex flex-col justify-start items-start gap-8 md:gap-10">
    <UI-BackLink />
    <div class="flex flex-col justify-start items-start gap-8 md:gap-10">
      <div class="text-slate-900 text-[32px] md:text-[64px] font-extrabold font-['Bricolage_Grotesque'] uppercase leading-8 md:leading-[56px]">
        <span class="md:hidden">Timing</span><span class="hidden md:inline">Timing & Analysis</span>
      </div>
      <img class="w-full md:w-[555px] h-[190px] rounded-sm object-cover" src="/images/home/Block-I-Timing-Img.png" >
      <div class="text-slate-900 text-2xl md:text-[32px] font-extrabold font-['Bricolage_Grotesque'] leading-8">
        <span class="md:hidden">Race-day timing. Poolside-ready.</span><span class="hidden md:inline">From poolside to playback. Every <br>detail captured.</span>
      </div>
      <div class="text-black text-xl font-normal font-['DM_Sans'] leading-[26px]">Time your swimmer live with our built-in timer, adapted for mobile use. Upload videos of your swimmer and set markers throughout their race to accurately document their strategy and technique. Compare results between strokes and races.</div>
    </div>
    <div class="flex flex-col justify-start items-start gap-8">
      <img class="w-full aspect-[561/484] object-cover" src="/images/home/Block-K-Timing-img1.png" >
      <div>
        <span class="text-black text-xl font-normal font-['DM_Sans'] leading-[26px]">Coaching instinct is irreplaceable. But when you’re a parent on the poolside, or a coach managing multiple swimmers at once, having the right tools to capture, review and analyse what actually happened in the water makes every session count for more.<br><br>Swim Racing’s timing and analysis tools were built for real race-day conditions – fast to use, straightforward to review, and detailed enough to inform genuine improvement.<br><br></span><span class="text-black text-xl font-bold font-['DM_Sans'] leading-[26px]">Live timing<br><br></span><span class="text-black text-xl font-normal font-['DM_Sans'] leading-[26px]">The built-in race timer works directly in your browser – on mobile or desktop – so there’s nothing to download and nothing to set up. Start timing your swimmer and the session is automatically saved, ready to review whenever you need it.</span>
      </div>
      <img class="w-full aspect-[561/236] object-cover" src="/images/home/Block-K-Timing-img2.png" >
      <div>
        <span class="text-black text-xl font-bold font-['DM_Sans'] leading-[26px]">Video library<br><br></span><span class="text-black text-xl font-normal font-['DM_Sans'] leading-[26px]">Upload race or training videos directly to your swimmer’s profile. Once uploaded, you can add tracking markers throughout – logging strokes, time, breath, dive and more at any point in the race. Every tracked video is saved to Sessions, building a library of documented swims you can return to, compare and share.</span>
      </div>
      <img class="w-full aspect-[561/411] rounded-sm object-cover" src="/images/home/Block-F-Img.png" >
      <div>
        <span class="text-black text-xl font-bold font-['DM_Sans'] leading-[26px]">Sessions<br></span><span class="text-black text-xl font-normal font-['DM_Sans'] leading-[26px]"><br>Sessions is where everything comes together. Each saved session – whether timed, video-tracked or both – generates a summary and analysis of your swimmer’s performance. Review comparison charts, time per length, and stroke and breath data by length, giving you a granular breakdown of how each race or training swim actually unfolded.<br><br>For coaches and clubs, the Compare tab allows side-by-side analysis across multiple swimmers – making it straightforward to identify patterns, benchmark progress and tailor training accordingly.</span>
      </div>
    </div>
    <CTAButtonPair />
  </div>
</template>
