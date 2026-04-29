import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

import { useToastStore } from '@/app/store/toastStore'
import { platformClient } from '@/shared/api/platformClient'
import {
  getRuntimeFieldLabel,
  getRuntimeProviderLabel,
  getRuntimeSourceTypeLabel,
  getRuntimeStageLabel,
  getRuntimeStatusLabel,
} from '@/shared/i18n/helpers'
import { PageHeader } from '@/shared/ui/PageHeader'
import { SectionCard } from '@/shared/ui/SectionCard'
import type { RuntimeJobDetail } from '@/shared/types/platform'

function parseJSON(value: string) {
  if (!value) return null
  try {
    return JSON.parse(value) as unknown
  } catch {
    return value
  }
}

function collectStorageKeys(detail: RuntimeJobDetail | null) {
  if (!detail) return [] as string[]
  const output = parseJSON(detail.job.output_manifest)
  if (!output || typeof output !== 'object') return []
  const variants = Array.isArray((output as { variants?: unknown[] }).variants) ? (output as { variants: unknown[] }).variants : []
  const keys = new Set<string>()
  for (const variant of variants) {
    if (!variant || typeof variant !== 'object') continue
    const asset = (variant as { asset?: { storage_key?: string } }).asset
    if (asset?.storage_key) keys.add(asset.storage_key)
  }
  return [...keys]
}

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

export function RuntimeJobDetailPage() {
  const { t } = useTranslation()
  const { runtimeJobID = '' } = useParams()
  const pushToast = useToastStore(state => state.push)
  const [detail, setDetail] = useState<RuntimeJobDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!runtimeJobID) return
    let cancelled = false
    ;(async () => {
      try {
        setError(null)
        const data = await platformClient.runtimeJobDetail(runtimeJobID)
        if (cancelled) return
        setDetail(data)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : t('runtime.error.loadDetail'))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [runtimeJobID, t])

  const storageKeys = useMemo(() => collectStorageKeys(detail), [detail])
  const prettyOutput = useMemo(() => {
    if (!detail) return ''
    const parsed = parseJSON(detail.job.output_manifest)
    return parsed ? JSON.stringify(parsed, null, 2) : detail.job.output_manifest || t('runtime.detail.noOutputManifest')
  }, [detail, t])

  return (
    <div className="space-y-8">
      <PageHeader title={detail?.job.id || t('runtime.detail.title')} description={t('runtime.detail.description')} />
      {error ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
          {error}
        </motion.div>
      ) : null}
      
      {detail ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          <SectionCard title={t('runtime.sections.snapshot')} description={t('runtime.sectionDescription.snapshot')}>
            <div className="grid grid-auto-fit gap-4">
              {[
                ['status', getRuntimeStatusLabel(t, detail.job.status)],
                ['stage', getRuntimeStageLabel(t, detail.job.stage)],
                ['provider', getRuntimeProviderLabel(t, detail.job.provider_code)],
                ['provider_job_id', detail.job.provider_job_id || '-'],
                ['source', `${getRuntimeSourceTypeLabel(t, detail.job.source_type)}/${detail.job.source_id}`],
                ['attempts', `${detail.job.attempt_count}/${detail.job.max_attempts}`],
                ['organization', detail.job.organization_id],
                ['charge_session', detail.job.charge_session_id || '-'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-5 transition-colors hover:border-[var(--border-strong)]">
                  <p className="text-xs uppercase tracking-wider font-medium text-[var(--text-soft)]">{getRuntimeFieldLabel(t, label)}</p>
                  <p className="mt-1.5 text-sm font-medium text-[var(--text)] break-all">{value}</p>
                </div>
              ))}
            </div>
            {detail.job.charge_session_id ? (
              <div className="mt-6 border-t border-[var(--border)] pt-4">
                <Link className="text-sm font-medium text-[var(--primary)] hover:text-[var(--primary)]/80 transition-colors" to={`/billing/charge-sessions/${detail.job.charge_session_id}`}>{t('runtime.detail.openChargeSession')} &rarr;</Link>
              </div>
            ) : null}
          </SectionCard>

          <SectionCard title={t('runtime.sections.attempts')} description={t('runtime.sectionDescription.attempts')}>
            <motion.div variants={listVariants} initial="hidden" animate="show" className="space-y-3">
              {detail.attempts.length ? detail.attempts.map(item => (
                <motion.div variants={itemVariants} key={item.id} className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-5 transition-colors hover:border-[var(--border-strong)]">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-sm font-medium text-white">Attempt #{item.attempt_no}</p>
                      <p className="mt-1.5 text-sm text-[var(--text-muted)] flex items-center gap-2 truncate">
                        <span>{getRuntimeProviderLabel(t, item.provider_code || undefined)}</span>
                        <span className="h-1 w-1 rounded-full bg-[var(--border-strong)]" />
                        <span>{item.provider_mode || '-'}</span>
                        <span className="h-1 w-1 rounded-full bg-[var(--border-strong)]" />
                        <span className="text-[var(--text)]">{item.error_code || getRuntimeStatusLabel(t, item.status)}</span>
                      </p>
                    </div>
                    <div className="flex flex-wrap shrink-0 items-center gap-2 lg:justify-end">
                      <span className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-2.5 py-1 text-xs font-medium text-[var(--text)] tracking-wide">{getRuntimeStatusLabel(t, item.status)}</span>
                      <span className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-2.5 py-1 text-xs font-medium text-[var(--text)] tracking-wide">{item.started_at || '-'}</span>
                    </div>
                  </div>
                  {item.error_message ? <div className="mt-4 rounded-md border border-rose-500/20 bg-rose-500/5 px-3 py-2"><p className="text-sm text-rose-400">{item.error_message}</p></div> : null}
                </motion.div>
              )) : <p className="text-sm text-[var(--text-muted)] py-4 text-center">{t('runtime.detail.noAttempts')}</p>}
            </motion.div>
          </SectionCard>

          <SectionCard title={t('runtime.sections.outputManifest')} description={t('runtime.sectionDescription.outputManifest')}>
            <pre className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-4 text-xs leading-relaxed text-[var(--text-muted)]">{prettyOutput}</pre>
          </SectionCard>

          <SectionCard title={t('runtime.sections.linkedAssets')} description={t('runtime.sectionDescription.linkedAssets')}>
            <motion.div variants={listVariants} initial="hidden" animate="show" className="grid grid-auto-fit gap-4">
              {storageKeys.length ? storageKeys.map(key => (
                <motion.div variants={itemVariants} key={key} className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-5 transition-colors hover:border-[var(--border-strong)] flex flex-col justify-between">
                  <p className="text-sm font-medium text-white break-all mb-4">{key}</p>
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <Link className="font-medium text-[var(--primary)] hover:text-[var(--primary)]/80 transition-colors" to={`/catalog?storage_key=${encodeURIComponent(key)}`}>Metadata</Link>
                    <div className="h-4 w-[1px] bg-[var(--border)]" />
                    <button
                      type="button"
                      className="font-medium text-[var(--text)] hover:text-white transition-colors"
                      onClick={async () => {
                        try {
                          await platformClient.openAssetContent(key)
                        } catch (err) {
                          const message = err instanceof Error ? err.message : t('runtime.error.openAssetContent')
                          pushToast({ tone: 'error', title: t('runtime.error.openAssetContent'), description: message })
                        }
                      }}
                    >
                      {t('runtime.detail.openContent')}
                    </button>
                  </div>
                </motion.div>
              )) : <p className="text-sm text-[var(--text-muted)] col-span-full py-4 text-center">{t('runtime.detail.noStorageKeys')}</p>}
            </motion.div>
          </SectionCard>
        </motion.div>
      ) : <p className="text-sm text-[var(--text-muted)] py-4 text-center">{t('runtime.detail.loadingDetail')}</p>}
    </div>
  )
}
