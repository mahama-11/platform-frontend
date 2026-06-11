import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Activity, ExternalLink, Search } from 'lucide-react'

import { ErrorBanner, EmptyState, StatusPill, toneForStatus, DetailRow, CodeBlock } from '@/modules/operator-workbench/components/WorkbenchPrimitives'
import { useSessionStore } from '@/app/store/sessionStore'
import { useShellStore } from '@/app/store/shellStore'
import { platformClient } from '@/shared/api/platformClient'
import { PageHeader } from '@/shared/ui/PageHeader'
import { SectionCard } from '@/shared/ui/SectionCard'
import type { RuntimeJob, RuntimeJobDetail } from '@/shared/types/platform'

function collectStorageKeys(manifest?: string) {
  if (!manifest) return [] as string[]
  const keys = new Set<string>()
  try {
    const walk = (value: unknown) => {
      if (Array.isArray(value)) return value.forEach(walk)
      if (value && typeof value === 'object') {
        for (const [key, item] of Object.entries(value)) {
          if (key.toLowerCase().includes('storage') && typeof item === 'string') keys.add(item)
          walk(item)
        }
      }
    }
    walk(JSON.parse(manifest))
  } catch {
    return []
  }
  return Array.from(keys).slice(0, 8)
}

export function RuntimeInvestigatorPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const currentOrgId = useSessionStore(state => state.currentOrgId)
  const opsScope = useShellStore(state => state.opsScope)
  const [queryInput, setQueryInput] = useState(searchParams.get('query') || '')
  const [items, setItems] = useState<RuntimeJob[]>([])
  const [detail, setDetail] = useState<RuntimeJobDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const query = searchParams.get('query') || ''
  const selectedJobID = searchParams.get('job_id') || ''
  const scopedOrgId = opsScope === 'workspace' ? (currentOrgId ?? undefined) : undefined

  useEffect(() => {
    setQueryInput(query)
  }, [query])

  useEffect(() => {
    if (opsScope === 'workspace' && !currentOrgId) {
      setItems([])
      setDetail(null)
      setError('Workspace scope needs a selected organization.')
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const result = await platformClient.runtimeJobs({ organizationId: scopedOrgId, query, limit: 20, offset: 0 })
        if (cancelled) return
        setItems(result.items)
      } catch (err) {
        if (cancelled) return
        setItems([])
        setError(err instanceof Error ? err.message : 'Failed to load runtime jobs')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [currentOrgId, opsScope, query, scopedOrgId])

  useEffect(() => {
    if (!selectedJobID || (opsScope === 'workspace' && !currentOrgId)) {
      setDetail(null)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        setError(null)
        const result = await platformClient.runtimeJobDetail(selectedJobID)
        if (!cancelled) setDetail(result)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load runtime job detail')
      }
    })()
    return () => { cancelled = true }
  }, [selectedJobID, opsScope, currentOrgId])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setSearchParams(queryInput.trim() ? { query: queryInput.trim() } : {})
  }

  const storageKeys = collectStorageKeys(detail?.job.output_manifest)

  return (
    <div className="space-y-8">
      <PageHeader title="Runtime Investigator" description="找任务、看阶段/provider/attempt、跳扣费会话，并从输出清单追踪资产。" />
      <SectionCard title="Find runtime job" description={opsScope === 'global' ? 'Global scope searches all visible organizations.' : 'Workspace scope searches the selected organization only.'}>
        <form onSubmit={submit} className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-soft)]" />
            <input value={queryInput} onChange={event => setQueryInput(event.target.value)} placeholder="job_id / provider_job_id / source_id / status" className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] py-2.5 pl-10 pr-4 text-sm text-[var(--text)] outline-none focus:border-[var(--primary-soft)]" />
          </div>
          <button className="rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-black">Search</button>
        </form>
      </SectionCard>
      <ErrorBanner message={error} />
      <SectionCard title="Matching jobs" description="点击 job 可在本页展开证据，也可打开既有 Runtime source-of-truth 详情页。">
        {loading ? <EmptyState>Loading runtime jobs...</EmptyState> : null}
        {!loading && !items.length ? <EmptyState>No runtime jobs returned.</EmptyState> : null}
        <div className="space-y-2">
          {items.map(item => (
            <div key={item.id} className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <p className="break-all font-mono text-sm font-semibold text-white">{item.id}</p>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">{item.task_type} · {item.source_type}/{item.source_id} · {item.provider_code}</p>
                  <p className="mt-1 text-sm text-[var(--text-soft)]">{item.stage_message || item.error_message || 'No stage message'}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusPill tone={toneForStatus(item.status)}>{item.status}</StatusPill>
                  <StatusPill tone={toneForStatus(item.stage)}>{item.stage}</StatusPill>
                  <StatusPill>attempt {item.attempt_count}/{item.max_attempts}</StatusPill>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-sm">
                <button type="button" onClick={() => setSearchParams({ ...(query ? { query } : {}), job_id: item.id })} className="text-[var(--primary)] hover:underline">Inspect inline</button>
                <Link to={`/runtime/jobs/${item.id}`} className="inline-flex items-center gap-1 text-[var(--primary)] hover:underline">Open detail <ExternalLink className="h-3 w-3" /></Link>
                {item.charge_session_id ? <Link to={`/billing/charge-sessions/${item.charge_session_id}`} className="text-[var(--primary)] hover:underline">Open charge session</Link> : null}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
      {detail ? (
        <SectionCard title="Runtime evidence chain" description="只展示排障必要字段；provider request/response 原文不在 Workbench 展示，避免泄露敏感参数。">
          <div className="grid gap-3 md:grid-cols-3">
            <DetailRow label="job" value={detail.job.id} />
            <DetailRow label="provider job" value={detail.job.provider_job_id} />
            <DetailRow label="charge session" value={detail.job.charge_session_id} />
            <DetailRow label="organization" value={detail.job.organization_id} />
            <DetailRow label="source" value={`${detail.job.source_type}/${detail.job.source_id}`} />
            <DetailRow label="error" value={detail.job.error_code || detail.job.error_class || detail.job.error_message} />
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-[var(--text)]">Attempts</p>
              {detail.attempts.length ? detail.attempts.map(attempt => (
                <div key={attempt.id} className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3 text-sm">
                  <div className="flex flex-wrap gap-2"><StatusPill tone={toneForStatus(attempt.status)}>{attempt.status}</StatusPill><StatusPill>#{attempt.attempt_no}</StatusPill><StatusPill>{attempt.provider_code}</StatusPill></div>
                  <p className="mt-2 text-[var(--text-muted)]">{attempt.error_code || attempt.error_class || attempt.error_message || 'No attempt error'}</p>
                </div>
              )) : <EmptyState>No attempts recorded.</EmptyState>}
            </div>
            <div className="space-y-4">
              <CodeBlock label="route snapshot" value={detail.job.route_snapshot} />
              <CodeBlock label="output manifest" value={detail.job.output_manifest} />
              {storageKeys.length ? <div className="space-y-2"><p className="text-sm font-semibold text-[var(--text)]">Storage keys</p>{storageKeys.map(key => <button key={key} type="button" onClick={async () => { try { await platformClient.openAssetContent(key) } catch { setError('Failed to open asset content') } }} className="block break-all text-left font-mono text-xs text-[var(--primary)] hover:underline">{key}</button>)}</div> : null}
            </div>
          </div>
        </SectionCard>
      ) : (
        <SectionCard title="Workflow" description="Runtime 排障路径">
          <div className="grid gap-3 md:grid-cols-4">
            {['Find job', 'Inspect status/stage/provider', 'Open charge session', 'Pivot to audit/assets'].map((step, index) => <div key={step} className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4 text-sm text-[var(--text-muted)]"><Activity className="mb-2 h-4 w-4 text-[var(--primary)]" />{index + 1}. {step}</div>)}
          </div>
        </SectionCard>
      )}
    </div>
  )
}
