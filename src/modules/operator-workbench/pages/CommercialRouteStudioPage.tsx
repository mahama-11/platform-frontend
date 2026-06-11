import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Route, Send } from 'lucide-react'

import { CodeBlock, DetailRow, EmptyState, ErrorBanner, StatusPill, toneForStatus } from '@/modules/operator-workbench/components/WorkbenchPrimitives'
import { platformClient } from '@/shared/api/platformClient'
import { PageHeader } from '@/shared/ui/PageHeader'
import { SectionCard } from '@/shared/ui/SectionCard'
import type { BillingProfileRecord, CommercialEntityRecord, ResolveRouteResult, RoutingPolicyRecord } from '@/shared/types/platform'

export function CommercialRouteStudioPage() {
  const [entities, setEntities] = useState<CommercialEntityRecord[]>([])
  const [profiles, setProfiles] = useState<BillingProfileRecord[]>([])
  const [policies, setPolicies] = useState<RoutingPolicyRecord[]>([])
  const [result, setResult] = useState<ResolveRouteResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ organization_id: '', billing_profile_key: '', channel: 'web', currency: 'CNY', region: 'CN', payment_scene: '', order_type: '' })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setError(null)
        const [entityResult, profileResult, policyResult] = await Promise.all([
          platformClient.commercialEntities(),
          platformClient.billingProfiles(),
          platformClient.routingPolicies(),
        ])
        if (cancelled) return
        setEntities(entityResult.items)
        setProfiles(profileResult.items)
        setPolicies(policyResult.items)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load commercial route data')
      }
    })()
    return () => { cancelled = true }
  }, [])

  const updateField = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }))

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    try {
      setError(null)
      setResult(null)
      const payload = Object.fromEntries(Object.entries(form).filter(([, value]) => value.trim()))
      const resolved = await platformClient.resolveCommercialRoute(payload)
      setResult(resolved)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No route resolved for this preview input')
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Commercial Route Studio" description="只读 preview：调用 route resolve，展示 billing profile / entity / merchant / settlement 选择，不修改 routing policy。" />
      <ErrorBanner message={error} />
      <SectionCard title="Current commercial graph" description="从现有商业配置读取实体、billing profile 与 routing policy 数量。">
        <div className="grid gap-4 lg:grid-cols-3"><div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4"><p className="text-sm font-semibold text-[var(--text)]">Commercial entities</p><p className="mt-1 text-2xl font-semibold text-white">{entities.length}</p></div><div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4"><p className="text-sm font-semibold text-[var(--text)]">Billing profiles</p><p className="mt-1 text-2xl font-semibold text-white">{profiles.length}</p></div><div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4"><p className="text-sm font-semibold text-[var(--text)]">Routing policies</p><p className="mt-1 text-2xl font-semibold text-white">{policies.length}</p></div></div>
      </SectionCard>
      <SectionCard title="Resolve route preview" description="输入 organization/channel/currency/region 等上下文；失败时显示 clear no-route state，而不是假成功。">
        <form onSubmit={submit} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {Object.entries(form).map(([key, value]) => <label key={key} className="text-sm"><span className="mb-1 block text-xs uppercase tracking-wide text-[var(--text-soft)]">{key}</span><input value={value} onChange={event => updateField(key as keyof typeof form, event.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--primary-soft)]" /></label>)}
          <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-black md:col-span-2 xl:col-span-4"><Send className="h-4 w-4" />Resolve route</button>
        </form>
        {result ? <div className="mt-5 grid gap-3 md:grid-cols-3"><DetailRow label="billing profile" value={`${result.billing_profile_code || '—'} / ${result.billing_profile_id}`} /><DetailRow label="commercial entity" value={result.commercial_entity_id} /><DetailRow label="merchant account" value={result.merchant_account_id} /><DetailRow label="settlement account" value={result.settlement_account_id} /><DetailRow label="routing policy" value={result.routing_policy_id} /><DetailRow label="reason" value={result.resolution_reason} /><div className="md:col-span-3"><CodeBlock label="route snapshot" value={result.route_snapshot} /></div></div> : null}
      </SectionCard>
      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Entities" description="Commercial entity 是公共中台事实，不在 Workbench 编辑。">
          {entities.length ? <div className="space-y-2">{entities.slice(0, 10).map(entity => <div key={entity.id} className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium text-[var(--text)]">{entity.code} · {entity.name}</p><StatusPill tone={toneForStatus(entity.status)}>{entity.status}</StatusPill></div><p className="mt-1 text-[var(--text-muted)]">{entity.entity_type} · {entity.country_code} · {entity.currency}</p></div>)}</div> : <EmptyState>No commercial entities returned.</EmptyState>}
        </SectionCard>
        <SectionCard title="Routing policies" description="前 10 条 policy 预览；编辑请回商品/商家 source-of-truth 页面。">
          {policies.length ? <div className="space-y-2">{policies.slice(0, 10).map(policy => <div key={policy.id} className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium text-[var(--text)]">priority {policy.priority} · {policy.match_type}</p><StatusPill tone={toneForStatus(policy.status)}>{policy.status}</StatusPill></div><p className="mt-1 break-all font-mono text-xs text-[var(--text-muted)]">{policy.id}</p></div>)}</div> : <EmptyState>No routing policies returned.</EmptyState>}
          <div className="mt-3 flex gap-3 text-sm"><Link to="/merchants" className="text-[var(--primary)] hover:underline">Open merchants</Link><Link to="/catalog" className="text-[var(--primary)] hover:underline">Open catalog</Link></div>
        </SectionCard>
      </div>
      <SectionCard title="No-write guardrail" description="Workbench preview uses existing resolve endpoint only."><div className="rounded-lg border border-dashed border-[var(--border-strong)] bg-[var(--bg)] p-4 text-sm text-[var(--text-muted)]"><Route className="mb-2 h-4 w-4 text-[var(--primary)]" />Create/update/delete routing policy remains outside Phase 1 and requires Phase 2 high-risk wrappers.</div></SectionCard>
    </div>
  )
}
