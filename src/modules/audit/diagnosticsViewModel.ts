import type { DiagnosticsFinding, DiagnosticsLogLine, DiagnosticsSpanSummary, RequestDiagnosticsResult } from '@/shared/types/platform'

export type DiagnosticsSeverity = 'info' | 'warning' | 'error'

export interface DiagnosticsStageView {
  key: string
  label: string
  status: 'ok' | 'warning' | 'failed' | 'unknown'
  detail: string
}

export interface DiagnosticsKeyValue {
  label: string
  value: string
}

export interface DiagnosticsViewModel {
  requestID: string
  traceID?: string
  health: 'healthy' | 'degraded' | 'failed' | 'unknown'
  headline: string
  path: string[]
  services: string[]
  businessStages: DiagnosticsStageView[]
  failure: {
    title: string
    detail: string
    severity: DiagnosticsSeverity
  }
  likelyCause: string
  nextSteps: string[]
  productContext: DiagnosticsKeyValue[]
  findings: DiagnosticsFinding[]
  timeline: DiagnosticsKeyValue[]
  recentEvents: DiagnosticsKeyValue[]
  diagnosticsEnabled: boolean
}

const SENSITIVE_KEY_PATTERN = /(token|secret|password|authorization|cookie|credential|storage_key|signed|url|prompt|api[_-]?key|access[_-]?key|private|email|phone)/i
const ECOM_HINT_PATTERN = /(ecom|commerce|listing|template|product|workspace|asset|image|runtime|charge|meter|wallet|callback|download)/i

const display = (value: unknown, fallback = '—') => {
  if (value === undefined || value === null) return fallback
  const text = String(value).trim()
  return text || fallback
}

const redactText = (value: string) => value
  .replace(/bearer\s+[a-z0-9._~+/-]+=*/gi, 'Bearer [redacted]')
  .replace(/(["']?(authorization|token|secret|password|credential|cookie|api[_-]?key|access[_-]?key)["']?\s*[:=]\s*["']?)([^\s,"'&}]+)/gi, '$1[redacted]')
  .replace(/(["']?(storage_key|signed_url|url|prompt)["']?\s*[:=]\s*["']?)([^\s,"'&}]+)/gi, '$1[redacted]')
  .replace(/https?:\/\/\S+/gi, '[redacted-url]')

const unique = (values: Array<string | undefined | null>) => Array.from(new Set(values.map(value => display(value, '')).filter(Boolean)))

const getField = (line: DiagnosticsLogLine | undefined, keys: string[]) => {
  if (!line) return ''
  for (const key of keys) {
    const direct = (line as unknown as Record<string, unknown>)[key]
    if (direct !== undefined && direct !== null && String(direct).trim()) return String(direct)
    const field = line.fields?.[key]
    if (field !== undefined && field !== null && String(field).trim()) return String(field)
  }
  return ''
}

const hasSensitiveKey = (key: string) => SENSITIVE_KEY_PATTERN.test(key)

const safeValue = (key: string, value: unknown) => {
  if (hasSensitiveKey(key)) return '[redacted]'
  if (value === undefined || value === null) return '—'
  if (typeof value === 'object') return '[object]'
  const text = redactText(String(value).trim())
  return text.length > 96 ? `${text.slice(0, 93)}...` : text || '—'
}

const lineMatches = (line: DiagnosticsLogLine, pattern: RegExp) => {
  if (pattern.test(display(line.service, ''))) return true
  if (pattern.test(display(line.message, ''))) return true
  return Object.entries(line.fields ?? {}).some(([key, value]) => pattern.test(key) || pattern.test(display(value, '')))
}

const serviceLabel = (value: string) => {
  const lower = value.toLowerCase()
  if (lower.includes('platform')) return 'Platform service'
  if (lower.includes('commerce') || lower.includes('ecom')) return 'Commerce service'
  if (lower.includes('gateway')) return 'Gateway'
  return value
}

const statusFrom = (hasEvidence: boolean, failed: boolean, warning = false): DiagnosticsStageView['status'] => {
  if (failed) return 'failed'
  if (warning) return 'warning'
  return hasEvidence ? 'ok' : 'unknown'
}

const firstErrorLine = (lines: DiagnosticsLogLine[] = []) => lines.find(line => {
  const status = Number(getField(line, ['status', 'http_status', 'status_code']))
  const level = getField(line, ['level']).toLowerCase()
  return status >= 400 || ['error', 'fatal', 'panic', 'warn', 'warning'].includes(level) || Boolean(getField(line, ['error_code', 'error', 'err']))
})

const firstErrorSpan = (spans: DiagnosticsSpanSummary[] = []) => spans.find(span => /error|failed|panic/i.test(`${span.status ?? ''} ${span.name}`))

const summarizeFailure = (result: RequestDiagnosticsResult): DiagnosticsViewModel['failure'] => {
  const errorFinding = result.findings.find(item => item.severity === 'error')
  const warningFinding = result.findings.find(item => item.severity === 'warning')
  const errorLine = firstErrorLine(result.log_lines)
  const errorSpan = firstErrorSpan(result.spans)
  if (errorFinding) return { severity: 'error', title: errorFinding.code, detail: redactText(errorFinding.message) }
  if (errorLine) {
    const status = getField(errorLine, ['status', 'http_status', 'status_code'])
    const code = getField(errorLine, ['error_code', 'code'])
    const route = getField(errorLine, ['route', 'path'])
    return {
      severity: Number(status) >= 500 ? 'error' : 'warning',
      title: code || (status ? `HTTP ${status}` : 'Request error signal'),
      detail: redactText([route, errorLine.message].filter(Boolean).join(' · ')) || 'A failed or warning-level log event was found for this request.',
    }
  }
  if (errorSpan) return { severity: 'error', title: 'Trace error span', detail: redactText(`${display(errorSpan.service)} · ${errorSpan.name}`) }
  if (warningFinding) return { severity: 'warning', title: warningFinding.code, detail: redactText(warningFinding.message) }
  if (!result.diagnostics_enabled) return { severity: 'warning', title: 'Embedded diagnostics unavailable', detail: 'Use request_id in the configured external log search tool.' }
  return { severity: 'info', title: 'No failure signal found', detail: 'No error finding, failed span, or failed log status was returned for this request.' }
}

const inferLikelyCause = (result: RequestDiagnosticsResult, failure: DiagnosticsViewModel['failure']) => {
  const joinedFindings = result.findings.map(item => `${item.code} ${item.message}`).join(' ').toLowerCase()
  const joinedSignals = [...(result.log_summary.error_codes ?? []), failure.title, failure.detail].join(' ').toLowerCase()
  const statuses = result.log_summary.statuses ?? []
  if (joinedFindings.includes('disabled') || joinedFindings.includes('unavailable')) return 'Diagnostics backends are not fully configured; the request may still be valid but only external search can confirm details.'
  if (joinedFindings.includes('not_found') || joinedSignals.includes('not_found') || statuses.includes(404)) return 'The request reached a handler but referenced a missing resource or context.'
  if (statuses.some(status => status === 401 || status === 403) || /(unauth|forbidden|denied|permission|rbac)/.test(joinedSignals)) return 'Authentication, organization context, or permission checks likely rejected the operation.'
  if (statuses.some(status => status === 402 || status === 429) || /(quota|wallet|balance|charge|meter|credit|limit)/.test(joinedSignals)) return 'Commercial entitlement, quota, wallet, or metering guardrails likely blocked the product operation.'
  if (/(runtime|provider|attempt|callback|comfy|image|asset|storage)/.test(joinedSignals)) return 'Runtime provider, callback, or asset handoff appears to be the failing stage.'
  if (statuses.some(status => status >= 500) || result.trace_summary.error_span_count > 0) return 'A backend service error occurred after the request entered the Platform/product service path.'
  if (statuses.some(status => status >= 400)) return 'A client or business validation error likely stopped the request before successful completion.'
  return failure.severity === 'info' ? 'No concrete failure cause was returned; correlate with the business audit row and downstream product state.' : 'Use the first failed stage and recent events below to narrow the owner service.'
}

const buildStages = (result: RequestDiagnosticsResult, lines: DiagnosticsLogLine[], spans: DiagnosticsSpanSummary[]): DiagnosticsStageView[] => {
  const routes = result.log_summary.routes ?? []
  const statuses = result.log_summary.statuses ?? []
  const allServices = unique([...(result.log_summary.services ?? []), ...(result.trace_summary.service_names ?? []), ...spans.map(span => span.service)])
  const platformEvidence = allServices.some(service => /platform/i.test(service)) || routes.some(route => /^\/api\/v1\/(audit|runtime|wallet|meter|billing|assets|commercial)/i.test(route))
  const ecomEvidence = allServices.some(service => /ecom|commerce/i.test(service)) || lines.some(line => lineMatches(line, /ecom|commerce|listing|workspace|product/i))
  const commercialEvidence = lines.some(line => lineMatches(line, /charge|meter|wallet|quota|billing|entitlement|credit/i)) || routes.some(route => /charge|meter|wallet|quota|billing|entitlement|credit/i.test(route))
  const runtimeEvidence = lines.some(line => lineMatches(line, /runtime|provider|attempt|callback|asset|storage|image/i)) || routes.some(route => /runtime|provider|attempt|callback|asset|storage|image/i.test(route)) || spans.some(span => /runtime|provider|callback|asset|storage|image/i.test(`${span.service} ${span.name}`))
  const failedRoute = firstErrorLine(lines)
  return [
    {
      key: 'ingress',
      label: 'Request ingress',
      status: statusFrom(result.log_summary.total_lines > 0 || result.diagnostics_enabled, false, !result.diagnostics_enabled),
      detail: result.log_summary.total_lines > 0 ? `${result.log_summary.total_lines} correlated event(s)` : 'No embedded log event returned',
    },
    {
      key: 'platform',
      label: 'Platform guardrails',
      status: statusFrom(platformEvidence, statuses.some(status => status >= 500) && platformEvidence),
      detail: platformEvidence ? 'Identity, org, audit, commercial, or runtime foundation participated' : 'No Platform-specific service signal',
    },
    {
      key: 'product-workflow',
      label: 'Product workflow',
      status: statusFrom(ecomEvidence, Boolean(failedRoute && lineMatches(failedRoute, /ecom|commerce|listing|workspace|product/i))),
      detail: ecomEvidence ? 'Product business context detected' : 'No product-specific signal detected',
    },
    {
      key: 'commercial',
      label: 'Commercial controls',
      status: statusFrom(commercialEvidence, Boolean(failedRoute && lineMatches(failedRoute, /charge|meter|wallet|quota|billing|entitlement|credit/i))),
      detail: commercialEvidence ? 'Quota, wallet, charge, metering, or entitlement signal detected' : 'No commercial-control signal',
    },
    {
      key: 'runtime',
      label: 'Runtime / assets',
      status: statusFrom(runtimeEvidence, Boolean(failedRoute && lineMatches(failedRoute, /runtime|provider|attempt|callback|asset|storage|image/i)) || result.trace_summary.error_span_count > 0),
      detail: runtimeEvidence ? 'Runtime, provider, callback, or asset path detected' : 'No runtime/asset signal',
    },
  ]
}

const buildPath = (result: RequestDiagnosticsResult, spans: DiagnosticsSpanSummary[]) => {
  const routes = result.log_summary.routes ?? []
  if (routes.length) return routes.slice(0, 5)
  const spanNames = spans.map(span => span.name).filter(Boolean)
  if (spanNames.length) return spanNames.slice(0, 5)
  return ['request_id correlation only']
}

const buildEcomContext = (lines: DiagnosticsLogLine[]): DiagnosticsKeyValue[] => {
  const candidates = ['product_code', 'workspace_id', 'template_id', 'listing_id', 'runtime_job_id', 'job_id', 'attempt_id', 'charge_session_id', 'asset_id', 'source_type', 'source_id', 'task_type', 'callback_kind']
  const values = new Map<string, string>()
  for (const line of lines) {
    for (const key of candidates) {
      const value = getField(line, [key])
      if (value && !values.has(key)) values.set(key, safeValue(key, value))
    }
  }
  if (!values.has('product_code') && lines.some(line => lineMatches(line, ECOM_HINT_PATTERN))) values.set('product_code', 'commerce product (inferred)')
  return Array.from(values.entries()).map(([label, value]) => ({ label, value })).slice(0, 8)
}

const buildNextSteps = (result: RequestDiagnosticsResult, failure: DiagnosticsViewModel['failure']) => {
  const steps = ['Copy the request_id and open the external log search link when deeper raw events are needed.']
  const cause = `${failure.title} ${failure.detail}`.toLowerCase()
  if (!result.diagnostics_enabled) steps.unshift('Enable embedded diagnostics for the environment or use the configured external log search.')
  if (/permission|denied|unauth|forbidden|401|403/.test(cause)) steps.unshift('Verify operator/session identity, organization context, and RBAC assignment for the affected user.')
  else if (/quota|wallet|balance|charge|meter|credit|402|429/.test(cause)) steps.unshift('Check product entitlement, wallet balance, charge session, and metering settlement state.')
  else if (/runtime|provider|attempt|callback|asset|storage|image/.test(cause)) steps.unshift('Inspect the runtime job/attempt, provider binding, callback delivery, and asset metadata for the product workspace.')
  else if (/not_found|404/.test(cause)) steps.unshift('Confirm the target ID still exists and belongs to the selected organization/workspace.')
  else steps.unshift('Open the audit row for the same request_id to confirm actor, target, route, and before/after business state.')
  if (result.trace_id) steps.push('Use trace_id to compare service handoff timings and identify the first failed span.')
  return steps.slice(0, 4)
}

const buildRecentEvents = (lines: DiagnosticsLogLine[] = []) => lines.slice(0, 5).map((line, index) => {
  const route = getField(line, ['route', 'path'])
  const method = getField(line, ['method'])
  const status = getField(line, ['status', 'http_status', 'status_code'])
  const error = getField(line, ['error_code', 'code'])
  return {
    label: line.timestamp ? new Date(line.timestamp).toLocaleTimeString() : `event ${index + 1}`,
    value: redactText([serviceLabel(display(line.service, 'service')), method, route, status ? `status ${status}` : '', error, line.message].filter(Boolean).join(' · ')),
  }
})

export function buildDiagnosticsViewModel(result: RequestDiagnosticsResult): DiagnosticsViewModel {
  const lines = result.log_lines ?? []
  const spans = result.spans ?? []
  const services = unique([...(result.log_summary.services ?? []), ...(result.trace_summary.service_names ?? []), ...spans.map(span => span.service)]).map(serviceLabel)
  const findings = result.findings ?? []
  const failure = summarizeFailure(result)
  const hasError = failure.severity === 'error' || findings.some(item => item.severity === 'error') || result.trace_summary.error_span_count > 0 || result.log_summary.statuses?.some(status => status >= 500)
  const hasWarning = failure.severity === 'warning' || findings.some(item => item.severity === 'warning') || result.log_summary.statuses?.some(status => status >= 400)
  const safeFindings = findings.map(item => ({ ...item, message: redactText(item.message) }))
  return {
    requestID: result.request_id,
    traceID: result.trace_id,
    diagnosticsEnabled: result.diagnostics_enabled,
    health: hasError ? 'failed' : hasWarning ? 'degraded' : result.log_summary.total_lines > 0 || result.trace_summary.found ? 'healthy' : 'unknown',
    headline: hasError ? 'Request failed in the correlated service path' : hasWarning ? 'Request needs operator review' : 'No blocking signal found in embedded diagnostics',
    path: buildPath(result, spans),
    services,
    businessStages: buildStages(result, lines, spans),
    failure,
    likelyCause: inferLikelyCause(result, failure),
    nextSteps: buildNextSteps(result, failure),
    productContext: buildEcomContext(lines),
    findings: safeFindings,
    timeline: [
      { label: 'first seen', value: display(result.log_summary.first_seen_at) },
      { label: 'last seen', value: display(result.log_summary.last_seen_at) },
      { label: 'trace duration', value: result.trace_summary.duration_ms ? `${result.trace_summary.duration_ms} ms` : '—' },
    ],
    recentEvents: buildRecentEvents(lines),
  }
}
