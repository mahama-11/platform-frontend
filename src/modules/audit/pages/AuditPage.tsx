import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Activity, AlertTriangle, Copy, Database, ExternalLink, RefreshCw, Search, X } from 'lucide-react'

import { RequestDiagnosticsPanel } from '@/modules/audit/components/RequestDiagnosticsPanel'
import { platformClient } from '@/shared/api/platformClient'
import { env } from '@/shared/config/env'
import { PageHeader } from '@/shared/ui/PageHeader'
import { SectionCard } from '@/shared/ui/SectionCard'
import type { AuditLogRecord, AuditLogStats, ErrorCodesDoc, InternalAccessDoc, RequestDiagnosticsResult } from '@/shared/types/platform'

const PAGE_SIZE = 20

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 5 },
  show: { opacity: 1, y: 0 },
}

const statusOptions = ['', 'success', 'failed', 'error', 'denied']

const investigationSteps = [
  {
    title: '1. Correlate request',
    description: 'Start with request_id or trace_id from a downstream error response, gateway log, or runtime job.',
    icon: Search,
  },
  {
    title: '2. Review business fact',
    description: 'Audit records show who changed what, the target, route, before/after snapshots, and diff summary.',
    icon: Database,
  },
  {
    title: '3. Pivot to traces/logs',
    description: 'Use trace_id for request logs now; enable vendor-neutral trace deep links when tracing backend is deployed.',
    icon: Activity,
  },
]

function valueOrDash(value?: string) {
  return value && value.trim() ? value : '—'
}

function formatDate(value: string) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function prettyBlock(value: string) {
  if (!value) return '—'
  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  } catch {
    return value
  }
}

function statusClass(status: string) {
  const normalized = status.toLowerCase()
  if (['success', 'ok', 'completed'].includes(normalized)) return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
  if (['failed', 'error', 'denied'].includes(normalized)) return 'border-rose-500/30 bg-rose-500/10 text-rose-300'
  return 'border-[var(--border)] bg-[var(--bg-muted)] text-[var(--text)]'
}

function updateSearchParams(searchParams: URLSearchParams, setSearchParams: (params: URLSearchParams) => void, key: string, value: string) {
  const next = new URLSearchParams(searchParams)
  if (value) next.set(key, value)
  else next.delete(key)
  next.set('offset', '0')
  setSearchParams(next)
}

function numericStat(value: number | undefined, fallback = 0) {
  return typeof value === 'number' ? value : fallback
}

function topEntries(value: Record<string, number> | undefined) {
  return Object.entries(value ?? {}).sort((left, right) => right[1] - left[1]).slice(0, 3)
}

function replacePlaceholder(url: string, placeholder: string, value: string) {
  const encodedPlaceholder = encodeURIComponent(placeholder)
  const encodedValue = encodeURIComponent(value)
  return url.replaceAll(placeholder, encodedValue).replaceAll(encodedPlaceholder, encodedValue)
}

function buildTraceExplorerUrl(traceID?: string) {
  if (!traceID || !env.traceExplorerUrl || !env.traceBackendEnabled) return ''
  if (env.traceExplorerUrl.includes('{trace_id}') || env.traceExplorerUrl.includes('%7Btrace_id%7D')) {
    return replacePlaceholder(env.traceExplorerUrl, '{trace_id}', traceID)
  }
  const separator = env.traceExplorerUrl.includes('?') ? '&' : '?'
  return `${env.traceExplorerUrl}${separator}trace_id=${encodeURIComponent(traceID)}`
}

function buildLogExplorerUrl(input: { requestID?: string; traceID?: string }) {
  if (!env.logExplorerUrl) return ''
  const url = env.logExplorerUrl
  const requestID = input.requestID || ''
  const traceID = input.traceID || ''
  if (url.includes('{request_id}') || url.includes('{trace_id}') || url.includes('%7Brequest_id%7D') || url.includes('%7Btrace_id%7D')) {
    return replacePlaceholder(replacePlaceholder(url, '{request_id}', requestID), '{trace_id}', traceID)
  }
  const params = new URLSearchParams()
  if (requestID) params.set('request_id', requestID)
  if (traceID) params.set('trace_id', traceID)
  if (!params.size) return url
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}${params.toString()}`
}

async function copyText(value?: string) {
  if (!value) return
  await navigator.clipboard?.writeText(value)
}

function DetailRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2">
      <p className="text-xs uppercase tracking-wide text-[var(--text-soft)]">{label}</p>
      <p className="mt-1 break-all font-mono text-sm text-[var(--text)]">{valueOrDash(value)}</p>
    </div>
  )
}

function CodeBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-wide text-[var(--text-soft)]">{label}</p>
      <pre className="max-h-72 overflow-auto rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3 text-xs leading-relaxed text-[var(--text-muted)]">
        {prettyBlock(value)}
      </pre>
    </div>
  )
}

export function AuditPage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [items, setItems] = useState<AuditLogRecord[]>([])
  const [stats, setStats] = useState<AuditLogStats | undefined>()
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState(0)
  const [selectedID, setSelectedID] = useState<string | null>(null)
  const [selectedLog, setSelectedLog] = useState<AuditLogRecord | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [internalAccessDoc, setInternalAccessDoc] = useState<InternalAccessDoc | null>(null)
  const [errorCodesDoc, setErrorCodesDoc] = useState<ErrorCodesDoc | null>(null)
  const [diagnosticRequestID, setDiagnosticRequestID] = useState(searchParams.get('request_id') || '')
  const [diagnosticTraceID, setDiagnosticTraceID] = useState(searchParams.get('trace_id') || '')
  const [diagnostics, setDiagnostics] = useState<RequestDiagnosticsResult | null>(null)
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false)
  const [diagnosticsError, setDiagnosticsError] = useState<string | null>(null)

  const filters = useMemo(() => ({
    query: searchParams.get('query') || '',
    action: searchParams.get('action') || '',
    target_type: searchParams.get('target_type') || '',
    status: searchParams.get('status') || '',
    request_id: searchParams.get('request_id') || '',
    trace_id: searchParams.get('trace_id') || '',
    actor_user_id: searchParams.get('actor_user_id') || '',
    actor_org_id: searchParams.get('actor_org_id') || '',
    offset: Number(searchParams.get('offset') || '0') || 0,
  }), [searchParams])

  const setFilter = useCallback((key: string, value: string) => {
    updateSearchParams(searchParams, setSearchParams, key, value.trim())
  }, [searchParams, setSearchParams])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const result = await platformClient.auditLogs({ ...filters, limit: PAGE_SIZE })
        if (cancelled) return
        setItems(result.items)
        setTotal(result.total)
        setStats(result.stats)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load audit logs')
        setItems([])
        setTotal(0)
        setStats(undefined)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [filters, refreshToken])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [accessDoc, codesDoc] = await Promise.all([
          platformClient.internalAccessDoc(),
          platformClient.errorCodesDoc(),
        ])
        if (cancelled) return
        setInternalAccessDoc(accessDoc)
        setErrorCodesDoc(codesDoc)
      } catch {
        if (cancelled) return
        setInternalAccessDoc(null)
        setErrorCodesDoc(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!selectedID) {
      setSelectedLog(null)
      setDetailError(null)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        setDetailLoading(true)
        setDetailError(null)
        const detail = await platformClient.auditLogDetail(selectedID)
        if (cancelled) return
        setSelectedLog(detail)
      } catch (err) {
        if (cancelled) return
        setSelectedLog(items.find(item => item.id === selectedID) ?? null)
        setDetailError(err instanceof Error ? err.message : 'Failed to load audit detail')
      } finally {
        if (!cancelled) setDetailLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [items, selectedID])


  const runDiagnostics = useCallback(async (requestID = diagnosticRequestID.trim(), traceID = diagnosticTraceID.trim()) => {
    if (!requestID) return
    try {
      setDiagnosticsLoading(true)
      setDiagnosticsError(null)
      const result = await platformClient.requestDiagnostics({ request_id: requestID, trace_id: traceID || undefined, lookback: '2h', limit: 100 })
      setDiagnostics(result)
      if (result.trace_id && !traceID) setDiagnosticTraceID(result.trace_id)
    } catch (err) {
      setDiagnosticsError(err instanceof Error ? err.message : 'Failed to run diagnostics')
      setDiagnostics(null)
    } finally {
      setDiagnosticsLoading(false)
    }
  }, [diagnosticRequestID, diagnosticTraceID])

  const currentPage = Math.floor(filters.offset / PAGE_SIZE) + 1
  const hasNext = filters.offset + PAGE_SIZE < total
  const hasPrevious = filters.offset > 0
  const statusBreakdown = topEntries(stats?.by_status)
  const actionBreakdown = topEntries(stats?.by_action)
  const targetBreakdown = topEntries(stats?.by_target_type)
  const selectedTraceUrl = buildTraceExplorerUrl(selectedLog?.trace_id)
  const selectedLogUrl = buildLogExplorerUrl({ requestID: selectedLog?.request_id, traceID: selectedLog?.trace_id })
  const diagnosticLogUrl = buildLogExplorerUrl({ requestID: diagnosticRequestID.trim(), traceID: diagnosticTraceID.trim() })
  const diagnosticTraceUrl = buildTraceExplorerUrl(diagnosticTraceID.trim())
  const diagnosticSearchKey = [
    diagnosticRequestID.trim() ? `request_id=${diagnosticRequestID.trim()}` : '',
    diagnosticTraceID.trim() ? `trace_id=${diagnosticTraceID.trim()}` : '',
  ].filter(Boolean).join(' ')

  const goToOffset = (offset: number) => {
    const next = new URLSearchParams(searchParams)
    next.set('offset', String(Math.max(0, offset)))
    setSearchParams(next)
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={t('audit.title')}
        description={t('audit.description')}
        actions={(
          <button
            type="button"
            onClick={() => setRefreshToken(value => value + 1)}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm font-medium text-[var(--text)] transition-colors hover:border-[var(--border-strong)]"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        )}
      />

      <SectionCard title="Investigation console" description="Start from a downstream request_id / trace_id, then review immutable audit facts before pivoting to request logs or trace tooling.">
        <div className="grid gap-3 lg:grid-cols-8">
          <label className="relative lg:col-span-2">
            <span className="sr-only">Search audit logs</span>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-soft)]" />
            <input value={filters.query} onChange={event => setFilter('query', event.target.value)} placeholder="Search actor / target / route / detail" className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] py-2.5 pl-10 pr-4 text-sm text-[var(--text)] outline-none transition-all focus:border-[var(--primary-soft)] focus:ring-1 focus:ring-[var(--primary-soft)]" />
          </label>
          <input value={filters.action} onChange={event => setFilter('action', event.target.value)} placeholder="action" className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--primary-soft)]" />
          <input value={filters.target_type} onChange={event => setFilter('target_type', event.target.value)} placeholder="target_type" className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--primary-soft)]" />
          <select value={filters.status} onChange={event => setFilter('status', event.target.value)} className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--primary-soft)]">
            {statusOptions.map(option => <option key={option} value={option}>{option || 'all statuses'}</option>)}
          </select>
          <input value={filters.request_id} onChange={event => setFilter('request_id', event.target.value)} placeholder="request_id" className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--primary-soft)]" />
          <input value={filters.trace_id} onChange={event => setFilter('trace_id', event.target.value)} placeholder="trace_id" className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--primary-soft)]" />
          <input value={filters.actor_user_id} onChange={event => setFilter('actor_user_id', event.target.value)} placeholder="actor_user_id" className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--primary-soft)]" />
          <input value={filters.actor_org_id} onChange={event => setFilter('actor_org_id', event.target.value)} placeholder="actor_org_id" className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--primary-soft)]" />
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {investigationSteps.map(step => {
            const Icon = step.icon
            return (
              <div key={step.title} className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text)]"><Icon className="h-4 w-4 text-sky-300" />{step.title}</div>
                <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{step.description}</p>
              </div>
            )
          })}
        </div>
        <p className="mt-4 rounded-lg border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-200">
          Log guidance: request logs are system-wide, not audit-only. Copy <span className="font-mono">X-Request-ID</span> from Browser DevTools → Network, an API response header, or an error response body, then search logs by <span className="font-mono">request_id</span>. {env.logExplorerUrl ? 'Log explorer links are enabled for request-level troubleshooting. ' : 'Set VITE_LOG_EXPLORER_URL after a log search backend is available to enable one-click log search. '}
          {env.traceBackendEnabled ? 'Trace backend links are enabled for this console.' : 'Trace IDs are present in logs, but trace span search is not enabled in this environment yet.'}
        </p>
        <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4" data-testid="system-log-search-panel">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-white">System log search</p>
              <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">Paste any request_id from API headers/body or DevTools Network. This searches raw Platform/product backend stdout logs, even when there is no audit row.</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${env.traceBackendEnabled ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-200'}`}>
              {env.traceBackendEnabled ? 'Trace backend enabled' : 'Trace backend not enabled'}
            </span>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <label>
              <span className="text-xs uppercase tracking-wide text-[var(--text-soft)]">request_id</span>
              <input value={diagnosticRequestID} onChange={event => setDiagnosticRequestID(event.target.value)} placeholder="X-Request-ID from Network / API response" className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-muted)] px-3 py-2.5 font-mono text-sm text-[var(--text)] outline-none focus:border-[var(--primary-soft)]" />
            </label>
            <label>
              <span className="text-xs uppercase tracking-wide text-[var(--text-soft)]">trace_id</span>
              <input value={diagnosticTraceID} onChange={event => setDiagnosticTraceID(event.target.value)} placeholder="Optional: trace_id from response/logs" className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-muted)] px-3 py-2.5 font-mono text-sm text-[var(--text)] outline-none focus:border-[var(--primary-soft)]" />
            </label>
          </div>
          <div className="mt-3 rounded-lg border border-[var(--border)] bg-black/20 p-3">
            <p className="text-xs uppercase tracking-wide text-[var(--text-soft)]">Generated search key</p>
            <code className="mt-1 block break-all font-mono text-sm text-sky-200">{diagnosticSearchKey || 'Paste a request_id or trace_id to generate a search key.'}</code>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => copyText(diagnosticRequestID.trim())} disabled={!diagnosticRequestID.trim()} className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text)] hover:border-[var(--border-strong)] disabled:cursor-not-allowed disabled:opacity-40"><Copy className="h-4 w-4" />Copy request_id</button>
            <button type="button" onClick={() => runDiagnostics()} disabled={!diagnosticRequestID.trim() || diagnosticsLoading} className="inline-flex items-center gap-2 rounded-lg border border-emerald-300/30 px-3 py-2 text-sm text-emerald-100 hover:bg-emerald-300/10 disabled:cursor-not-allowed disabled:opacity-40"><Activity className={`h-4 w-4 ${diagnosticsLoading ? 'animate-pulse' : ''}`} />Run diagnostics</button>
            <button type="button" onClick={() => copyText(diagnosticSearchKey)} disabled={!diagnosticSearchKey} className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text)] hover:border-[var(--border-strong)] disabled:cursor-not-allowed disabled:opacity-40"><Copy className="h-4 w-4" />Copy search key</button>
            {diagnosticLogUrl ? <a href={diagnosticLogUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-sky-300/30 px-3 py-2 text-sm text-sky-100 hover:bg-sky-300/10"><ExternalLink className="h-4 w-4" />Open logs</a> : null}
            {diagnosticTraceUrl ? <a href={diagnosticTraceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-sky-300/30 px-3 py-2 text-sm text-sky-100 hover:bg-sky-300/10"><ExternalLink className="h-4 w-4" />Open trace</a> : null}
          </div>
          {diagnosticsError ? <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{diagnosticsError}</div> : null}
          {diagnostics ? <RequestDiagnosticsPanel result={diagnostics} /> : null}
        </div>
        <p className="mt-3 flex gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
          Audit rows are business facts stored in platform_audit_logs. High-volume access logs still belong to stdout/log collector; do not turn the business DB into a raw request-log sink.
        </p>
        {error ? <div className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">{error}</div> : null}
      </SectionCard>

      <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid gap-4 md:grid-cols-4">
        {[
          ['Total events', total],
          ['Success', numericStat(stats?.success_count)],
          ['Failed / error', numericStat(stats?.failure_count)],
          ['Page', `${currentPage} · ${items.length} rows`],
        ].map(([label, value]) => (
          <motion.div variants={itemVariants} key={label} className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow)]">
            <p className="text-sm font-medium text-[var(--text-soft)]">{label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-white">{value}</p>
          </motion.div>
        ))}
      </motion.div>

      <SectionCard title="Audit events" description="Latest immutable platform audit events from the real audit API.">
        {loading ? <p className="py-8 text-center text-sm text-[var(--text-muted)]">Loading audit events...</p> : null}
        {!loading && !error && items.length === 0 ? <p className="py-8 text-center text-sm text-[var(--text-muted)]">No audit events match the current filters.</p> : null}
        {!loading && items.length ? (
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-2">
            {items.map(item => (
              <motion.button
                variants={itemVariants}
                key={item.id}
                type="button"
                onClick={() => setSelectedID(item.id)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4 text-left transition-all hover:border-[var(--border-strong)] hover:shadow-sm"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-medium text-white">{item.action}</span>
                      <span className="rounded bg-[var(--bg-muted)] px-2 py-0.5 text-xs text-[var(--text-muted)]">{item.target_type}/{valueOrDash(item.target_id)}</span>
                      <span className={`rounded border px-2 py-0.5 text-xs font-medium ${statusClass(item.status)}`}>{valueOrDash(item.status)}</span>
                    </div>
                    <p className="mt-2 truncate text-sm text-[var(--text-muted)]">{item.method} {item.route || '—'}</p>
                    <p className="mt-1 truncate font-mono text-xs text-[var(--text-soft)]">request {valueOrDash(item.request_id)} · trace {valueOrDash(item.trace_id)}</p>
                  </div>
                  <div className="text-left text-xs text-[var(--text-soft)] lg:text-right">
                    <p>{formatDate(item.created_at)}</p>
                    <p className="mt-1 font-mono">actor {valueOrDash(item.actor_user_id)}</p>
                  </div>
                </div>
              </motion.button>
            ))}
          </motion.div>
        ) : null}
        <div className="mt-5 flex flex-col gap-3 border-t border-[var(--border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--text-muted)]">Showing {items.length ? filters.offset + 1 : 0}-{filters.offset + items.length} of {total}</p>
          <div className="flex gap-2">
            <button type="button" disabled={!hasPrevious || loading} onClick={() => goToOffset(filters.offset - PAGE_SIZE)} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
            <button type="button" disabled={!hasNext || loading} onClick={() => goToOffset(filters.offset + PAGE_SIZE)} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-40">Next</button>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Compact contracts" description="Operational reference kept below the live audit console.">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4">
            <p className="text-xs uppercase tracking-wide text-[var(--text-soft)]">Audit API</p>
            <p className="mt-2 font-mono text-sm text-[var(--text)]">GET /audit/logs</p>
            <p className="mt-1 font-mono text-sm text-[var(--text)]">GET /audit/logs/:auditID</p>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4">
            <p className="text-xs uppercase tracking-wide text-[var(--text-soft)]">Internal access</p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">{internalAccessDoc ? `${internalAccessDoc.base_path} · ${internalAccessDoc.auth_method}` : 'Docs endpoint not loaded'}</p>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4">
            <p className="text-xs uppercase tracking-wide text-[var(--text-soft)]">Error catalog</p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">{errorCodesDoc ? `${errorCodesDoc.client_errors.length + errorCodesDoc.business_errors.length + errorCodesDoc.payment_errors.length + errorCodesDoc.server_errors.length} browser-readable codes` : 'Docs endpoint not loaded'}</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {[['Top statuses', statusBreakdown], ['Top actions', actionBreakdown], ['Top targets', targetBreakdown]].map(([label, rows]) => (
            <div key={label as string} className="rounded-lg border border-[var(--border)] bg-[var(--bg-muted)] p-4">
              <p className="text-xs uppercase tracking-wide text-[var(--text-soft)]">{label as string}</p>
              {(rows as Array<[string, number]>).length ? (rows as Array<[string, number]>).map(([name, count]) => <p key={name} className="mt-2 flex justify-between gap-3 text-sm text-[var(--text-muted)]"><span className="truncate font-mono">{name}</span><span>{count}</span></p>) : <p className="mt-2 text-sm text-[var(--text-muted)]">No breakdown returned.</p>}
            </div>
          ))}
        </div>
      </SectionCard>

      {selectedID ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Audit detail</h2>
                <p className="mt-1 font-mono text-sm text-[var(--text-muted)]">{selectedID}</p>
              </div>
              <button type="button" onClick={() => setSelectedID(null)} className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-muted)] hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            {detailLoading ? <p className="py-6 text-center text-sm text-[var(--text-muted)]">Loading audit detail...</p> : null}
            {detailError ? <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">{detailError}. Showing list payload when available.</div> : null}
            {selectedLog ? (
              <div className="space-y-5">
                <div className="rounded-lg border border-sky-500/20 bg-sky-500/10 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-sky-100">Correlation pack</p>
                      <p className="mt-1 text-sm text-sky-200/80">Copy these IDs into downstream service logs, container stdout, or trace explorer during incident triage.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => copyText(selectedLog.request_id)} className="inline-flex items-center gap-2 rounded-lg border border-sky-300/30 px-3 py-2 text-sm text-sky-100 hover:bg-sky-300/10"><Copy className="h-4 w-4" />Copy request</button>
                      <button type="button" onClick={() => copyText(selectedLog.trace_id)} className="inline-flex items-center gap-2 rounded-lg border border-sky-300/30 px-3 py-2 text-sm text-sky-100 hover:bg-sky-300/10"><Copy className="h-4 w-4" />Copy trace</button>
                      {selectedLogUrl ? <a href={selectedLogUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-sky-300/30 px-3 py-2 text-sm text-sky-100 hover:bg-sky-300/10"><ExternalLink className="h-4 w-4" />Open logs</a> : null}
                      {selectedTraceUrl ? <a href={selectedTraceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-sky-300/30 px-3 py-2 text-sm text-sky-100 hover:bg-sky-300/10"><ExternalLink className="h-4 w-4" />Open trace</a> : null}
                      {!env.traceBackendEnabled && selectedLog.trace_id ? <span className="inline-flex items-center rounded-lg border border-amber-300/30 px-3 py-2 text-sm text-amber-100">Trace backend not enabled</span> : null}
                    </div>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <DetailRow label="request_id" value={selectedLog.request_id} />
                  <DetailRow label="trace_id" value={selectedLog.trace_id} />
                  <DetailRow label="created_at" value={formatDate(selectedLog.created_at)} />
                  <DetailRow label="actor_user_id" value={selectedLog.actor_user_id} />
                  <DetailRow label="actor_org_id" value={selectedLog.actor_org_id} />
                  <DetailRow label="status" value={selectedLog.status} />
                  <DetailRow label="route" value={`${selectedLog.method || '—'} ${selectedLog.route || '—'}`} />
                  <DetailRow label="target" value={`${selectedLog.target_type || '—'} / ${selectedLog.target_id || '—'}`} />
                  <DetailRow label="billing subject" value={`${selectedLog.billing_subject_type || '—'} / ${selectedLog.billing_subject_id || '—'}`} />
                </div>
                <CodeBlock label="details" value={selectedLog.details} />
                <div className="grid gap-4 lg:grid-cols-2">
                  <CodeBlock label="before_snapshot" value={selectedLog.before_snapshot} />
                  <CodeBlock label="after_snapshot" value={selectedLog.after_snapshot} />
                </div>
                <CodeBlock label="diff_summary" value={selectedLog.diff_summary} />
              </div>
            ) : null}
          </motion.div>
        </div>
      ) : null}
    </div>
  )
}
