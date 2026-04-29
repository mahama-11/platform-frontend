import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'

import { useSessionStore } from '@/app/store/sessionStore'
import { useShellStore } from '@/app/store/shellStore'
import { platformClient } from '@/shared/api/platformClient'
import {
  formatMinorMoney,
  getBillingDiscountTypeLabel,
  getBillingProductLabel,
  getBillingResourceTypeLabel,
  getBillingSettlementModeLabel,
  getBillingSourceTypeLabel,
  getBillingStatusLabel,
} from '@/shared/i18n/helpers'
import { PageHeader } from '@/shared/ui/PageHeader'
import { SectionCard } from '@/shared/ui/SectionCard'
import type { ChargeSession, DiscountLedger, SettlementRecord } from '@/shared/types/platform'

const listVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 5 },
  show: { opacity: 1, y: 0 }
}

export function BillingPage() {
  const { t } = useTranslation()
  const currentOrgId = useSessionStore(state => state.currentOrgId)
  const opsScope = useShellStore(state => state.opsScope)
  const [chargeSessions, setChargeSessions] = useState<ChargeSession[]>([])
  const [settlements, setSettlements] = useState<SettlementRecord[]>([])
  const [discounts, setDiscounts] = useState<DiscountLedger[]>([])
  const [error, setError] = useState<string | null>(null)
  const scopedOrgId = opsScope === 'workspace' ? (currentOrgId ?? undefined) : undefined

  useEffect(() => {
    if (opsScope === 'workspace' && !currentOrgId) return
    let cancelled = false
    ;(async () => {
      try {
        setError(null)
        const chargeSessionResponse = await platformClient.chargeSessions({ organizationId: scopedOrgId, limit: 20, offset: 0 })
        if (cancelled) return
        setChargeSessions(chargeSessionResponse.items)

        if (opsScope === 'workspace' && currentOrgId) {
          const [settlementResponse, discountResponse] = await Promise.all([
            platformClient.settlements('organization', currentOrgId, ''),
            platformClient.discounts('organization', currentOrgId, ''),
          ])
          if (cancelled) return
          setSettlements(settlementResponse.items)
          setDiscounts(discountResponse.items)
          return
        }

        setSettlements([])
        setDiscounts([])
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : t('billing.error.loadBillingData'))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [currentOrgId, opsScope, scopedOrgId, t])

  return (
    <div className="space-y-8">
      <PageHeader title={t('billing.title')} description={t('billing.description')} />
      {error ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
          {error}
        </motion.div>
      ) : null}
      
      <SectionCard
        title={t('billing.sections.chargeSessions')}
        description={opsScope === 'global' ? t('billing.sectionDescription.chargeSessionsGlobal') : t('billing.sectionDescription.chargeSessionsWorkspace')}
      >
        <motion.div variants={listVariants} initial="hidden" animate="show" className="space-y-2">
          {chargeSessions.length ? chargeSessions.map(item => (
            <motion.div variants={itemVariants} key={item.id}>
              <Link to={`/billing/charge-sessions/${item.id}`} className="group flex flex-col gap-4 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4 transition-all hover:border-[var(--border-strong)] hover:shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-sm font-medium text-white truncate">{item.id}</p>
                  <p className="mt-1.5 text-sm text-[var(--text-muted)] flex items-center gap-2 truncate">
                    <span>{getBillingSourceTypeLabel(t, item.source_type)}/{item.source_id}</span>
                    <span className="h-1 w-1 rounded-full bg-[var(--border-strong)]" />
                    <span>{item.billable_item_code}</span>
                    <span className="h-1 w-1 rounded-full bg-[var(--border-strong)]" />
                    <span>{getBillingResourceTypeLabel(t, item.resource_type)}</span>
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-soft)] truncate">{t('billing.label.reservation')} {item.reservation_id || '-'} · {t('billing.label.event')} {item.event_id || '-'}</p>
                </div>
                <div className="flex flex-wrap shrink-0 items-center gap-2 sm:justify-end">
                  <span className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-2.5 py-1 text-xs font-medium text-[var(--text)] tracking-wide">{getBillingStatusLabel(t, item.status)}</span>
                  <span className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-2.5 py-1 text-xs font-medium text-[var(--text)] tracking-wide">{t('billing.label.units')} {item.final_units || item.estimated_units}</span>
                </div>
              </Link>
            </motion.div>
          )) : <p className="text-sm text-[var(--text-muted)] py-4 text-center">{opsScope === 'global' ? t('billing.empty.chargeSessionsGlobal') : t('billing.empty.chargeSessionsWorkspace')}</p>}
        </motion.div>
      </SectionCard>

      <SectionCard title={t('billing.sections.settlements')} description={t('billing.sectionDescription.settlements')}>
        {opsScope === 'global' ? (
          <div className="rounded-lg border border-dashed border-[var(--border-strong)] bg-[var(--bg)] p-5">
            <p className="text-sm font-semibold text-[var(--text)]">{t('billing.scopeRequired.title')}</p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
              {t('billing.scopeRequired.settlements')}
            </p>
          </div>
        ) : (
          <motion.div variants={listVariants} initial="hidden" animate="show" className="space-y-2">
          {settlements.length ? settlements.map(item => (
            <motion.div variants={itemVariants} key={item.id}>
              <Link to={`/billing/settlements/${item.event_id}`} className="group flex flex-col gap-4 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4 transition-all hover:border-[var(--border-strong)] hover:shadow-sm md:flex-row md:items-center md:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-sm font-medium text-white truncate">{item.event_id}</p>
                  <p className="mt-1.5 text-sm text-[var(--text-muted)] flex items-center gap-2 truncate">
                    <span>{item.billable_item_code}</span>
                    <span className="h-1 w-1 rounded-full bg-[var(--border-strong)]" />
                    <span>{getBillingProductLabel(t, item.product_code)}</span>
                    <span className="h-1 w-1 rounded-full bg-[var(--border-strong)]" />
                    <span>{getBillingSettlementModeLabel(t, item.settlement_mode)}</span>
                  </p>
                </div>
                <div className="flex flex-wrap shrink-0 items-center gap-2 sm:justify-end">
                  <span className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-2.5 py-1 text-xs font-medium text-[var(--text)] tracking-wide">{getBillingStatusLabel(t, item.status)}</span>
                  <span className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-2.5 py-1 text-xs font-medium text-[var(--text)] tracking-wide">{t('billing.label.net')} {formatMinorMoney(t, item.currency, item.net_amount)}</span>
                  <span className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-2.5 py-1 text-xs font-medium text-[var(--text)] tracking-wide">{t('billing.label.wallet')} {formatMinorMoney(t, item.currency, item.wallet_debited)}</span>
                </div>
              </Link>
            </motion.div>
          )) : <p className="text-sm text-[var(--text-muted)] py-4 text-center">{t('billing.empty.settlements')}</p>}
        </motion.div>
        )}
      </SectionCard>

      <SectionCard title={t('billing.sections.discounts')} description={t('billing.sectionDescription.discounts')}>
        {opsScope === 'global' ? (
          <div className="rounded-lg border border-dashed border-[var(--border-strong)] bg-[var(--bg)] p-5">
            <p className="text-sm font-semibold text-[var(--text)]">{t('billing.scopeRequired.title')}</p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
              {t('billing.scopeRequired.discounts')}
            </p>
          </div>
        ) : (
          <motion.div variants={listVariants} initial="hidden" animate="show" className="grid grid-auto-fit gap-4">
          {discounts.length ? discounts.map(item => (
            <motion.div variants={itemVariants} key={item.id} className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-5 hover:border-[var(--border-strong)] transition-colors">
              <p className="font-medium text-white truncate">{getBillingDiscountTypeLabel(t, item.discount_type)}</p>
              <p className="mt-1.5 text-sm text-[var(--text-muted)] flex items-center gap-2 truncate">
                <span>{getBillingProductLabel(t, item.product_code || 'platform')}</span>
                <span className="h-1 w-1 rounded-full bg-[var(--border-strong)]" />
                <span>{getBillingSourceTypeLabel(t, item.reference_type)} / {item.reference_id || '-'}</span>
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-2 py-0.5 text-xs font-medium text-[var(--text)] tracking-wide">{getBillingStatusLabel(t, item.status)}</span>
                <span className="inline-flex items-center rounded-md border border-[var(--primary-soft)] text-[var(--primary)] bg-[var(--primary-soft)] px-2 py-0.5 text-xs font-medium uppercase tracking-wide">{item.currency || 'N/A'}</span>
                <span className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-2 py-0.5 text-xs font-medium text-[var(--text)] tracking-wide">{t('billing.label.amount')} {formatMinorMoney(t, item.currency, item.amount)}</span>
              </div>
            </motion.div>
          )) : <p className="text-sm text-[var(--text-muted)] col-span-full py-4 text-center">{t('billing.empty.discounts')}</p>}
        </motion.div>
        )}
      </SectionCard>
    </div>
  )
}
