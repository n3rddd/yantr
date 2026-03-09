<script setup>
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { ChevronRight, HardDrive, Layers, Wrench } from "lucide-vue-next";

const router = useRouter();
const { t } = useI18n();

const tools = [
  {
    title: t("home.toolsNavCard.images"),
    path: "/images",
    description: t("home.toolsNavCard.imagesDesc"),
    icon: Layers,
    color: "text-blue-500",
  },
  {
    title: t("home.toolsNavCard.volumes"),
    path: "/volumes",
    description: t("home.toolsNavCard.volumesDesc"),
    icon: HardDrive,
    color: "text-emerald-500",
  },
];
</script>

<template>
  <div class="relative group isolate h-full flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition-all duration-500 hover:-translate-y-1 hover:border-blue-200 hover:shadow-2xl hover:shadow-blue-500/10 dark:border-zinc-800 dark:bg-[#0A0A0A] dark:hover:border-blue-500/30 dark:hover:shadow-black/40">
    <div class="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
      <div class="absolute inset-x-0 top-0 h-0.5 bg-blue-500 opacity-0 transition-opacity duration-500 group-hover:opacity-100"></div>
      <div class="absolute -left-10 top-8 h-28 w-28 rounded-full bg-blue-500/10 blur-2xl pulse-cloud"></div>
      <div class="absolute right-0 top-0 h-24 w-24 rounded-full bg-emerald-500/10 blur-2xl pulse-cloud" style="animation-delay: 1.2s"></div>
    </div>

    <div class="relative z-10 flex h-full flex-col p-6">
      <div class="flex items-start gap-4 mb-6">
        <div class="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-gray-100 bg-gray-50 dark:border-zinc-800 dark:bg-zinc-900 icon-shell">
          <div class="absolute inset-0 rounded-2xl border border-blue-500/0 group-hover:border-blue-500/20 transition-colors duration-500"></div>
          <Wrench class="w-5 h-5 text-gray-400 dark:text-zinc-500 icon-float group-hover:text-blue-500 transition-colors duration-300" />
        </div>

        <div class="min-w-0">
          <h3 class="text-sm font-semibold text-gray-900 dark:text-white tracking-tight transition-colors duration-300 group-hover:text-blue-600 dark:group-hover:text-blue-400">
            {{ t("home.toolsNavCard.systemTools") }}
          </h3>
          <div class="mt-1 text-[11px] font-medium uppercase tracking-wider text-gray-500 dark:text-zinc-400">
            {{ t("home.toolsNavCard.images") }} & {{ t("home.toolsNavCard.volumes") }}
          </div>
          <div class="mt-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400 dark:text-zinc-500">
            <span class="inline-flex h-2 w-2 rounded-full bg-blue-500 status-ping"></span>
            <span>Quick Access</span>
          </div>
        </div>
      </div>

      <div class="mt-auto flex flex-col gap-3">
        <button
          v-for="(tool, index) in tools"
          :key="tool.title"
          @click="router.push(tool.path)"
          class="tool-row group/btn relative flex items-center justify-between overflow-hidden rounded-xl border border-gray-100 bg-gray-50/95 p-3.5 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-gray-300 hover:bg-white dark:border-zinc-800/80 dark:bg-zinc-900/60 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
          :style="{ animationDelay: `${index * 120}ms` }"
        >
          <div class="absolute inset-y-0 left-0 w-1 rounded-r-full bg-blue-500/0 transition-colors duration-300 group-hover/btn:bg-blue-500"></div>

          <div class="relative z-10 flex min-w-0 items-center gap-3.5">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-300 group-hover/btn:scale-105 group-hover/btn:border-gray-300 dark:border-zinc-700 dark:bg-zinc-950/70 dark:group-hover/btn:border-zinc-600">
              <component :is="tool.icon" :class="['w-4 h-4 shrink-0 transition-all duration-300 group-hover/btn:scale-110 group-hover/btn:-translate-y-0.5', tool.color]" />
            </div>
            <div class="flex min-w-0 flex-col text-left">
              <span class="text-xs font-semibold text-gray-900 dark:text-white">{{ tool.title }}</span>
              <span class="text-[10px] text-gray-500 dark:text-zinc-400 truncate">{{ tool.description }}</span>
            </div>
          </div>

          <div class="relative z-10 flex items-center gap-2">
            <span class="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-300 transition-colors duration-300 group-hover/btn:text-blue-500 dark:text-zinc-600 dark:group-hover/btn:text-blue-400">Go</span>
            <ChevronRight class="w-4 h-4 text-gray-400 dark:text-zinc-600 transition-all duration-300 group-hover/btn:text-gray-900 group-hover/btn:translate-x-1 dark:group-hover/btn:text-white" />
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes pulseCloud {
  0%, 100% { transform: scale(0.92); opacity: 0.4; }
  50% { transform: scale(1.08); opacity: 0.9; }
}

@keyframes iconFloat {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-3px) rotate(6deg); }
}

@keyframes statusPing {
  0%, 100% { transform: scale(1); opacity: 0.7; }
  50% { transform: scale(1.35); opacity: 1; }
}

@keyframes rowReveal {
  0% { opacity: 0; transform: translateY(8px); }
  100% { opacity: 1; transform: translateY(0); }
}

.pulse-cloud {
  animation: pulseCloud 6.5s ease-in-out infinite;
}

.icon-shell {
  animation: pulseCloud 7s ease-in-out infinite;
}

.icon-float {
  animation: iconFloat 4s ease-in-out infinite;
}

.status-ping {
  animation: statusPing 2.6s ease-in-out infinite;
}

.tool-row {
  animation: rowReveal 500ms ease-out both;
}

@media (prefers-reduced-motion: reduce) {
  .pulse-cloud,
  .icon-shell,
  .icon-float,
  .status-ping,
  .tool-row {
    animation: none !important;
  }

  .group,
  .group\/btn {
    transition: none !important;
  }
}
</style>
