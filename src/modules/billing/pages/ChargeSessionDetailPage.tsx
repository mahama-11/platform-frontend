import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

import { platformClient } from '@/shared/api/platformClient'
import {
  getBillingFieldLabel,
  getBillingProductLabel,
  getBillingSourceTypeLabel,
  getBillingStatusLabel,
} from '@/shared/i18n/helpers'
import { PageHeader } from '@/shared/ui/PageHeader'
import { SectionCard } from '@/shared/ui/SectionCard'
import type { ChargeSession } from '@/shared/types/platform'

function prettyJSON(value: string) {
  if (!value) return ''
  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  } catch {
    return value
  }
}

export function ChargeSessionDetailPage() {
  const { t } = useTranslation()
  const { chargeSessionID = '' } = useParams()
  const [item, setItem] = useState<ChargeSession | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!chargeSessionID) return
    let cancelled = false
    ;(async () => {
      try {
        setError(null)
        const result = await platformClient.chargeSessionDetail(chargeSessionID)
        if (cancelled) return
        setItem(result)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : t('billing.error.loadChargeSessionDetail'))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [chargeSessionID, t])

  const routeSnapshot = useMemo(() => prettyJSON(item?.route_snapshot || ''), [item?.route_snapshot])
  const metadata = useMemo(() => prettyJSON(item?.metadata || ''), [item?.metadata])

  return (
    <div className="space-y-8">
      <PageHeader title={item?.id || t('billing.detail.chargeSessionTitle')} description={t('billing.detail.chargeSessionDescription')} />
      {error ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
          {error}
        </motion.div>
      ) : null}
      
      {item ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          <SectionCard title={t('billing.detail.sessionSnapshot')} description={t('billing.sectionDescription.sessionSnapshot')}>
            <div className="grid grid-auto-fit gap-4">
              {[
                ['status', getBillingStatusLabel(t, item.status)],
                ['source', `${getBillingSourceTypeLabel(t, item.source_type)}/${item.source_id}`],
                ['product', getBillingProductLabel(t, item.product_code)],
                ['billable_item', item.billable_item_code],
                ['reservation_id', item.reservation_id || '-'],
                ['finalization_id', item.finalization_id || '-'],
                ['event_id', item.event_id || '-'],
                ['settlement_id', item.settlement_id || '-'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-5 transition-colors hover:border-[var(--border-strong)]">
                  <p className="text-xs uppercase tracking-wider font-medium text-[var(--text-soft)]">{getBillingFieldLabel(t, label)}</p>
                  <p className="mt-1.5 break-all text-sm font-medium text-[var(--text)]">{value}</p>
                </div>
              ))}
            </div>
            {item.event_id ? (
              <div className="mt-6 border-t border-[var(--border)] pt-4">
                <Link className="text-sm font-medium text-[var(--primary)] hover:text-[var(--primary)]/80 transition-colors" to={`/billing/settlements/${item.event_id}`}>{t('billing.detail.openLinkedSettlement')} &rarr;</Link>
              </div>
            ) : null}
          </SectionCard>
          <SectionCard title={t('billing.detail.routeSnapshot')} description={t('billing.sectionDescription.routeSnapshot')}>
            <pre className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-4 text-xs leading-relaxed text-[var(--text-muted)]">{routeSnapshot || t('billing.detail.noData')}</pre>
          </SectionCard>
          <SectionCard title={t('billing.detail.metadata')} description={t('billing.sectionDescription.metadata')}>
            <pre className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-4 text-xs leading-relaxed text-[var(--text-muted)]">{metadata || t('billing.detail.noData')}</pre>
          </SectionCard>
        </motion.div>
      ) : <p className="text-sm text-[var(--text-muted)] py-4 text-center">{t('billing.detail.loadingChargeSessionDetail')}</p>}
    </div>
  )
}
