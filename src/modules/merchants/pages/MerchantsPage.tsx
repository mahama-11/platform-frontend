import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Building2, Layers3, RefreshCw, Route, WalletCards } from 'lucide-react'

import { platformClient } from '@/shared/api/platformClient'
import { PageHeader } from '@/shared/ui/PageHeader'
import { SectionCard } from '@/shared/ui/SectionCard'
import type { BillingProfileRecord, CommercialEntityRecord, RoutingPolicyRecord } from '@/shared/types/platform'

const listVariants = {
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

function statusClass(status: string) {
  const normalized = status.toLowerCase()
  if (['active', 'enabled', 'success'].includes(normalized)) return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
  if (['inactive', 'disabled', 'restricted', 'failed'].includes(normalized)) return 'border-rose-500/30 bg-rose-500/10 text-rose-300'
  return 'border-amber-500/30 bg-amber-500/10 text-amber-200'
}

function formatDate(value: string) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function countByEntity(profiles: BillingProfileRecord[], entityID: string) {
  return profiles.filter(profile => profile.commercial_entity_id === entityID).length
}

function policiesForEntity(profiles: BillingProfileRecord[], policies: RoutingPolicyRecord[], entityID: string) {
  const profileIDs = new Set(profiles.filter(profile => profile.commercial_entity_id === entityID).map(profile => profile.id))
  return policies.filter(policy => profileIDs.has(policy.billing_profile_id)).length
}

function StatCard({ icon: Icon, label, value, detail }: { icon: typeof Building2; label: string; value: string | number; detail: string }) {
  return (
    <motion.div variants={itemVariants} className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-[var(--text-soft)]">{label}</p>
        <Icon className="h-4 w-4 text-sky-300" />
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-white">{value}</p>
      <p className="mt-1 text-sm text-[var(--text-muted)]">{detail}</p>
    </motion.div>
  )
}

export function MerchantsPage() {
  const { t } = useTranslation()
  const [entities, setEntities] = useState<CommercialEntityRecord[]>([])
  const [profiles, setProfiles] = useState<BillingProfileRecord[]>([])
  const [policies, setPolicies] = useState<RoutingPolicyRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState(0)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const [entityResult, profileResult, policyResult] = await Promise.all([
          platformClient.commercialEntities(),
          platformClient.billingProfiles(),
          platformClient.routingPolicies(),
        ])
        if (cancelled) return
        setEntities(entityResult.items ?? [])
        setProfiles(profileResult.items ?? [])
        setPolicies(policyResult.items ?? [])
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load commercial registry')
        setEntities([])
        setProfiles([])
        setPolicies([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [refreshToken])

  const activeEntities = useMemo(() => entities.filter(item => item.status === 'active').length, [entities])
  const activePolicies = useMemo(() => policies.filter(item => item.status === 'active').length, [policies])

  return (
    <div className="space-y-8">
      <PageHeader
        title={t('merchants.title')}
        description={t('merchants.description')}
        actions={(
          <button type="button" onClick={() => setRefreshToken(value => value + 1)} className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm font-medium text-[var(--text)] transition-colors hover:border-[var(--border-strong)]">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        )}
      />

      <SectionCard title="Commercial registry" description="Read-only view backed by Platform commercial APIs: entities, billing profiles, and routing policies. No static merchant sample data is rendered.">
        <motion.div variants={listVariants} initial="hidden" animate="show" className="grid gap-4 md:grid-cols-4">
          <StatCard icon={Building2} label="Commercial entities" value={entities.length} detail={`${activeEntities} active`} />
          <StatCard icon={WalletCards} label="Billing profiles" value={profiles.length} detail="Real /commercial/billing-profiles rows" />
          <StatCard icon={Route} label="Routing policies" value={policies.length} detail={`${activePolicies} active policies`} />
          <StatCard icon={Layers3} label="API source" value="3" detail="Read-only commercial endpoints" />
        </motion.div>
        {error ? <div className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div> : null}
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {['GET /commercial/entities', 'GET /commercial/billing-profiles', 'GET /commercial/routing-policies'].map(endpoint => (
            <div key={endpoint} className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3 font-mono text-xs text-sky-200">{endpoint}</div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Commercial entities" description="Operators can inspect entity ownership and the attached profile/routing footprint; writes remain in commercial administration flows.">
        {loading ? <p className="py-8 text-center text-sm text-[var(--text-muted)]">Loading commercial registry...</p> : null}
        {!loading && !error && entities.length === 0 ? <p className="py-8 text-center text-sm text-[var(--text-muted)]">No commercial entities returned by Platform commercial API.</p> : null}
        {!loading && entities.length ? (
          <div className="hidden overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg)] lg:block">
            <table className="min-w-full divide-y divide-[var(--border)] text-left text-sm">
              <thead className="bg-[var(--bg-muted)] text-[var(--text-soft)]">
                <tr>
                  {['Code', 'Name', 'Type', 'Currency', 'Status', 'Profiles', 'Routing', 'Updated'].map(head => (
                    <th key={head} className="px-4 py-3 text-xs font-medium uppercase tracking-wider">{head}</th>
                  ))}
                </tr>
              </thead>
              <motion.tbody variants={listVariants} initial="hidden" animate="show" className="divide-y divide-[var(--border)]">
                {entities.map(entity => (
                  <motion.tr variants={itemVariants} key={entity.id} className="transition-colors hover:bg-[var(--bg-muted)]/50">
                    <td className="px-4 py-3 font-mono text-xs text-[var(--text-muted)]">{entity.code}</td>
                    <td className="px-4 py-3 text-[var(--text)]">{entity.name}</td>
                    <td className="px-4 py-3 text-[var(--text-muted)]">{entity.entity_type || '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--text-muted)]">{entity.currency || '—'}</td>
                    <td className="px-4 py-3"><span className={`rounded border px-2 py-0.5 text-xs font-medium ${statusClass(entity.status)}`}>{entity.status || 'unknown'}</span></td>
                    <td className="px-4 py-3 text-[var(--text-muted)]">{countByEntity(profiles, entity.id)}</td>
                    <td className="px-4 py-3 text-[var(--text-muted)]">{policiesForEntity(profiles, policies, entity.id)}</td>
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)]">{formatDate(entity.updated_at)}</td>
                  </motion.tr>
                ))}
              </motion.tbody>
            </table>
          </div>
        ) : null}
        {!loading && entities.length ? (
          <motion.div variants={listVariants} initial="hidden" animate="show" className="space-y-3 lg:hidden">
            {entities.map(entity => (
              <motion.div variants={itemVariants} key={entity.id} className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4 transition-colors hover:border-[var(--border-strong)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{entity.name}</p>
                    <p className="mt-1 font-mono text-xs text-[var(--text-muted)]">{entity.code}</p>
                  </div>
                  <span className={`rounded border px-2 py-0.5 text-xs font-medium ${statusClass(entity.status)}`}>{entity.status || 'unknown'}</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div><span className="mb-1 block text-xs uppercase tracking-wider text-[var(--text-soft)]">Type</span><span className="text-[var(--text-muted)]">{entity.entity_type || '—'}</span></div>
                  <div><span className="mb-1 block text-xs uppercase tracking-wider text-[var(--text-soft)]">Currency</span><span className="font-mono text-[var(--text-muted)]">{entity.currency || '—'}</span></div>
                  <div><span className="mb-1 block text-xs uppercase tracking-wider text-[var(--text-soft)]">Profiles</span><span className="text-[var(--text-muted)]">{countByEntity(profiles, entity.id)}</span></div>
                  <div><span className="mb-1 block text-xs uppercase tracking-wider text-[var(--text-soft)]">Routing</span><span className="text-[var(--text-muted)]">{policiesForEntity(profiles, policies, entity.id)}</span></div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : null}
      </SectionCard>
    </div>
  )
}
