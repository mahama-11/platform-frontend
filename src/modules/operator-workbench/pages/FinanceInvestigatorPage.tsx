import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CreditCard, Search, Wallet } from 'lucide-react'

import { ErrorBanner, EmptyState, StatusPill, toneForStatus, DetailRow, CodeBlock } from '@/modules/operator-workbench/components/WorkbenchPrimitives'
import { useSessionStore } from '@/app/store/sessionStore'
import { useShellStore } from '@/app/store/shellStore'
import { platformClient } from '@/shared/api/platformClient'
import { PageHeader } from '@/shared/ui/PageHeader'
import { SectionCard } from '@/shared/ui/SectionCard'
import type { ChargeSession, DiscountLedger, SettlementRecord, WalletSummary } from '@/shared/types/platform'

export function FinanceInvestigatorPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const currentOrgId = useSessionStore(state => state.currentOrgId)
  const opsScope = useShellStore(state => state.opsScope)
  const [queryInput, setQueryInput] = useState(searchParams.get('query') || '')
  const [chargeSessions, setChargeSessions] = useState<ChargeSession[]>([])
  const [selected, setSelected] = useState<ChargeSession | null>(null)
  const [settlement, setSettlement] = useState<SettlementRecord | null>(null)
  const [settlements, setSettlements] = useState<SettlementRecord[]>([])
  const [discounts, setDiscounts] = useState<DiscountLedger[]>([])
  const [wallet, setWallet] = useState<WalletSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const query = searchParams.get('query') || ''
  const selectedChargeID = searchParams.get('charge_session_id') || ''
  const scopedOrgId = opsScope === 'workspace' ? (currentOrgId ?? undefined) : undefined

  useEffect(() => {
    setQueryInput(query)
  }, [query])

  useEffect(() => {
    if (opsScope === 'workspace' && !currentOrgId) {
      setChargeSessions([])
      setSelected(null)
      setSettlement(null)
      setError('Workspace scope needs a selected organization.')
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const result = await platformClient.chargeSessions({ organizationId: scopedOrgId, query, limit: 20, offset: 0 })
        if (cancelled) return
        setChargeSessions(result.items)
      } catch (err) {
        if (cancelled) return
        setChargeSessions([])
        setError(err instanceof Error ? err.message : 'Failed to load charge sessions')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [currentOrgId, opsScope, query, scopedOrgId])

  useEffect(() => {
    if (!selectedChargeID || (opsScope === 'workspace' && !currentOrgId)) {
      setSelected(null)
      setSettlement(null)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        setError(null)
        const detail = await platformClient.chargeSessionDetail(selectedChargeID)
        if (cancelled) return
        setSelected(detail)
        if (detail.event_id) {
          try {
            const settlementDetail = await platformClient.settlementDetail(detail.event_id)
            if (!cancelled) setSettlement(settlementDetail)
          } catch {
            if (!cancelled) setSettlement(null)
          }
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load charge session detail')
      }
    })()
    return () => { cancelled = true }
  }, [selectedChargeID, opsScope, currentOrgId])

  useEffect(() => {
    if (opsScope !== 'workspace' || !currentOrgId) {
      setSettlements([])
      setDiscounts([])
      setWallet(null)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const [settlementResponse, discountResponse, walletResponse] = await Promise.all([
          platformClient.settlements('organization', currentOrgId, ''),
          platformClient.discounts('organization', currentOrgId, ''),
          platformClient.walletSummary('organization', currentOrgId, ''),
        ])
        if (cancelled) return
        setSettlements(settlementResponse.items)
        setDiscounts(discountResponse.items)
        setWallet(walletResponse)
      } catch {
        if (cancelled) return
        setSettlements([])
        setDiscounts([])
        setWallet(null)
      }
    })()
    return () => { cancelled = true }
  }, [currentOrgId, opsScope])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setSearchParams(queryInput.trim() ? { query: queryInput.trim() } : {})
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Finance & Charge Investigator" description="解释 charge session、settlement、discount、wallet 与商业路由快照之间的证据链。" />
      <SectionCard title="Find charge session" description="全局范围可搜索扣费会话；settlement、discount、wallet 需要 workspace scope 才有明确 billing subject。">
        <form onSubmit={submit} className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-soft)]" /><input value={queryInput} onChange={event => setQueryInput(event.target.value)} placeholder="charge_session_id / source_id / event_id / reservation_id" className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] py-2.5 pl-10 pr-4 text-sm text-[var(--text)] outline-none focus:border-[var(--primary-soft)]" /></div>
          <button className="rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-black">Search</button>
        </form>
      </SectionCard>
      <ErrorBanner message={error} />
      <SectionCard title="Charge sessions" description="扣费会话是 runtime usage 与 finance facts 的连接点。">
        {loading ? <EmptyState>Loading charge sessions...</EmptyState> : null}
        {!loading && !chargeSessions.length ? <EmptyState>No charge sessions returned.</EmptyState> : null}
        <div className="space-y-2">
          {chargeSessions.map(item => (
            <div key={item.id} className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0"><p className="break-all font-mono text-sm font-semibold text-white">{item.id}</p><p className="mt-1 text-sm text-[var(--text-muted)]">{item.source_type}/{item.source_id} · {item.billable_item_code} · {item.resource_type}</p><p className="mt-1 text-sm text-[var(--text-soft)]">event {item.event_id || '—'} · reservation {item.reservation_id || '—'}</p></div>
                <div className="flex flex-wrap gap-2"><StatusPill tone={toneForStatus(item.status)}>{item.status}</StatusPill><StatusPill>units {item.final_units || item.estimated_units}</StatusPill></div>
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-sm"><button type="button" onClick={() => setSearchParams({ ...(query ? { query } : {}), charge_session_id: item.id })} className="text-[var(--primary)] hover:underline">Explain inline</button><Link to={`/billing/charge-sessions/${item.id}`} className="text-[var(--primary)] hover:underline">Open charge session detail</Link>{item.event_id ? <Link to={`/billing/settlements/${item.event_id}`} className="text-[var(--primary)] hover:underline">Open settlement</Link> : null}</div>
            </div>
          ))}
        </div>
      </SectionCard>
      {selected ? (
        <SectionCard title="Charge evidence chain" description="route snapshot 与 settlement snapshot 是证据，不替代业务解释；异常时继续跳 Audit。">
          <div className="grid gap-3 md:grid-cols-3"><DetailRow label="charge session" value={selected.id} /><DetailRow label="status" value={selected.status} /><DetailRow label="event" value={selected.event_id} /><DetailRow label="billing subject" value={`${selected.billing_subject_type}/${selected.billing_subject_id}`} /><DetailRow label="organization" value={selected.organization_id} /><DetailRow label="user" value={selected.user_id} /></div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2"><CodeBlock label="charge route snapshot" value={selected.route_snapshot} /><CodeBlock label="charge metadata" value={selected.metadata} />{settlement ? <CodeBlock label="settlement snapshot" value={settlement.snapshot} /> : <div className="rounded-lg border border-dashed border-[var(--border-strong)] bg-[var(--bg)] p-4 text-sm text-[var(--text-muted)]">No settlement detail returned for this event.</div>}</div>
        </SectionCard>
      ) : null}
      <SectionCard title="Workspace finance context" description="切到 workspace scope 后展示当前组织 wallet / settlements / discounts，用于解释扣费上下文。">
        {opsScope === 'global' ? <div className="rounded-lg border border-dashed border-[var(--border-strong)] bg-[var(--bg)] p-5 text-sm text-[var(--text-muted)]">当前是 global scope。Wallet、settlement、discount 需要明确 billing subject；请在顶部切换到 workspace scope 后查看。</div> : (
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4"><Wallet className="mb-2 h-4 w-4 text-[var(--primary)]" /><p className="text-sm font-semibold text-[var(--text)]">Wallet</p><p className="mt-1 text-sm text-[var(--text-muted)]">total {wallet?.total_balance ?? '—'} · reward {wallet?.reward_balance ?? '—'} · allowance {wallet?.allowance_balance ?? '—'}</p></div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4"><CreditCard className="mb-2 h-4 w-4 text-[var(--primary)]" /><p className="text-sm font-semibold text-[var(--text)]">Settlements</p><p className="mt-1 text-sm text-[var(--text-muted)]">{settlements.length} records loaded</p></div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4"><CreditCard className="mb-2 h-4 w-4 text-[var(--primary)]" /><p className="text-sm font-semibold text-[var(--text)]">Discounts</p><p className="mt-1 text-sm text-[var(--text-muted)]">{discounts.length} records loaded</p></div>
          </div>
        )}
      </SectionCard>
    </div>
  )
}
