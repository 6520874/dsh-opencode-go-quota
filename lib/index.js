/**
 * dsh-opencode-go-quota — host half.
 *
 * Reads the official OpenCode Go subscription usage (`GET <baseURL>/usage`) with
 * the already configured API key and exposes one read-only Remote method to the
 * browser half. The key never leaves the host process.
 *
 * The Remote contract mirrors the generated-artifact shape used by shipped DSH
 * packages: a strict JSON result codec plus one direct invocation descriptor,
 * registered through `ctx.typert.register` and served by a
 * `TypertRemoteService` subclass.
 */

import { RemoteError, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import { launchEnvironmentOf } from '@deepseek-ai/dsh-launch-environment'

export const name = 'opencode-go-quota'

const PACKAGE_NAME = 'dsh-opencode-go-quota'
const SERVICE_NAME = 'opencodeGoQuota'
const DEFAULT_BASE_URL = 'https://opencode.ai/inference/go/v1'
const DEFAULT_API_KEY_ENV = 'OPENCODE_GO_API_KEY'
const DEFAULT_REFRESH_MS = 15_000
const MIN_REFRESH_MS = 3_000
const MAX_REFRESH_MS = 600_000
const FETCH_TIMEOUT_MS = 10_000
const MAX_RESPONSE_BYTES = 512 * 1024
const WINDOW_KEYS = ['rolling', 'weekly', 'monthly']

/** A quota read failure carrying a stable, client-displayable reason. */
class QuotaError extends Error {
  constructor(reason, message, retryable) {
    super(message)
    this.reason = reason
    this.retryable = retryable !== false
  }
}

function normalizeConfig(raw) {
  const source = raw !== null && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
  const baseURL =
    typeof source.baseURL === 'string' && source.baseURL.trim() !== ''
      ? source.baseURL.trim().replace(/\/+$/, '')
      : DEFAULT_BASE_URL
  const apiKeyEnv =
    typeof source.apiKeyEnv === 'string' && /^[A-Za-z_][A-Za-z0-9_]*$/.test(source.apiKeyEnv)
      ? source.apiKeyEnv
      : DEFAULT_API_KEY_ENV
  const requestedRefresh = Number(source.refreshMs)
  const refreshMs = Number.isFinite(requestedRefresh)
    ? Math.min(MAX_REFRESH_MS, Math.max(MIN_REFRESH_MS, Math.round(requestedRefresh)))
    : DEFAULT_REFRESH_MS
  return { baseURL, apiKeyEnv, refreshMs }
}

function clampPercent(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  return Math.min(100, Math.max(0, value))
}

function formatRemoteMessage(error) {
  if (error && typeof error === 'object' && typeof error.message === 'string' && error.message !== '') return error.message
  return 'OpenCode Go usage is unavailable'
}

function fail(code, message, details, cause) {
  return new RemoteError(code, message, details, cause === undefined ? undefined : { cause })
}

/* ------------------------------------------------------------------ *
 * Result codec (shared shape with the browser half; kept strict)
 * ------------------------------------------------------------------ */

function parseWindow(row) {
  if (row === null || typeof row !== 'object' || Array.isArray(row)) throw new Error('Invalid quota window')
  if (row.status !== 'ok' && row.status !== 'rate-limited') throw new Error('Invalid quota window status')
  const used = clampPercent(row.usedPercent)
  const remaining = clampPercent(row.remainingPercent)
  if (used === undefined || remaining === undefined) throw new Error('Invalid quota window percentage')
  if (typeof row.resetsAt !== 'string' || !Number.isFinite(Date.parse(row.resetsAt))) throw new Error('Invalid quota reset time')
  return { status: row.status, usedPercent: used, remainingPercent: remaining, resetsAt: row.resetsAt }
}

export function parseQuotaSnapshot(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid quota snapshot')
  const { fetchedAt, source, stale, error, windows } = value
  if (typeof fetchedAt !== 'number' || !Number.isSafeInteger(fetchedAt) || fetchedAt < 0) throw new Error('Invalid quota timestamp')
  if (source !== undefined && (typeof source !== 'string' || source.length === 0 || source.length > 128)) throw new Error('Invalid quota source')
  if (stale !== undefined && typeof stale !== 'boolean') throw new Error('Invalid quota staleness')
  if (error !== undefined && (typeof error !== 'string' || error.length > 512)) throw new Error('Invalid quota error text')
  if (windows === null || typeof windows !== 'object' || Array.isArray(windows)) throw new Error('Invalid quota windows')
  const parsed = {}
  for (const key of WINDOW_KEYS) parsed[key] = parseWindow(windows[key])
  return {
    fetchedAt,
    ...(source === undefined ? {} : { source }),
    ...(stale === undefined ? {} : { stale }),
    ...(error === undefined ? {} : { error }),
    windows: parsed
  }
}

const resultCodec = {
  mode: 'strict',
  typeSymbol: `${PACKAGE_NAME}#QuotaSnapshot`,
  schema: { parse: parseQuotaSnapshot },
  create: () => ({ parse: parseQuotaSnapshot })
}

export const quotaRemote = {
  package: PACKAGE_NAME,
  descriptors: [
    {
      id: `${PACKAGE_NAME}#${SERVICE_NAME}/read`,
      service: SERVICE_NAME,
      namespace: SERVICE_NAME,
      method: 'read',
      invocation: { kind: 'direct' },
      parameters: [],
      result: resultCodec
    }
  ]
}

/* ------------------------------------------------------------------ *
 * Credential resolution
 * ------------------------------------------------------------------ */

async function resolveApiKey(ctx, ref) {
  const credentials = ctx.get('credentials')
  if (credentials !== undefined) {
    try {
      const hit = await credentials.resolve(credentialRef(ref))
      if (hit !== undefined && typeof hit.value === 'string' && hit.value !== '') return hit.value
    } catch {
      // Fall through to the launch environment.
    }
  }
  try {
    const launched = launchEnvironmentOf(ctx).get(ref)?.value
    if (typeof launched === 'string' && launched !== '') return launched
  } catch {
    // The launch environment is optional in some compositions.
  }
  const fromProcess = typeof process !== 'undefined' ? process.env?.[ref] : undefined
  if (typeof fromProcess === 'string' && fromProcess !== '') return fromProcess
  throw new QuotaError(
    'missing-credential',
    `OpenCode Go API key "${ref}" is not configured; store ${ref} through the credentials service or export it`,
    false
  )
}

/* ------------------------------------------------------------------ *
 * Usage transport
 * ------------------------------------------------------------------ */

async function requestUsage(baseURL, key) {
  const url = `${baseURL}/usage`
  let response
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        authorization: `Bearer ${key}`,
        accept: 'application/json',
        'user-agent': `${PACKAGE_NAME}/0.2.0`
      },
      redirect: 'error',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
    })
  } catch (error) {
    throw new QuotaError('network', `Could not reach ${url}: ${formatRemoteMessage(error)}`, true)
  }

  let text
  try {
    text = await response.text()
  } catch (error) {
    throw new QuotaError('network', `Could not read ${url}: ${formatRemoteMessage(error)}`, true)
  }
  if (text.length > MAX_RESPONSE_BYTES) {
    throw new QuotaError('invalid-response', `OpenCode Go usage response exceeds ${MAX_RESPONSE_BYTES} bytes`, false)
  }

  if (!response.ok) {
    const hint = response.status === 401 || response.status === 403 ? ' — check the API key and Go subscription' : ''
    throw new QuotaError(
      response.status === 401 || response.status === 403 ? 'unauthorized' : 'http',
      `OpenCode Go usage unavailable (HTTP ${response.status})${hint}`,
      response.status === 408 || response.status === 429 || response.status >= 500
    )
  }

  let payload
  try {
    payload = JSON.parse(text)
  } catch {
    throw new QuotaError('invalid-response', 'OpenCode Go usage response is not valid JSON', false)
  }
  const usage = payload !== null && typeof payload === 'object' && payload.usage !== undefined ? payload.usage : payload
  if (usage === null || typeof usage !== 'object' || Array.isArray(usage)) {
    throw new QuotaError('invalid-response', 'OpenCode Go usage response has an unexpected shape', false)
  }

  const windows = {}
  for (const key of WINDOW_KEYS) {
    const row = usage[key]
    if (row === null || typeof row !== 'object') {
      throw new QuotaError('invalid-response', `OpenCode Go usage response is missing the ${key} window`, false)
    }
    const used = clampPercent(row.percent)
    if (used === undefined) {
      throw new QuotaError('invalid-response', `OpenCode Go usage response has an invalid ${key} percentage`, false)
    }
    if (typeof row.resetsAt !== 'string' || !Number.isFinite(Date.parse(row.resetsAt))) {
      throw new QuotaError('invalid-response', `OpenCode Go usage response has an invalid ${key} reset time`, false)
    }
    const status = row.status === 'rate-limited' ? 'rate-limited' : 'ok'
    windows[key] = {
      status,
      usedPercent: used,
      remainingPercent: Math.round((100 - used) * 10) / 10,
      resetsAt: row.resetsAt
    }
  }
  return windows
}

/* ------------------------------------------------------------------ *
 * Remote service
 * ------------------------------------------------------------------ */

class QuotaService extends TypertRemoteService {
  constructor(ctx, options) {
    super(ctx, SERVICE_NAME)
    this.options = options
    this.last = undefined
    this.pending = undefined
  }

  async read() {
    const now = Date.now()
    if (this.last !== undefined && now - this.last.fetchedAt < this.options.refreshMs()) {
      return this.last.value
    }
    if (this.pending !== undefined) return this.pending
    const pending = this.load().then(
      (value) => {
        this.pending = undefined
        this.last = { fetchedAt: value.fetchedAt, value }
        return value
      },
      (error) => {
        this.pending = undefined
        throw error
      }
    )
    this.pending = pending
    return pending
  }

  async load() {
    try {
      const key = await this.options.resolveApiKey()
      const windows = await requestUsage(this.options.baseURL(), key)
      return { fetchedAt: Date.now(), source: this.options.apiKeyEnv(), windows }
    } catch (error) {
      if (this.last !== undefined) {
        return { ...this.last.value, stale: true, error: formatRemoteMessage(error) }
      }
      if (error instanceof RemoteError) throw error
      throw fail(
        `${PACKAGE_NAME}/unavailable`,
        formatRemoteMessage(error),
        { reason: typeof error?.reason === 'string' ? error.reason : 'unknown', retryable: error?.retryable !== false },
        error
      )
    }
  }
}

/* ------------------------------------------------------------------ *
 * Cordis plugin
 * ------------------------------------------------------------------ */

export function apply(ctx, raw) {
  const config = normalizeConfig(raw)

  ctx.inject(['typert'], (scope) => {
    scope.effect(
      () =>
        scope.typert.register({
          package: quotaRemote.package,
          face: 'host',
          schemas: [],
          model: { services: [], events: [], objects: [] },
          invocations: quotaRemote.descriptors
        }),
      'opencode-go-quota: Remote invocations'
    )
  })

  ctx.plugin(QuotaService, {
    baseURL: () => config.baseURL,
    apiKeyEnv: () => config.apiKeyEnv,
    refreshMs: () => config.refreshMs,
    resolveApiKey: () => resolveApiKey(ctx, config.apiKeyEnv)
  })

  ctx.effect(
    () => () => {
      ctx.logger?.info?.('opencode-go-quota: stopped')
    },
    'opencode-go-quota: lifecycle log'
  )
  ctx.logger?.info?.(`opencode-go-quota: reading ${config.baseURL}/usage as ${config.apiKeyEnv}`)
}
