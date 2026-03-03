<script setup>
import { Heart, ArrowUpRight, MessageCircle, Zap, Star } from "lucide-vue-next";

const perks = [
  { icon: MessageCircle, text: "Direct 1-on-1 support with core developers" },
  { icon: Zap,           text: "Priority feature requests & bug fixes" },
  { icon: Star,          text: "Sponsor badge in the project" },
];
</script>

<template>
  <div class="group relative flex flex-col h-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-[#0A0A0A] overflow-hidden transition-all duration-300 hover:border-violet-300 dark:hover:border-violet-800 hover:-translate-y-1 hover:shadow-xl hover:shadow-violet-500/10">

    <!-- Hover glow line at top -->
    <div class="absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r from-transparent via-violet-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

    <!-- Dot-grid pattern (hover reveal) -->
    <div class="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMTM5LCA5MiwgMjQ2LCAwLjA3KSIvPjwvc3ZnPg==')] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

    <div class="relative z-10 flex flex-col h-full p-5">

      <!-- Header -->
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-violet-300/60 dark:border-violet-700/60 bg-violet-50 dark:bg-violet-950/40">
          <span class="relative flex h-1.5 w-1.5">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-1.5 w-1.5 bg-violet-500"></span>
          </span>
          <span class="text-[9px] font-bold uppercase tracking-[0.2em] text-violet-600 dark:text-violet-400">Support</span>
        </div>
        <div class="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-950/40 border border-violet-200/60 dark:border-violet-800/50 flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:bg-violet-100 dark:group-hover:bg-violet-900/40">
          <Heart class="w-4 h-4 text-violet-500 transition-all duration-300 group-hover:fill-violet-500" />
        </div>
      </div>

      <!-- Headline -->
      <h3 class="text-sm font-semibold text-gray-900 dark:text-white tracking-tight leading-snug mb-1">
        Support Yantr Development
      </h3>
      <p class="text-[11px] text-gray-500 dark:text-zinc-500 leading-relaxed mb-4">
        Sponsoring keeps this project free &amp; actively maintained.
      </p>

      <!-- Perks -->
      <ul class="flex flex-col gap-2 mb-4">
        <li
          v-for="perk in perks"
          :key="perk.text"
          class="flex items-center gap-2"
        >
          <div class="shrink-0 w-5 h-5 rounded-md bg-violet-50 dark:bg-violet-950/40 border border-violet-200/50 dark:border-violet-800/50 flex items-center justify-center">
            <component :is="perk.icon" class="w-2.5 h-2.5 text-violet-500" />
          </div>
          <span class="text-[11px] text-gray-600 dark:text-zinc-400 leading-tight">{{ perk.text }}</span>
        </li>
      </ul>

      <!-- CTA -->
      <div class="mt-auto">
        <a
          href="https://sponsor.besoeasy.com/"
          target="_blank"
          rel="noopener noreferrer"
          class="group/cta relative flex items-center justify-between w-full px-4 py-2.5 rounded-lg border border-violet-300/50 dark:border-violet-700/40 bg-violet-50/80 dark:bg-violet-950/30 overflow-hidden transition-all duration-300 hover:border-violet-400 dark:hover:border-violet-600 hover:bg-violet-100/80 dark:hover:bg-violet-900/40 hover:shadow-lg hover:shadow-violet-400/10"
        >
          <div class="flex items-center gap-2">
            <Heart class="w-3.5 h-3.5 text-violet-500 transition-all duration-300 group-hover/cta:fill-violet-500" />
            <span class="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">
              Become a Sponsor
            </span>
          </div>
          <ArrowUpRight class="w-3.5 h-3.5 text-violet-500 transition-all duration-300 group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5" />
        </a>
      </div>

    </div>
  </div>
</template>

