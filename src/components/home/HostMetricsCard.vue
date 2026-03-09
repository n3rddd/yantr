<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Cpu, HardDrive, MemoryStick, Server, ShieldCheck } from 'lucide-vue-next'
import { formatBytes } from '../../utils/metrics'

const { t } = useI18n()
const props = defineProps({
  apiUrl: { type: String, required: true }
})

const systemInfo = ref(null)
const loading = ref(true)
const error = ref(null)
let refreshInterval = null

// Animated display values
const displayCores = ref(0)
const displayMemBytes = ref(0)
const displayStoragePercent = ref(0)

function countUpTo(targetRef, targetVal, duration = 900) {
  const startVal = targetRef.value
  const startTime = Date.now()
  const tick = () => {
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / duration, 1)
    const eased = 1 - Math.pow(1 - progress, 3)
    targetRef.value = Math.round(startVal + eased * (targetVal - startVal))
    if (progress < 1) requestAnimationFrame(tick)
    else targetRef.value = targetVal
  }
  requestAnimationFrame(tick)
}

const memoryInfo = computed(() => {
  if (!systemInfo.value) return { total: 0, totalFormatted: '0 B' }
  const total = systemInfo.value.memory.total
  return { total, totalFormatted: formatBytes(total) }
})

const displayMemFormatted = computed(() => formatBytes(displayMemBytes.value))

const displayMemParts = computed(() => {
  const [value = '0', unit = 'B'] = displayMemFormatted.value.split(' ')
  return { value, unit }
})

const storageInfo = computed(() => {
  if (!systemInfo.value?.storage) return { used: 0, total: 0, percent: 0, usedFormatted: '0 B', totalFormatted: '0 B', hasData: false }
  const { used, total } = systemInfo.value.storage
  if (used && used > 0) {
    if (total && total > 0) {
      const percent = Math.round((used / total) * 100)
      return { used, total, percent, usedFormatted: formatBytes(used), totalFormatted: formatBytes(total), hasData: true }
    }
    return { used, total: 0, percent: 0, usedFormatted: formatBytes(used), totalFormatted: null, hasData: true }
  }
  return { used: 0, total: 0, percent: 0, usedFormatted: '0 B', totalFormatted: '0 B', hasData: false }
})

const osInfo = computed(() => {
  if (!systemInfo.value?.os) {
    return {
      name: 'Unknown Host',
      type: '--',
      arch: '--',
      kernel: '--'
    }
  }
  return {
    name: systemInfo.value.os.name.replace('Debian GNU/Linux', 'Debian').replace('Ubuntu', 'Ubuntu'),
    type: systemInfo.value.os.type,
    arch: systemInfo.value.os.arch || systemInfo.value.os.architecture,
    kernel: systemInfo.value.os.kernel
  }
})

watch(systemInfo, (info) => {
  if (!info) return
  countUpTo(displayCores, info.cpu?.cores ?? 0)
  countUpTo(displayMemBytes, info.memory?.total ?? 0, 1000)
  if (info.storage?.used > 0 && info.storage?.total > 0) {
    countUpTo(displayStoragePercent, Math.round((info.storage.used / info.storage.total) * 100))
  }
})

async function fetchSystemInfo() {
  try {
    const response = await fetch(`${props.apiUrl}/api/system/info`)
    const data = await response.json()
    if (data.success) {
      systemInfo.value = data.info
      error.value = null
    } else {
      error.value = data.error || 'Failed to fetch system info'
    }
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchSystemInfo()
  refreshInterval = setInterval(fetchSystemInfo, 30000)
})

onUnmounted(() => {
  if (refreshInterval) clearInterval(refreshInterval)
})
</script>

<template>
  <div class="relative group h-full flex flex-col bg-white dark:bg-[#0A0A0A] border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden transition-all duration-300 hover:border-gray-300 dark:hover:border-zinc-700 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20">

    <div class="absolute inset-x-0 top-0 h-px bg-blue-500/50 opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>

    <!-- Loading State -->
    <div v-if="loading" class="relative z-10 p-5 flex-1 flex flex-col items-center justify-center min-h-52">
      <div class="w-2 h-2 bg-blue-500 rounded-full animate-pulse mb-3"></div>
      <span class="text-[10px] font-semibold uppercase tracking-widest text-gray-400">{{ t('quickMetrics.hostMetrics.scanningHost') }}</span>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="relative z-10 p-5 flex flex-col items-center justify-center h-full min-h-52 text-center">
      <div class="border border-red-200 dark:border-red-900/50 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 w-full">
        <span class="block text-[10px] font-bold mb-1 uppercase tracking-widest">{{ t('quickMetrics.hostMetrics.connectionFailed') }}</span>
        <span class="text-xs opacity-80 wrap-break-word line-clamp-2">{{ error }}</span>
      </div>
    </div>

    <!-- Content -->
    <div v-else class="relative z-10 p-5 flex flex-col h-full min-h-52">

      <!-- Header -->
      <div class="flex items-start justify-between gap-4 pb-4 border-b border-gray-100 dark:border-zinc-800/80">
        <div class="min-w-0 pr-2">
          <div class="flex items-center gap-2">
            <Server class="w-4 h-4 text-blue-500" />
            <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 dark:text-zinc-500">{{ t('quickMetrics.hostMetrics.hostSystem') }}</span>
          </div>
          <div class="mt-2 text-base font-semibold text-gray-900 dark:text-white truncate tracking-tight" :title="osInfo.name">
            {{ osInfo.name }}
          </div>
        </div>
        <div class="text-right shrink-0">
          <div class="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-green-200 dark:border-green-500/20 bg-green-50 dark:bg-green-500/10">
            <span class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span class="text-[10px] text-green-600 dark:text-green-400 font-bold uppercase tracking-wider">{{ t('quickMetrics.hostMetrics.online') }}</span>
          </div>
        </div>
      </div>

      <div class="mt-4 space-y-2.5">
        <div class="metric-row group/row flex items-center justify-between gap-3 rounded-xl border border-transparent bg-gray-50 dark:bg-zinc-900/60 px-4 py-3 transition-all duration-200 hover:border-gray-200 dark:hover:border-zinc-800 hover:-translate-y-0.5">
          <div class="flex items-center gap-3 min-w-0">
            <Cpu class="w-4 h-4 text-blue-500 shrink-0 transition-transform duration-200 group-hover/row:scale-110" />
            <span class="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500 dark:text-zinc-400">{{ t('quickMetrics.hostMetrics.processors') }}</span>
          </div>
          <div class="flex items-baseline gap-1 shrink-0">
            <span class="metric-pop text-xl font-bold text-gray-900 dark:text-white tabular-nums tracking-tight">{{ displayCores }}</span>
            <span class="text-[10px] font-medium text-gray-400 dark:text-zinc-500">{{ t('quickMetrics.hostMetrics.cores') }}</span>
          </div>
        </div>

        <div class="metric-row group/row flex items-center justify-between gap-3 rounded-xl border border-transparent bg-gray-50 dark:bg-zinc-900/60 px-4 py-3 transition-all duration-200 hover:border-gray-200 dark:hover:border-zinc-800 hover:-translate-y-0.5">
          <div class="flex items-center gap-3 min-w-0">
            <MemoryStick class="w-4 h-4 text-violet-500 shrink-0 transition-transform duration-200 group-hover/row:scale-110" />
            <span class="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500 dark:text-zinc-400">{{ t('quickMetrics.hostMetrics.memory') }}</span>
          </div>
          <div class="flex items-baseline gap-1 shrink-0">
            <span class="metric-pop text-xl font-bold text-gray-900 dark:text-white tabular-nums tracking-tight">{{ displayMemParts.value }}</span>
            <span class="text-[10px] font-medium text-gray-400 dark:text-zinc-500">{{ displayMemParts.unit }}</span>
          </div>
        </div>

        <div class="metric-row group/row flex items-center justify-between gap-3 rounded-xl border border-transparent bg-gray-50 dark:bg-zinc-900/60 px-4 py-3 transition-all duration-200 hover:border-gray-200 dark:hover:border-zinc-800 hover:-translate-y-0.5">
          <div class="flex items-center gap-3 min-w-0">
            <HardDrive class="w-4 h-4 text-emerald-500 shrink-0 transition-transform duration-200 group-hover/row:scale-110" />
            <span class="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500 dark:text-zinc-400">{{ t('quickMetrics.hostMetrics.dockerVol') }}</span>
          </div>
          <div class="flex items-baseline gap-2 shrink-0 text-right">
            <span class="metric-pop text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
              <span v-if="storageInfo.total > 0">{{ storageInfo.usedFormatted }} / {{ storageInfo.totalFormatted }}</span>
              <span v-else-if="storageInfo.hasData">{{ storageInfo.usedFormatted }}</span>
              <span v-else>0 B</span>
            </span>
            <span v-if="storageInfo.total > 0" class="text-[10px] font-medium text-gray-400 dark:text-zinc-500">{{ displayStoragePercent }}%</span>
          </div>
        </div>
      </div>

      <!-- Footer / Kernel -->
      <div class="mt-auto flex items-center justify-between pt-4 border-t border-gray-100 dark:border-zinc-800/80">
        <div class="flex items-center gap-1.5 text-gray-500 dark:text-zinc-500">
          <ShieldCheck class="w-3.5 h-3.5 text-blue-500" />
          <span class="text-[10px] font-bold uppercase tracking-widest">{{ t('quickMetrics.hostMetrics.kernel', { kernel: osInfo.kernel }) }}</span>
        </div>
        <div class="text-[10px] font-mono text-gray-400 dark:text-zinc-500">{{ osInfo.arch }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes metricPop {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-1px); }
}
.metric-pop {
  animation: metricPop 4s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .metric-pop {
    animation: none !important;
  }
}
</style>
