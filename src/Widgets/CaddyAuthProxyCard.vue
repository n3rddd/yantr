<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Shield, Lock, Eye, EyeOff, CheckCircle, Loader, ChevronDown, User } from 'lucide-vue-next'
import { useApiUrl } from '../composables/useApiUrl'

const { apiUrl } = useApiUrl()

const containers = ref([])
let refreshInterval = null

async function fetchContainers() {
  try {
    const response = await fetch(`${apiUrl.value}/api/containers`)
    const data = await response.json()
    if (data.success) containers.value = data.containers
  } catch {}
}

onMounted(() => {
  fetchContainers()
  refreshInterval = setInterval(fetchContainers, 15000)
})

onUnmounted(() => {
  if (refreshInterval) clearInterval(refreshInterval)
})

const selectedPort = ref('')
const proxyPort = ref('')
const authUser = ref('admin')
const authPass = ref('')
const showPass = ref(false)
const deploying = ref(false)
const deployError = ref('')
const deploySuccess = ref(false)

// Running containers with exposed TCP host ports (include projectId for enable call)
const portOptions = computed(() => {
  const result = []
  for (const c of containers.value) {
    if (c.state !== 'running') continue
    const projectId = c.labels?.['com.docker.compose.project']
    if (!projectId) continue
    const ports = Array.isArray(c.ports) ? c.ports : []
    for (const p of ports) {
      if (p.PublicPort && p.Type === 'tcp') {
        result.push({
          label: `${c.name}  :${p.PrivatePort}`,
          value: `${projectId}:${p.PrivatePort}`,
          projectId,
          targetPort: p.PrivatePort,
        })
      }
    }
  }
  return result
})

const selectedOption = computed(() => portOptions.value.find(o => o.value === selectedPort.value) || null)

const caddyRunning = computed(() =>
  containers.value.some(c => c.labels?.['yantr.caddy.enabled'] === 'true' && c.state === 'running'),
)

const canDeploy = computed(() =>
  selectedOption.value &&
  proxyPort.value &&
  authUser.value.trim() &&
  authPass.value.trim() &&
  !deploying.value,
)

async function deploy() {
  if (!canDeploy.value) return
  deploying.value = true
  deployError.value = ''
  try {
    const res = await fetch(`${apiUrl.value}/api/proxy/enable`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: selectedOption.value.projectId,
        targetPort: Number(selectedOption.value.targetPort),
        servePort: Number(proxyPort.value),
        authUser: authUser.value.trim(),
        authPass: authPass.value,
      }),
    })
    const data = await res.json()
    if (!res.ok || !data.success) {
      deployError.value = data.error || data.message || 'Deployment failed'
    } else {
      deploySuccess.value = true
    }
  } catch (e) {
    deployError.value = e.message || 'Network error'
  } finally {
    deploying.value = false
  }
}
</script>

<template>
  <div class="relative group h-full flex flex-col bg-white dark:bg-[#0A0A0A] rounded-xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-black/5 dark:hover:shadow-black/40 hover:-translate-y-0.5">
    <!-- top accent line -->
    <div class="absolute top-0 left-0 w-full h-0.5 bg-linear-to-r from-transparent via-blue-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

    <!-- success overlay -->
    <transition
      enter-active-class="transition-all duration-500 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
    >
      <div v-if="deploySuccess" class="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/95 dark:bg-[#0A0A0A]/95 rounded-xl gap-3">
        <div class="w-12 h-12 rounded-full bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 flex items-center justify-center">
          <CheckCircle class="w-6 h-6 text-green-600 dark:text-green-400" />
        </div>
        <div class="text-center px-6">
          <p class="text-sm font-semibold text-gray-900 dark:text-white tracking-tight">Auth proxy deployed</p>
          <p class="text-[11px] text-gray-500 dark:text-zinc-400 mt-1">Port <span class="font-mono font-bold text-blue-600 dark:text-blue-400">{{ proxyPort }}</span> is now protected</p>
        </div>
      </div>
    </transition>

    <div class="relative z-10 p-5 flex flex-col h-full gap-4">
      <!-- header -->
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 flex items-center justify-center shrink-0">
            <Shield class="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
          </div>
          <div class="min-w-0">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white tracking-tight leading-none">Auth Proxy</h3>
            <p class="text-[11px] font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wider mt-1">Caddy · Basic Auth</p>
          </div>
        </div>
        <div v-if="caddyRunning" class="shrink-0 flex items-center gap-1.5">
          <div class="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
          <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Running</span>
        </div>
      </div>

      <!-- info strip -->
      <p class="text-[12px] leading-relaxed text-gray-500 dark:text-zinc-400">
        Add a login prompt to any running app. Pick the app port, choose a new protected port, then set credentials.
      </p>

      <!-- form -->
      <div class="flex flex-col gap-3 flex-1">

        <!-- app port selector -->
        <div>
          <label class="block text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 dark:text-zinc-500 mb-1.5">App to protect</label>
          <div class="relative">
            <select
              v-model="selectedPort"
              class="w-full appearance-none rounded-lg border border-gray-200 dark:border-zinc-700/80 bg-gray-50 dark:bg-zinc-900/60 px-3 py-2.5 pr-8 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 dark:focus:border-blue-500 transition-all"
            >
              <option value="" disabled>Select a running port…</option>
              <option v-for="opt in portOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
            <ChevronDown class="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>
          <p v-if="portOptions.length === 0" class="mt-1 text-[10px] text-amber-600 dark:text-amber-400">No running containers with mapped ports found.</p>
        </div>

        <!-- proxy port -->
        <div>
          <label class="block text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 dark:text-zinc-500 mb-1.5">Proxy port (new protected port)</label>
          <input
            v-model="proxyPort"
            type="number"
            min="1024"
            max="65535"
            placeholder="e.g. 56784"
            class="w-full rounded-lg border border-gray-200 dark:border-zinc-700/80 bg-gray-50 dark:bg-zinc-900/60 px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 dark:focus:border-blue-500 transition-all"
          />
        </div>

        <!-- credentials row -->
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 dark:text-zinc-500 mb-1.5">Username</label>
            <div class="relative">
              <User class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-zinc-500" />
              <input
                v-model="authUser"
                type="text"
                autocomplete="off"
                spellcheck="false"
                placeholder="admin"
                class="w-full rounded-lg border border-gray-200 dark:border-zinc-700/80 bg-gray-50 dark:bg-zinc-900/60 pl-8 pr-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 dark:focus:border-blue-500 transition-all"
              />
            </div>
          </div>
          <div>
            <label class="block text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 dark:text-zinc-500 mb-1.5">Password</label>
            <div class="relative">
              <Lock class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-zinc-500" />
              <input
                v-model="authPass"
                :type="showPass ? 'text' : 'password'"
                autocomplete="new-password"
                placeholder="••••••••"
                class="w-full rounded-lg border border-gray-200 dark:border-zinc-700/80 bg-gray-50 dark:bg-zinc-900/60 pl-8 pr-8 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 dark:focus:border-blue-500 transition-all"
              />
              <button
                type="button"
                @click="showPass = !showPass"
                class="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300"
              >
                <Eye v-if="!showPass" class="w-3.5 h-3.5" />
                <EyeOff v-else class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <!-- error -->
        <p v-if="deployError" class="text-[11px] text-red-500 dark:text-red-400 font-medium">{{ deployError }}</p>

        <!-- deploy button -->
        <button
          type="button"
          :disabled="!canDeploy"
          @click="deploy"
          class="mt-auto w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-semibold tracking-tight transition-all duration-200"
          :class="canDeploy
            ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm hover:shadow-md'
            : 'bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500 cursor-not-allowed'"
        >
          <Loader v-if="deploying" class="w-4 h-4 animate-spin" />
          <Shield v-else class="w-4 h-4" />
          {{ deploying ? 'Deploying…' : 'Deploy Auth Proxy' }}
        </button>
      </div>
    </div>
  </div>
</template>
