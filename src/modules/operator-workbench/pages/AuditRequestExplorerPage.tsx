import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ClipboardList, Search } from 'lucide-react'

import { CodeBlock, DetailRow, EmptyState, ErrorBanner, StatusPill, toneForStatus } from '@/modules/operator-workbench/components/WorkbenchPrimitives'
import { RequestDiagnosticsPanel } from '@/modules/audit/components/RequestDiagnosticsPanel'
import { platformClient } from '@/shared/api/platformClient'
import { PageHeader } from '@/shared/ui/PageHeader'
import { SectionCard } from '@/shared/ui/SectionCard'
import type { AuditLogRecord, RequestDiagnosticsResult } from '@/shared/types/platform'

export function AuditRequestExplorerPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [requestInput, setRequestInput] = useState(searchParams.get('request_id') || '')
  const [traceInput, setTraceInput] = useState(searchParams.get('trace_id') || '')
  const [logs, setLogs] = useState<AuditLogRecord[]>([])
  const [diagnostics, setDiagnostics] = useState<RequestDiagnosticsResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const requestID = searchParams.get('request_id') || ''
  const traceID = searchParams.get('trace_id') || ''

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const auditResult = await platformClient.auditLogs({ request_id: requestID || undefined, trace_id: traceID || undefined, query: !requestID && !traceID ? '' : undefined, limit: 20, offset: 0 })
        if (cancelled) return
        setLogs(auditResult.items)
      } catch (err) {
        if (!cancelled) {
          setLogs([])
          setError(err instanceof Error ? err.message : 'Failed to load audit logs')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [requestID, traceID])

  useEffect(() => {
    if (!requestID) {
      setDiagnostics(null)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const result = await platformClient.requestDiagnostics({ request_id: requestID, trace_id: traceID || undefined, lookback: '2h', limit: 100 })
        if (!cancelled) setDiagnostics(result)
      } catch (err) {
        if (!cancelled) {
          setDiagnostics(null)
          setError(err instanceof Error ? err.message : 'Failed to run request diagnostics')
        }
      }
    })()
    return () => { cancelled = true }
  }, [requestID, traceID])

  useEffect(() => {
    setRequestInput(requestID)
    setTraceInput(traceID)
  }, [requestID, traceID])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const next: Record<string, string> = {}
    if (requestInput.trim()) next.request_id = requestInput.trim()
    if (traceInput.trim()) next.trace_id = traceInput.trim()
    setSearchParams(next)
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Audit & Request Explorer" description="按 request_id / trace_id 查询审计事实与诊断摘要；没有事实时明确展示 empty state。" />
      <SectionCard title="Request / trace lookup" description="request_id 可运行 diagnostics；trace_id 可过滤审计与日志上下文。">
        <form onSubmit={submit} className="grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
          <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-soft)]" /><input value={requestInput} onChange={event => setRequestInput(event.target.value)} placeholder="request_id" className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] py-2.5 pl-10 pr-4 text-sm text-[var(--text)] outline-none focus:border-[var(--primary-soft)]" /></div>
          <input value={traceInput} onChange={event => setTraceInput(event.target.value)} placeholder="trace_id" className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--primary-soft)]" />
          <button className="rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-black">Explore</button>
        </form>
      </SectionCard>
      <ErrorBanner message={error} />
      {diagnostics ? <><RequestDiagnosticsPanel result={diagnostics} /><SectionCard title="Diagnostics links and queries" description="Expose the exact log query and configured external diagnostic links when backend provides them."><div className="space-y-3"><CodeBlock label="log query" value={diagnostics.log_query || '—'} />{diagnostics.external_urls && Object.keys(diagnostics.external_urls).length ? <div className="flex flex-wrap gap-3">{Object.entries(diagnostics.external_urls).map(([label, url]) => <a key={label} href={url} target="_blank" rel="noreferrer" className="text-sm font-medium text-[var(--primary)] hover:underline">{label}</a>)}</div> : <p className="text-sm text-[var(--text-muted)]">No external diagnostic links configured.</p>}</div></SectionCard></> : requestID ? <SectionCard title="Diagnostics" description="No diagnostics result returned."><EmptyState>Diagnostics unavailable or no matching log lines found for this request.</EmptyState></SectionCard> : null}
      <SectionCard title="Audit facts" description="审计记录是业务事实链；若只有 raw request 没有 audit fact，需要继续查看 runtime/billing/access 模块。">
        {loading ? <EmptyState>Loading audit logs...</EmptyState> : null}
        {!loading && !logs.length ? <EmptyState>No audit facts returned for this request/trace.</EmptyState> : <div className="space-y-2">{logs.map(log => <div key={log.id} className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4 text-sm"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><p className="font-medium text-[var(--text)]">{log.action} · {log.target_type}</p><p className="mt-1 break-all font-mono text-xs text-[var(--text-muted)]">{log.request_id || '—'} · {log.trace_id || '—'}</p><p className="mt-1 text-[var(--text-soft)]">{log.method} {log.route}</p></div><StatusPill tone={toneForStatus(log.status)}>{log.status}</StatusPill></div><div className="mt-3 grid gap-3 md:grid-cols-3"><DetailRow label="actor" value={log.actor_user_id} /><DetailRow label="target" value={log.target_id} /><DetailRow label="billing subject" value={`${log.billing_subject_type || '—'}/${log.billing_subject_id || '—'}`} /></div>{log.diff_summary ? <div className="mt-3"><CodeBlock label="diff summary" value={log.diff_summary} /></div> : null}</div>)}</div>}
        <Link to={`/audit${requestID || traceID ? `?${new URLSearchParams({ ...(requestID ? { request_id: requestID } : {}), ...(traceID ? { trace_id: traceID } : {}) }).toString()}` : ''}`} className="mt-4 inline-flex text-sm font-medium text-[var(--primary)] hover:underline">Open full Audit module</Link>
      </SectionCard>
      <SectionCard title="Explorer workflow" description="Request 排障路径"><div className="grid gap-3 md:grid-cols-4">{['Paste request/trace', 'Run diagnostics', 'Review audit facts', 'Pivot to Runtime/Finance/Access'].map((step, index) => <div key={step} className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4 text-sm text-[var(--text-muted)]"><ClipboardList className="mb-2 h-4 w-4 text-[var(--primary)]" />{index + 1}. {step}</div>)}</div></SectionCard>
    </div>
  )
}
