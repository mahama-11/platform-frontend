import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Clock3, ShieldAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'

import { useSessionStore } from '@/app/store/sessionStore'
import { useShellStore } from '@/app/store/shellStore'
import { platformClient } from '@/shared/api/platformClient'
import { PageHeader } from '@/shared/ui/PageHeader'
import { SectionCard } from '@/shared/ui/SectionCard'
import { StatCard } from '@/shared/ui/StatCard'
import type { DiscountLedger, SettlementRecord, WalletSummary } from '@/shared/types/platform'

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 }
}

export function OverviewPage() {
  const { t } = useTranslation()
  const currentOrgId = useSessionStore(state => state.currentOrgId)
  const currentUser = useSessionStore(state => state.currentUser)
  const opsScope = useShellStore(state => state.opsScope)
  const [walletSummary, setWalletSummary] = useState<WalletSummary | null>(null)
  const [settlements, setSettlements] = useState<SettlementRecord[]>([])
  const [discounts, setDiscounts] = useState<DiscountLedger[]>([])
  const [healthStatus, setHealthStatus] = useState('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setError(null)
        const health = await platformClient.healthz()
        if (cancelled) return
        setHealthStatus(health.data.status)

        if (opsScope === 'workspace' && currentOrgId) {
          const [wallet, settlementResponse, discountResponse] = await Promise.all([
            platformClient.walletSummary('organization', currentOrgId, ''),
            platformClient.settlements('organization', currentOrgId, ''),
            platformClient.discounts('organization', currentOrgId, ''),
          ])
          if (cancelled) return
          setWalletSummary(wallet)
          setSettlements(settlementResponse.items)
          setDiscounts(discountResponse.items)
          return
        }

        setWalletSummary(null)
        setSettlements([])
        setDiscounts([])
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load dashboard')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [currentOrgId, opsScope])

  const pendingSettlements = useMemo(() => settlements.filter(item => item.status !== 'settled').length, [settlements])
  const discountedEvents = discounts.length

  return (
    <div className="space-y-8">
      <PageHeader title={t('dashboard.title')} description={t('dashboard.description')} />

      {error ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
          {error}
        </motion.div>
      ) : null}

      <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-auto-fit gap-4">
        <motion.div variants={itemVariants}><StatCard label={t('dashboard.cards.activeOrgs')} value={String(currentUser?.orgs.length ?? 0)} hint="Loaded from current authenticated user context." tone="primary" /></motion.div>
        <motion.div variants={itemVariants}><StatCard label={t('dashboard.cards.runtimeToday')} value={opsScope === 'global' ? t('topbar.global') : (walletSummary ? walletSummary.product_code || 'all' : '--')} hint={opsScope === 'global' ? 'Platform overview is currently running in global operator scope.' : 'First real integration starts from org-scoped wallet and billing visibility.'} tone="success" /></motion.div>
        <motion.div variants={itemVariants}><StatCard label={t('dashboard.cards.pendingSettlement')} value={opsScope === 'global' ? '--' : String(pendingSettlements)} hint={opsScope === 'global' ? 'Global pending settlement summary is not exposed yet.' : 'Real metering settlement records under the current org context.'} tone="warning" /></motion.div>
        <motion.div variants={itemVariants}><StatCard label={t('dashboard.cards.highRiskEvents')} value={opsScope === 'global' ? '--' : String(discountedEvents)} hint={opsScope === 'global' ? 'Discount ledger aggregation is still workspace-scoped.' : 'Using current discount ledger count as first live finance signal.'} tone="danger" /></motion.div>
      </motion.div>

      <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <motion.div variants={itemVariants}>
          <SectionCard title={t('dashboard.sections.priorities')} description="Live platform signals driven by wallet, metering, and settlement APIs.">
            <div className="space-y-3">
              <div className="group rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4 transition-colors hover:border-[var(--border-strong)]">
                <div className="flex items-start gap-4">
                  <div className="mt-0.5 rounded-md bg-amber-500/10 p-2">
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white">Wallet balance</p>
                    <p className="mt-1 text-sm text-[var(--text-muted)] leading-relaxed">
                      {opsScope === 'global'
                        ? 'Global operator scope is active. Wallet summary remains organization-scoped until the platform exposes an aggregate finance API.'
                        : walletSummary
                          ? `Total balance ${walletSummary.total_balance}, allowance ${walletSummary.allowance_balance}, credits ${walletSummary.permanent_balance}.`
                          : 'Waiting for real wallet summary.'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="group rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4 transition-colors hover:border-[var(--border-strong)]">
                <div className="flex items-start gap-4">
                  <div className="mt-0.5 rounded-md bg-sky-500/10 p-2">
                    <Clock3 className="h-4 w-4 text-sky-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white">Recent settlement footprint</p>
                    <p className="mt-1 text-sm text-[var(--text-muted)] leading-relaxed">
                      {opsScope === 'global'
                        ? 'Settlement summary remains workspace-scoped for now. Switch to workspace scope to inspect finance detail.'
                        : settlements.length
                          ? `Loaded ${settlements.length} settlement records for the current org.`
                          : 'No settlement records returned for the current scope.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>
        </motion.div>

        <motion.div variants={itemVariants}>
          <SectionCard title={t('dashboard.sections.systems')} description={t('common.allSystemsNominal')}>
            <div className="space-y-3">
              {[
                { icon: CheckCircle2, name: 'Healthz', status: healthStatus, note: 'Directly fetched from /healthz.', tone: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                { icon: ShieldAlert, name: 'Wallet Summary', status: opsScope === 'global' ? 'workspace-only' : (walletSummary ? 'healthy' : 'observe'), note: opsScope === 'global' ? 'Aggregate wallet summary is not exposed yet; use workspace scope for finance detail.' : 'Live /api/v1/wallet/summary integration.', tone: 'text-sky-400', bg: 'bg-sky-500/10' },
                { icon: Clock3, name: 'Metering', status: opsScope === 'global' ? 'workspace-only' : (settlements.length ? 'healthy' : 'observe'), note: opsScope === 'global' ? 'Settlement list is currently scoped to a specific organization.' : 'Live settlement list for current organization.', tone: 'text-sky-400', bg: 'bg-sky-500/10' },
              ].map(system => {
                const Icon = system.icon
                return (
                  <div key={system.name} className="group rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4 transition-colors hover:border-[var(--border-strong)]">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`rounded-md p-2 ${system.bg}`}>
                          <Icon className={`h-4 w-4 ${system.tone}`} />
                        </div>
                        <div>
                          <p className="font-medium text-white">{system.name}</p>
                          <p className="text-sm text-[var(--text-muted)]">{system.note}</p>
                        </div>
                      </div>
                      <span className="shrink-0 rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-2 py-1 text-xs font-mono uppercase tracking-wider text-[var(--text-soft)]">{system.status}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </SectionCard>
        </motion.div>
      </motion.div>
    </div>
  )
}
