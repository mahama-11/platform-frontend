import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

import { platformClient } from '@/shared/api/platformClient'
import {
  formatMinorMoney,
  getBillingFieldLabel,
  getBillingProductLabel,
  getBillingSettlementModeLabel,
  getBillingStatusLabel,
} from '@/shared/i18n/helpers'
import { PageHeader } from '@/shared/ui/PageHeader'
import { SectionCard } from '@/shared/ui/SectionCard'
import type { SettlementRecord } from '@/shared/types/platform'

function prettyJSON(value: string) {
  if (!value) return ''
  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  } catch {
    return value
  }
}

export function SettlementDetailPage() {
  const { t } = useTranslation()
  const { eventID = '' } = useParams()
  const [item, setItem] = useState<SettlementRecord | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!eventID) return
    let cancelled = false
    ;(async () => {
      try {
        setError(null)
        const result = await platformClient.settlementDetail(eventID)
        if (cancelled) return
        setItem(result)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : t('billing.error.loadSettlementDetail'))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [eventID, t])

  const snapshot = useMemo(() => prettyJSON(item?.snapshot || ''), [item?.snapshot])

  return (
    <div className="space-y-8">
      <PageHeader title={item?.event_id || t('billing.detail.settlementTitle')} description={t('billing.detail.settlementDescription')} />
      {error ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
          {error}
        </motion.div>
      ) : null}
      
      {item ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          <SectionCard title={t('billing.detail.settlementSnapshot')} description={t('billing.sectionDescription.settlementSnapshot')}>
            <div className="grid grid-auto-fit gap-4">
              {[
                ['status', getBillingStatusLabel(t, item.status)],
                ['product', getBillingProductLabel(t, item.product_code)],
                ['mode', getBillingSettlementModeLabel(t, item.settlement_mode)],
                ['billable_item', item.billable_item_code],
                ['net_amount', formatMinorMoney(t, item.currency, item.net_amount)],
                ['discount_amount', formatMinorMoney(t, item.currency, item.discount_amount)],
                ['wallet_debited', formatMinorMoney(t, item.currency, item.wallet_debited)],
                ['credits_consumed', String(item.credits_consumed)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-5 transition-colors hover:border-[var(--border-strong)]">
                  <p className="text-xs uppercase tracking-wider font-medium text-[var(--text-soft)]">{getBillingFieldLabel(t, label)}</p>
                  <p className="mt-1.5 break-all text-sm font-medium text-[var(--text)]">{value}</p>
                </div>
              ))}
            </div>
          </SectionCard>
          <SectionCard title={t('billing.detail.snapshot')} description={t('billing.sectionDescription.snapshot')}>
            <pre className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-4 text-xs leading-relaxed text-[var(--text-muted)]">{snapshot || t('billing.detail.noSnapshot')}</pre>
          </SectionCard>
        </motion.div>
      ) : <p className="text-sm text-[var(--text-muted)] py-4 text-center">{t('billing.detail.loadingSettlementDetail')}</p>}
    </div>
  )
}
