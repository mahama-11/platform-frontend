export type InvestigationKind =
  | 'runtime_job'
  | 'charge_session'
  | 'settlement_event'
  | 'request'
  | 'trace'
  | 'organization'
  | 'user'
  | 'unknown'

export interface InvestigationSearchResult {
  kind: InvestigationKind
  label: string
  value: string
  path?: string
  deterministic: boolean
  recommendations: Array<{ label: string; path: string; reason: string }>
}

const runtimePrefixes = ['runtime_job_', 'rtjob_', 'job_']
const chargePrefixes = ['charge_session_', 'cs_', 'chs_']
const settlementPrefixes = ['event_', 'settlement_', 'stl_']
const orgPrefixes = ['org_', 'organization_']
const userPrefixes = ['user_', 'usr_']
const tracePrefixes = ['trace_', 'trc_']
const requestPrefixes = ['req_', 'request_']

function startsWithAny(value: string, prefixes: string[]) {
  return prefixes.some(prefix => value.startsWith(prefix))
}

function looksUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function extractParamOrRaw(value: string, names: string[]) {
  for (const name of names) {
    const direct = new RegExp(`(?:^|[?&\\s])${name}=([^&\\s]+)`, 'i').exec(value)
    if (direct?.[1]) return decodeURIComponent(direct[1])
  }
  try {
    const url = new URL(value)
    for (const name of names) {
      const found = url.searchParams.get(name)
      if (found) return found
    }
  } catch {
    // not a URL; fall through to raw input
  }
  return value.includes('=') ? value.split('=').pop()?.trim() || value : value
}

function withGenericRecommendations(value: string) {
  const encoded = encodeURIComponent(value)
  return [
    { label: 'Search runtime jobs', path: `/runtime/jobs?query=${encoded}`, reason: 'Provider job, source id, status and job ids are searchable there.' },
    { label: 'Search audit logs', path: `/audit?query=${encoded}`, reason: 'Requests, actors, targets and route facts are searchable there.' },
    { label: 'Search charge sessions', path: `/workbench/finance?query=${encoded}`, reason: 'Charge sessions connect runtime usage to settlement evidence.' },
  ]
}

export function classifyInvestigationInput(raw: string): InvestigationSearchResult {
  const value = raw.trim()
  const lower = value.toLowerCase()
  const encoded = encodeURIComponent(value)
  if (!value) {
    return { kind: 'unknown', label: 'Empty search', value, deterministic: false, recommendations: [] }
  }
  if (startsWithAny(lower, runtimePrefixes)) {
    return { kind: 'runtime_job', label: 'Runtime job', value, path: `/runtime/jobs/${encoded}`, deterministic: true, recommendations: [] }
  }
  if (startsWithAny(lower, chargePrefixes)) {
    return { kind: 'charge_session', label: 'Charge session', value, path: `/billing/charge-sessions/${encoded}`, deterministic: true, recommendations: [] }
  }
  if (startsWithAny(lower, settlementPrefixes)) {
    return { kind: 'settlement_event', label: 'Settlement event', value, path: `/billing/settlements/${encoded}`, deterministic: true, recommendations: [] }
  }
  if (startsWithAny(lower, requestPrefixes) || lower.includes('request_id=')) {
    const requestID = extractParamOrRaw(value, ['request_id', 'request'])
    return { kind: 'request', label: 'Request ID', value: requestID, path: `/workbench/audit?request_id=${encodeURIComponent(requestID)}`, deterministic: true, recommendations: [] }
  }
  if (startsWithAny(lower, tracePrefixes) || lower.includes('trace_id=')) {
    const traceID = extractParamOrRaw(value, ['trace_id', 'trace'])
    return { kind: 'trace', label: 'Trace ID', value: traceID, path: `/workbench/audit?trace_id=${encodeURIComponent(traceID)}`, deterministic: true, recommendations: [] }
  }
  if (startsWithAny(lower, orgPrefixes)) {
    return {
      kind: 'organization',
      label: 'Organization',
      value,
      deterministic: false,
      recommendations: [
        { label: 'Diagnose access/org state', path: `/workbench/access?query=${encoded}&org_id=${encoded}`, reason: 'Org issues need member, role and permission context.' },
        { label: 'Open organization center', path: `/organizations?query=${encoded}`, reason: 'Organization Center remains the source-of-truth editor.' },
        ...withGenericRecommendations(value),
      ],
    }
  }
  if (startsWithAny(lower, userPrefixes)) {
    return {
      kind: 'user',
      label: 'User',
      value,
      deterministic: false,
      recommendations: [
        { label: 'Diagnose access/user state', path: `/workbench/access?query=${encoded}`, reason: 'User issues need org membership and effective permissions.' },
        { label: 'Open access center', path: `/access-center?query=${encoded}`, reason: 'Access Center remains the source-of-truth editor.' },
        ...withGenericRecommendations(value),
      ],
    }
  }
  if (looksUuid(value)) {
    return {
      kind: 'unknown',
      label: 'UUID / opaque id',
      value,
      path: `/runtime/jobs?query=${encoded}`,
      deterministic: true,
      recommendations: [
        { label: 'Search runtime jobs', path: `/runtime/jobs?query=${encoded}`, reason: 'Opaque ids often appear as source_id or provider_job_id.' },
        { label: 'Try finance investigator', path: `/workbench/finance?query=${encoded}`, reason: 'Opaque ids may be charge sessions, reservations or events.' },
        { label: 'Try audit/request explorer', path: `/workbench/audit?request_id=${encoded}`, reason: 'If this is a request id, diagnostics can correlate logs.' },
      ],
    }
  }
  return { kind: 'unknown', label: 'General search', value, path: `/runtime/jobs?query=${encoded}`, deterministic: true, recommendations: withGenericRecommendations(value) }
}
