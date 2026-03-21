<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";
import { Layers, Database, Box, HardDrive, Cpu, Zap } from "lucide-vue-next";
import { useApiUrl } from "../composables/useApiUrl";

const { t } = useI18n();
const { apiUrl } = useApiUrl();

const containers = ref([]);
const volumes = ref([]);
const images = ref([]);
let refreshInterval = null;

async function fetchData() {
  try {
    const [cRes, vRes, iRes] = await Promise.all([
      fetch(`${apiUrl.value}/api/containers`),
      fetch(`${apiUrl.value}/api/volumes`),
      fetch(`${apiUrl.value}/api/images`),
    ]);
    const [cData, vData, iData] = await Promise.all([cRes.json(), vRes.json(), iRes.json()]);
    if (cData.success) containers.value = cData.containers;
    if (vData.success) volumes.value = vData.volumes || [];
    if (iData.success) images.value = iData.images || [];
  } catch {}
}

onMounted(() => {
  fetchData();
  refreshInterval = setInterval(fetchData, 15000);
});

onUnmounted(() => {
  if (refreshInterval) clearInterval(refreshInterval);
});

const runningApps = computed(() => containers.value.filter(c => c.state === "running").length);
const totalVolumes = computed(() => volumes.value.length);
const imagesCount = computed(() => images.value.length);
const temporaryCount = computed(() => containers.value.filter(c => c?.labels?.["yantr.expireAt"]).length);

const greeting = computed(() => {
  const hour = new Date().getHours();
  if (hour < 5) return t("home.overviewPulseCard.lateNightCoding");
  if (hour < 12) return t("home.overviewPulseCard.goodMorning");
  if (hour < 18) return t("home.overviewPulseCard.goodAfternoon");
  return t("home.overviewPulseCard.goodEvening");
});

const stats = computed(() => [
  {
    key: "apps",
    label: t("home.overviewPulseCard.apps"),
    value: runningApps.value,
    icon: Layers,
    color: "text-blue-500",
  },
  {
    key: "volumes",
    label: t("home.overviewPulseCard.volumes"),
    value: totalVolumes.value,
    icon: HardDrive,
    color: "text-violet-500",
  },
  {
    key: "images",
    label: t("home.overviewPulseCard.images"),
    value: imagesCount.value,
    icon: Database,
    color: "text-green-500",
  },
  {
    key: "temp",
    label: t("home.overviewPulseCard.temp"),
    value: temporaryCount.value,
    icon: Box,
    color: "text-amber-500",
  },
]);
</script>

<template>
  <div class="relative group h-full flex flex-col bg-white dark:bg-[#0A0A0A] rounded-xl overflow-hidden transition-all duration-400 hover:shadow-2xl hover:shadow-black/5 dark:hover:shadow-black/40">
    <div class="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-transparent via-blue-500 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"></div>
    <div class="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMTUwLCAxNTAsIDE1MCwgMC4xKSIvPjwvc3ZnPg==')] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none mask-[linear-gradient(to_bottom,white,transparent)]"></div>

    <div class="relative z-10 flex h-full flex-col p-6">
      <div class="flex items-center gap-3 mb-5">
        <div class="w-10 h-10 rounded-lg bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-all duration-500">
          <Layers class="w-5 h-5 text-gray-400 dark:text-zinc-500 group-hover:text-blue-500 transition-colors" />
        </div>
        <div>
          <h3 class="text-sm font-semibold text-gray-900 dark:text-white tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{{ greeting }}</h3>
          <div class="text-[11px] font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wider mt-1">{{ t("home.overviewPulseCard.systemOnline") }}</div>
        </div>
      </div>

      <p class="text-sm text-gray-500 dark:text-zinc-400 font-medium leading-relaxed mb-4">
        {{ t("home.overviewPulseCard.stackRunningSmoothly") }}
      </p>

      <div class="flex flex-wrap gap-2.5 mb-4">
        <div
          v-for="stat in stats"
          :key="stat.key"
          class="flex min-w-30 flex-1 items-center justify-between gap-3 rounded-lg bg-gray-50 dark:bg-zinc-900/50 border border-gray-100 dark:border-zinc-800/50 px-3 py-2.5 transition-colors group-hover:border-gray-200 dark:group-hover:border-zinc-700/50"
        >
          <div class="flex min-w-0 items-center gap-2">
            <component :is="stat.icon" :class="['w-3.5 h-3.5 shrink-0', stat.color]" />
            <span class="truncate text-[10px] font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">{{ stat.label }}</span>
          </div>
          <div class="text-lg font-bold text-gray-900 dark:text-white tabular-nums tracking-tight">{{ stat.value }}</div>
        </div>
      </div>

      <div class="mt-auto pt-3 border-t border-gray-100 dark:border-zinc-800/80 flex items-center flex-wrap gap-2">
        <div class="px-3 py-1.5 rounded-md bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 flex items-center gap-2 transition-colors group-hover:border-gray-300 dark:group-hover:border-zinc-700">
          <Cpu class="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500" />
          <span class="text-[11px] font-semibold text-gray-600 dark:text-zinc-300 uppercase tracking-wider">{{ t("home.overviewPulseCard.healthy") }}</span>
        </div>
        <div class="px-3 py-1.5 rounded-md bg-blue-50/50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 flex items-center gap-2 transition-colors group-hover:bg-blue-50 dark:group-hover:bg-blue-500/20">
          <Zap class="w-3.5 h-3.5 text-blue-600 dark:text-blue-500" />
          <span class="text-[11px] font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider">{{ t("home.overviewPulseCard.active") }}</span>
        </div>
      </div>
      </div>
  </div>
</template>
