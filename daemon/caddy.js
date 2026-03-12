/**
 * Embedded Caddy manager.
 *
 * Caddy runs as a child process inside the Yantr container. Its config is
 * derived entirely from Docker container labels — no database, no state file.
 *
 * Label schema (applied to app service containers via compose):
 *   yantr.caddy.enabled      = "true"
 *   yantr.caddy.serve.port   = "<host port Caddy listens on>"
 *   yantr.caddy.target.port  = "<localhost port of the app>"
 *   yantr.caddy.auth.user    = "<username>"          (optional)
 *   yantr.caddy.auth.pass    = "<bcrypt hash>"       (optional, never plaintext)
 *
 * On startup, Yantr calls startCaddy() which spawns `caddy run`, waits for
 * its admin API on :2019, then pushes a Caddyfile built from current labels.
 * Any enable/disable operation updates compose labels, redeploys the target
 * stack, and calls reloadCaddyConfig() to push an updated Caddyfile.
 */

import { spawn } from 'child_process'
import { log, docker } from './shared.js'
import { spawnProcess } from './utils.js'
import http from 'node:http'

let caddyProcess = null
const ADMIN_PORT = 2019

function normalizeStoredHash(value) {
  if (!value) return null
  try {
    return Buffer.from(String(value).trim(), 'hex').toString('utf8')
  } catch {
    return null
  }
}

function isValidBcryptHash(value) {
  return /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(String(value || ''))
}

// ── Password hashing ──────────────────────────────────────────────────────────

/**
 * Hash a plaintext password using the `caddy hash-password` CLI.
 * The resulting bcrypt hash is safe to store in a Docker label.
 */
export async function hashPassword(plaintext) {
  const { stdout, stderr, exitCode } = await spawnProcess(
    'caddy',
    ['hash-password', '--plaintext', plaintext],
    { timeout: 8000 }
  )
  if (exitCode !== 0) throw new Error(`caddy hash-password failed: ${stderr || 'unknown error'}`)
  return stdout.trim()
}

// ── Label scanning ────────────────────────────────────────────────────────────

/**
 * Scan all running containers for yantr.caddy.* labels and return a list of
 * proxy descriptors. This is the single source of truth for Caddy config.
 */
export async function getCaddyProxies() {
  try {
    const containers = await docker.listContainers({ all: false })
    const proxies = []
    for (const c of containers) {
      const labels = c.Labels || {}
      if (labels['yantr.caddy.enabled'] !== 'true') continue
      const servePort = Number(labels['yantr.caddy.serve.port'])
      const targetPort = Number(labels['yantr.caddy.target.port'])
      if (!servePort || !targetPort) continue
      proxies.push({
        containerName: (c.Names[0] || '').replace(/^\//, ''),
        containerId: c.Id,
        projectId: labels['com.docker.compose.project'] || null,
        servePort,
        targetPort,
        authUser: labels['yantr.caddy.auth.user'] || null,
        authPassHash: normalizeStoredHash(labels['yantr.caddy.auth.pass']),
      })
    }
    return proxies
  } catch (err) {
    log('error', `[caddy] Failed to scan proxy labels: ${err.message}`)
    return []
  }
}

// ── Caddyfile builder ─────────────────────────────────────────────────────────

function buildCaddyfile(proxies) {
  if (!proxies.length) return ''
  return proxies.map(p => {
    // Hash present but corrupted (e.g. old deploy before $-escaping fix) →
    // block access entirely rather than silently removing authentication.
    if (p.authUser && p.authPassHash && !isValidBcryptHash(p.authPassHash)) {
      log('warn', `[caddy] Corrupted bcrypt hash for proxy :${p.servePort} — blocking access. Disable and re-enable the proxy to fix.`)
      return `:${p.servePort} {\n    respond "Auth proxy misconfigured. Disable and re-enable the proxy in Yantr to restore access." 503\n}`
    }

    const authBlock = (p.authUser && p.authPassHash)
      ? `    basic_auth * {\n        ${p.authUser} ${p.authPassHash}\n    }\n`
      : ''
    return `:${p.servePort} {\n${authBlock}    reverse_proxy localhost:${p.targetPort}\n}`
  }).join('\n\n')
}

// ── Admin API helpers ─────────────────────────────────────────────────────────

function adminPost(path, body, contentType) {
  return new Promise((resolve, reject) => {
    const bodyBuf = Buffer.from(body)
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: ADMIN_PORT,
        path,
        method: 'POST',
        headers: {
          'Content-Type': contentType,
          'Content-Length': bodyBuf.length,
        },
      },
      (res) => {
        let data = ''
        res.on('data', d => { data += d })
        res.on('end', () => resolve({ status: res.statusCode, body: data }))
      }
    )
    req.on('error', reject)
    req.write(bodyBuf)
    req.end()
  })
}

async function waitForAdminApi(retries = 20, delayMs = 300) {
  for (let i = 0; i < retries; i++) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.request(
          { hostname: '127.0.0.1', port: ADMIN_PORT, path: '/config/', method: 'GET' },
          res => resolve(res.statusCode)
        )
        req.on('error', reject)
        req.end()
      })
      return true
    } catch {
      await new Promise(r => setTimeout(r, delayMs))
    }
  }
  return false
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

export async function startCaddy() {
  if (caddyProcess) return true
  try {
    caddyProcess = spawn('caddy', ['run'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
    })

    caddyProcess.stdout?.on('data', d => log('info', `[caddy] ${d.toString().trimEnd()}`))
    caddyProcess.stderr?.on('data', d => log('info', `[caddy] ${d.toString().trimEnd()}`))

    caddyProcess.on('exit', code => {
      log('info', `[caddy] process exited (code ${code})`)
      caddyProcess = null
    })

    caddyProcess.on('error', err => {
      if (err.code === 'ENOENT') {
        log('warn', '⚠️  caddy binary not found — embedded proxy unavailable')
      } else {
        log('error', `[caddy] process error: ${err.message}`)
      }
      caddyProcess = null
    })

    const ready = await waitForAdminApi()
    if (!ready) {
      log('warn', '⚠️  Caddy admin API did not become ready in time')
      return false
    }

    log('info', '🔒 Caddy started (admin API :2019)')
    await reloadCaddyConfig()
    return true
  } catch (err) {
    log('error', `Failed to start Caddy: ${err.message}`)
    return false
  }
}

/**
 * Rebuild the Caddyfile from current container labels and push it to Caddy's
 * admin API. Safe to call at any time; no-ops gracefully if no proxies exist.
 */
export async function reloadCaddyConfig() {
  const proxies = await getCaddyProxies()
  if (!proxies.length) {
    log('info', '[caddy] No proxy routes configured')
    return { proxies }
  }
  const caddyfile = buildCaddyfile(proxies)
  try {
    const res = await adminPost('/load', caddyfile, 'text/caddyfile')
    if (res.status < 300) {
      log('info', `🔒 Caddy reloaded: ${proxies.length} active proxy route(s)`)
    } else {
      log('error', `[caddy] Config load failed (${res.status}): ${res.body}`)
    }
  } catch (err) {
    log('error', `[caddy] Reload request failed: ${err.message}`)
  }
  return { proxies }
}

export function isRunning() {
  return caddyProcess !== null
}

export function stopCaddy() {
  caddyProcess?.kill()
  caddyProcess = null
}
