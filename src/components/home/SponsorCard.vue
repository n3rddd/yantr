<script setup>
import { ref, onMounted } from "vue";
import { Sparkles, ArrowUpRight, Zap } from "lucide-vue-next";

const sponsor = ref(null);
const visible = ref(false);

onMounted(async () => {
  try {
    const res = await fetch("https://ipfs.io/ipns/sponser.yantr.org");
    if (!res.ok) return;
    const data = await res.json();
    if (data?.heading && data?.link?.url && data?.link?.cta) {
      sponsor.value = data;
      // Slight delay so entrance animation is visible
      setTimeout(() => (visible.value = true), 200);
    }
  } catch {
    // Silently fail — no sponsor card shown
  }
});
</script>

<template>
  <transition
    enter-active-class="transition-all duration-700 ease-out"
    enter-from-class="opacity-0 scale-95 translate-y-3"
    enter-to-class="opacity-100 scale-100 translate-y-0"
  >
    <a
      v-if="visible && sponsor"
      :href="sponsor.link.url"
      target="_blank"
      rel="noopener noreferrer"
      class="sponsor-card relative group h-full flex flex-col rounded-xl overflow-hidden focus:outline-none cursor-pointer"
    >
      <!-- Animated gradient border (always on) -->
      <div class="animated-border absolute inset-0 rounded-xl p-[1.5px]">
        <div class="absolute inset-0 rounded-xl bg-white dark:bg-[#0A0A0A]"></div>
      </div>

      <!-- Pulsing ambient glow behind card -->
      <div class="absolute inset-0 rounded-xl bg-violet-500/5 dark:bg-violet-500/5 group-hover:bg-violet-500/10 transition-all duration-700 blur-sm scale-105"></div>

      <!-- Sweeping shimmer on hover -->
      <div class="shimmer absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none rounded-xl"></div>

      <!-- Dot grid -->
      <div class="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMTM5LCA5MiwgMjQ2LCAwLjEpIi8+PC9zdmc+')] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none [mask-image:linear-gradient(to_bottom,white,transparent)]"></div>

      <!-- Lift + scale on hover -->
      <div class="relative z-10 flex flex-col h-full p-5 transition-transform duration-300 group-hover:-translate-y-0.5">

        <!-- Top badge row -->
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-violet-300/60 dark:border-violet-700/60 bg-violet-50 dark:bg-violet-950/40">
            <!-- Live dot -->
            <span class="relative flex h-1.5 w-1.5">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-1.5 w-1.5 bg-violet-500"></span>
            </span>
            <span class="text-[9px] font-bold uppercase tracking-[0.2em] text-violet-600 dark:text-violet-400">Sponsor</span>
          </div>

          <!-- Icon that spins on hover -->
          <div class="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-950/40 border border-violet-200/60 dark:border-violet-800/50 flex items-center justify-center transition-all duration-500 group-hover:rotate-12 group-hover:scale-110 group-hover:bg-violet-100 dark:group-hover:bg-violet-900/40">
            <Sparkles class="w-4 h-4 text-violet-500 group-hover:text-violet-600 dark:group-hover:text-violet-300 transition-colors duration-300" />
          </div>
        </div>

        <!-- Heading -->
        <h3 class="text-sm font-semibold text-gray-900 dark:text-white tracking-tight leading-snug line-clamp-2 mb-2 transition-colors duration-300 group-hover:text-violet-600 dark:group-hover:text-violet-300">
          {{ sponsor.heading }}
        </h3>

        <!-- Subheading -->
        <p
          v-if="sponsor.subheading"
          class="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed line-clamp-3 flex-1 mb-4 transition-colors duration-300 group-hover:text-gray-600 dark:group-hover:text-zinc-300"
        >
          {{ sponsor.subheading }}
        </p>

        <!-- CTA button — slides & glows on hover -->
        <div class="mt-auto">
          <div class="cta-btn relative flex items-center justify-between w-full px-4 py-2.5 rounded-lg border border-violet-300/50 dark:border-violet-700/40 bg-violet-50/80 dark:bg-violet-950/30 overflow-hidden transition-all duration-300 group-hover:border-violet-400 dark:group-hover:border-violet-600 group-hover:bg-violet-100/80 dark:group-hover:bg-violet-900/40 group-hover:shadow-lg group-hover:shadow-violet-400/10">
            <!-- Button shimmer sweep -->
            <div class="btn-shimmer absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none"></div>

            <div class="flex items-center gap-2 relative z-10">
              <Zap class="w-3.5 h-3.5 text-violet-500 transition-transform duration-300 group-hover:scale-110" />
              <span class="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">
                {{ sponsor.link.cta }}
              </span>
            </div>

            <ArrowUpRight
              class="relative z-10 w-3.5 h-3.5 text-violet-500 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-violet-600 dark:group-hover:text-violet-300"
            />
          </div>
        </div>
      </div>
    </a>
  </transition>
</template>

<style scoped>
/* ── Animated spinning-conic gradient border ── */
.animated-border::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 0.75rem;
  padding: 1.5px;
  background: conic-gradient(
    from var(--angle, 0deg),
    transparent 20%,
    #7c3aed 40%,
    #a78bfa 50%,
    #7c3aed 60%,
    transparent 80%
  );
  -webkit-mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  animation: spin-border 3s linear infinite;
}

@property --angle {
  syntax: "<angle>";
  initial-value: 0deg;
  inherits: false;
}

@keyframes spin-border {
  to {
    --angle: 360deg;
  }
}

/* ── Card-level shimmer sweep ── */
.shimmer::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(
    105deg,
    transparent 30%,
    rgba(139, 92, 246, 0.08) 50%,
    transparent 70%
  );
  transform: translateX(-100%);
  animation: shimmer-sweep 1.4s ease-in-out infinite;
}

@keyframes shimmer-sweep {
  to {
    transform: translateX(100%);
  }
}

/* ── CTA button shimmer ── */
.btn-shimmer::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 20%,
    rgba(139, 92, 246, 0.15) 50%,
    transparent 80%
  );
  transform: translateX(-100%);
  animation: btn-sweep 1.8s ease-in-out infinite;
}

@keyframes btn-sweep {
  to {
    transform: translateX(200%);
  }
}
</style>
