import path from "path";
import { access, readFile, writeFile, unlink } from "fs/promises";
import YAML from "yaml";

export function getProjectComposeFileName(projectId) {
  return `.compose.${projectId}.yml`;
}

export function getProjectComposePath(appPath, projectId) {
  return path.join(appPath, getProjectComposeFileName(projectId));
}

export function getProjectEnvFileName(projectId) {
  return `.env.${projectId}`;
}

export function getProjectEnvPath(appPath, projectId) {
  return path.join(appPath, getProjectEnvFileName(projectId));
}

export async function getProjectComposeRef(appPath, projectId) {
  const projectComposePath = getProjectComposePath(appPath, projectId);
  try {
    await access(projectComposePath);
    return {
      composePath: projectComposePath,
      composeFile: getProjectComposeFileName(projectId),
      isProjectCompose: true,
    };
  } catch {
    return {
      composePath: path.join(appPath, "compose.yml"),
      composeFile: "compose.yml",
      isProjectCompose: false,
    };
  }
}

export async function readProjectCompose(appPath, projectId) {
  const ref = await getProjectComposeRef(appPath, projectId);
  const content = await readFile(ref.composePath, "utf-8");
  return { ...ref, content };
}

export async function writeProjectCompose(appPath, projectId, composeContent) {
  const composePath = getProjectComposePath(appPath, projectId);
  await writeFile(composePath, composeContent, "utf-8");
  return {
    composePath,
    composeFile: getProjectComposeFileName(projectId),
    isProjectCompose: true,
  };
}

export async function writeProjectEnv(appPath, projectId, environment) {
  const envPath = getProjectEnvPath(appPath, projectId);
  const envEntries = Object.entries(environment || {})
    .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== "")
    .map(([key, value]) => `${key}=${value}`);

  if (envEntries.length === 0) {
    try {
      await unlink(envPath);
    } catch {}
    return { envPath: null, envFile: null };
  }

  await writeFile(envPath, envEntries.join("\n"), "utf-8");
  return {
    envPath,
    envFile: getProjectEnvFileName(projectId),
  };
}

export async function loadProjectEnv(appPath, projectId) {
  const candidatePaths = [
    getProjectEnvPath(appPath, projectId),
    path.join(appPath, ".env"),
  ];

  for (const envPath of candidatePaths) {
    try {
      const content = await readFile(envPath, "utf-8");
      return parseEnvFile(content);
    } catch {}
  }

  return {};
}

export async function getComposeProcessEnv(appPath, projectId, baseEnv = {}) {
  const projectEnv = await loadProjectEnv(appPath, projectId);
  return {
    ...process.env,
    ...projectEnv,
    ...baseEnv,
  };
}

export async function deleteProjectCompose(appPath, projectId) {
  try {
    await unlink(getProjectComposePath(appPath, projectId));
  } catch {}
  try {
    await unlink(getProjectEnvPath(appPath, projectId));
  } catch {}
}

export function getInstanceIdFromProjectId(projectId, appId) {
  if (!projectId || !appId || projectId === appId) return null;
  const match = projectId.match(new RegExp(`^${escapeRegExp(appId)}-(\\d+)$`));
  if (!match) return null;
  const instanceId = Number.parseInt(match[1], 10);
  return Number.isInteger(instanceId) && instanceId > 1 ? instanceId : null;
}

export function parseCompose(content) {
  const parsed = YAML.parse(content);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid compose file");
  }
  if (!parsed.services || typeof parsed.services !== "object") {
    throw new Error("Compose file has no services section");
  }
  return parsed;
}

export function stringifyCompose(compose) {
  return YAML.stringify(compose);
}

export function applyProjectComposeTransforms(compose, { projectId, appId, expiresIn, customPortMappings, extraEnv, masterApp }) {
  const instanceId = getInstanceIdFromProjectId(projectId, appId);
  if (instanceId) {
    applyInstanceTransforms(compose, instanceId);
  }
  if (customPortMappings && Object.keys(customPortMappings).length > 0) {
    applyCustomPortMappings(compose, customPortMappings);
  }
  if (extraEnv && Object.keys(extraEnv).length > 0) {
    applyExtraEnv(compose, extraEnv);
  }
  if (expiresIn) {
    applyExpirationLabels(compose, expiresIn);
  }
  if (masterApp && typeof masterApp === "string" && masterApp.trim()) {
    applyCaddyMasterLabel(compose, masterApp.trim());
  }
  return compose;
}

function applyCaddyMasterLabel(compose, masterApp) {
  for (const service of Object.values(compose.services || {})) {
    if (!service.labels || Array.isArray(service.labels)) {
      service.labels = {};
    }
    service.labels["yantr.caddy.master"] = masterApp;
  }
}

export function buildProjectComposeContent(baseComposeContent, options) {
  const compose = parseCompose(baseComposeContent);
  applyProjectComposeTransforms(compose, options);
  return stringifyCompose(compose);
}

export function applyCurrentPublishedPorts(compose, servicePorts) {
  for (const [serviceName, publishedPorts] of Object.entries(servicePorts || {})) {
    const service = compose.services?.[serviceName];
    if (!service) continue;
    setServicePortBindings(service, publishedPorts);
  }
  return compose;
}

export function setServicePortBindings(service, bindings) {
  const normalizedBindings = (bindings || []).map((binding) => ({
    containerPort: Number.parseInt(binding.containerPort, 10),
    hostPort: binding.hostPort == null || binding.hostPort === "" ? null : Number.parseInt(binding.hostPort, 10),
    protocol: String(binding.protocol || "tcp").toLowerCase(),
  })).filter((binding) => Number.isInteger(binding.containerPort) && (binding.hostPort === null || Number.isInteger(binding.hostPort)) && (binding.protocol === "tcp" || binding.protocol === "udp"));

  const ports = Array.isArray(service.ports) ? [...service.ports] : [];
  const bindingMap = new Map(normalizedBindings.map((binding) => [portKey(binding.containerPort, binding.protocol), binding]));
  const seen = new Set();
  const nextPorts = [];

  for (const entry of ports) {
    const parsed = parseComposePortEntry(entry);
    if (!parsed) {
      nextPorts.push(entry);
      continue;
    }

    const key = portKey(parsed.target, parsed.protocol);
    const nextBinding = bindingMap.get(key);
    if (!nextBinding) {
      nextPorts.push(entry);
      continue;
    }

    nextPorts.push(formatComposePortEntry(entry, nextBinding));
    seen.add(key);
  }

  for (const binding of normalizedBindings) {
    const key = portKey(binding.containerPort, binding.protocol);
    if (seen.has(key)) continue;
    nextPorts.push(formatComposePortEntry(null, binding));
  }

  service.ports = nextPorts;
}

export function parseDockerPortInput(input, defaultProtocol = "tcp") {
  const raw = String(input || "").trim();
  if (!raw) return null;

  const normalizedProtocol = String(defaultProtocol || "tcp").toLowerCase();
  const protocolMatch = raw.match(/^(.*?)(?:\/(tcp|udp))?$/i);
  if (!protocolMatch) return null;

  const body = String(protocolMatch[1] || "").trim();
  const protocol = String(protocolMatch[2] || normalizedProtocol).toLowerCase();
  if (!body || !["tcp", "udp"].includes(protocol)) return null;

  const parts = body.split(":").map((part) => part.trim()).filter(Boolean);
  if (parts.length === 1) {
    const port = Number.parseInt(parts[0], 10);
    if (!isValidPort(port)) return null;
    return { hostPort: null, containerPort: port, protocol, hasExplicitHostPort: false };
  }

  if (parts.length === 2) {
    const hostPort = Number.parseInt(parts[0], 10);
    const containerPort = Number.parseInt(parts[1], 10);
    if (!isValidPort(hostPort) || !isValidPort(containerPort)) return null;
    return { hostPort, containerPort, protocol, hasExplicitHostPort: true };
  }

  return null;
}

function applyInstanceTransforms(compose, instanceId) {
  for (const service of Object.values(compose.services || {})) {
    if (typeof service.container_name === "string" && service.container_name.trim()) {
      service.container_name = `${service.container_name.trim()}-${instanceId}`;
    }
    if (Array.isArray(service.volumes)) {
      service.volumes = service.volumes.map((entry) => suffixServiceVolume(entry, instanceId));
    }
  }

  if (compose.volumes && typeof compose.volumes === "object") {
    const nextVolumes = {};
    for (const [volumeName, volumeConfig] of Object.entries(compose.volumes)) {
      const nextName = `${volumeName}_${instanceId}`;
      if (volumeConfig && typeof volumeConfig === "object" && typeof volumeConfig.name === "string" && volumeConfig.name.trim()) {
        nextVolumes[nextName] = { ...volumeConfig, name: `${volumeConfig.name.trim()}_${instanceId}` };
      } else {
        nextVolumes[nextName] = volumeConfig;
      }
    }
    compose.volumes = nextVolumes;
  }
}

function suffixServiceVolume(entry, instanceId) {
  if (typeof entry !== "string") return entry;
  const parts = entry.split(":");
  if (parts.length < 2) return entry;
  const [source, ...rest] = parts;
  if (!source || source.startsWith("/") || source.startsWith("./") || source.startsWith("../") || source.includes("${")) {
    return entry;
  }
  return [`${source}_${instanceId}`, ...rest].join(":");
}

function applyCustomPortMappings(compose, customPortMappings) {
  for (const service of Object.values(compose.services || {})) {
    if (!Array.isArray(service.ports)) continue;
    service.ports = service.ports.map((entry) => {
      const parsed = parseComposePortEntry(entry);
      if (!parsed) return entry;
      const mappedHostPort = customPortMappings[portKey(parsed.target, parsed.protocol)];
      if (!mappedHostPort) return entry;
      return formatComposePortEntry(entry, {
        containerPort: parsed.target,
        hostPort: Number.parseInt(mappedHostPort, 10),
        protocol: parsed.protocol,
      });
    });
  }
}

function applyExtraEnv(compose, extraEnv) {
  for (const service of Object.values(compose.services || {})) {
    if (Array.isArray(service.environment)) {
      const envObject = {};
      for (const entry of service.environment) {
        const idx = String(entry).indexOf("=");
        if (idx > 0) envObject[String(entry).slice(0, idx)] = String(entry).slice(idx + 1);
        else envObject[String(entry)] = null;
      }
      service.environment = envObject;
    } else if (!service.environment || typeof service.environment !== "object") {
      service.environment = {};
    }
    for (const [key, value] of Object.entries(extraEnv)) {
      service.environment[key.trim()] = value;
    }
  }
}

function applyExpirationLabels(compose, expiresIn) {
  const expiresInHours = Number.parseFloat(expiresIn);
  if (!Number.isFinite(expiresInHours) || expiresInHours <= 0) return;
  const expireAtTimestamp = Math.floor(Date.now() / 1000) + Math.floor(expiresInHours * 3600);

  for (const service of Object.values(compose.services || {})) {
    if (Array.isArray(service.labels)) {
      const labels = new Map();
      for (const entry of service.labels) {
        const idx = String(entry).indexOf(":");
        if (idx > 0) labels.set(String(entry).slice(0, idx).trim(), String(entry).slice(idx + 1).trim());
      }
      labels.set("yantr.expireAt", String(expireAtTimestamp));
      labels.set("yantr.temporary", "true");
      service.labels = [...labels.entries()].map(([key, value]) => `${key}: \"${value}\"`);
      continue;
    }

    if (!service.labels || typeof service.labels !== "object") {
      service.labels = {};
    }
    service.labels["yantr.expireAt"] = String(expireAtTimestamp);
    service.labels["yantr.temporary"] = "true";
  }
}

function parseComposePortEntry(entry) {
  if (typeof entry === "number") {
    return { target: entry, published: null, protocol: "tcp", mode: null, host_ip: null };
  }

  if (typeof entry === "string") {
    const trimmed = entry.trim().replace(/^['"]|['"]$/g, "");
    const match = trimmed.match(/^(?:(\d+):)?(\d+)(?:\/(tcp|udp))?$/i);
    if (!match) return null;
    return {
      published: match[1] ? Number.parseInt(match[1], 10) : null,
      target: Number.parseInt(match[2], 10),
      protocol: String(match[3] || "tcp").toLowerCase(),
      mode: null,
      host_ip: null,
    };
  }

  if (entry && typeof entry === "object") {
    const target = Number.parseInt(entry.target, 10);
    if (!Number.isInteger(target)) return null;
    const published = entry.published == null || entry.published === "" ? null : Number.parseInt(entry.published, 10);
    return {
      target,
      published: Number.isInteger(published) ? published : null,
      protocol: String(entry.protocol || "tcp").toLowerCase(),
      mode: entry.mode || null,
      host_ip: entry.host_ip || null,
    };
  }

  return null;
}

function formatComposePortEntry(originalEntry, binding) {
  const base = parseComposePortEntry(originalEntry);
  const target = Number.parseInt(binding.containerPort, 10);
  const published = binding.hostPort == null || binding.hostPort === "" ? null : Number.parseInt(binding.hostPort, 10);
  const protocol = String(binding.protocol || base?.protocol || "tcp").toLowerCase();
  const hostIp = base?.host_ip || null;
  const mode = base?.mode || null;

  if (published === null) {
    return `${target}${protocol === "tcp" ? "" : `/${protocol}`}`;
  }

  if (originalEntry && typeof originalEntry === "object") {
    return {
      ...originalEntry,
      target,
      published,
      protocol,
      ...(hostIp ? { host_ip: hostIp } : {}),
      ...(mode ? { mode } : {}),
    };
  }

  const hostPrefix = hostIp ? `${hostIp}:` : "";
  const protocolSuffix = protocol === "tcp" ? "" : `/${protocol}`;
  return `${hostPrefix}${published}:${target}${protocolSuffix}`;
}

function portKey(containerPort, protocol) {
  return `${containerPort}/${String(protocol || "tcp").toLowerCase()}`;
}

function isValidPort(port) {
  return Number.isInteger(port) && port >= 1 && port <= 65535;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseEnvFile(content) {
  const env = {};
  for (const rawLine of String(content || "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = line.slice(0, separatorIndex).trim();
    if (!key) continue;

    let value = line.slice(separatorIndex + 1);
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}