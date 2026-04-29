import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'

import { useToastStore } from '@/app/store/toastStore'
import { menuClient } from '@/shared/api/menuClient'
import { formatMinorUnits } from '@/shared/i18n/helpers'
import { PageHeader } from '@/shared/ui/PageHeader'
import { SectionCard } from '@/shared/ui/SectionCard'
import type { MenuAssetLibraryItem, MenuJobHistoryItem } from '@/shared/types/menu'

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

export function MenuOpsPage() {
  const { t } = useTranslation()
  const pushToast = useToastStore(state => state.push)
  const [jobs, setJobs] = useState<MenuJobHistoryItem[]>([])
  const [assets, setAssets] = useState<MenuAssetLibraryItem[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setError(null)
        const [jobHistory, assetLibrary] = await Promise.all([
          menuClient.jobHistory({ limit: 20, offset: 0 }),
          menuClient.assetLibrary({ limit: 20, offset: 0 }),
        ])
        if (cancelled) return
        setJobs(jobHistory.items)
        setAssets(assetLibrary.items)
      } catch (err) {
        if (cancelled) return
        const message = err instanceof Error ? err.message : 'Failed to load menu operations data'
        setError(message)
        pushToast({ tone: 'error', title: 'Menu ops load failed', description: message })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [pushToast])

  return (
    <div className="space-y-8">
      <PageHeader title={t('menuOps.title')} description={t('menuOps.description')} />
      {error ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
          {error}
        </motion.div>
      ) : null}
      
      <SectionCard title="Studio Job History" description="Real Menu studio jobs under the current org and JWT context.">
        <motion.div variants={listVariants} initial="hidden" animate="show" className="space-y-3">
          {jobs.length ? jobs.map(item => (
            <motion.div variants={itemVariants} key={item.job.job_id} className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-5 transition-colors hover:border-[var(--border-strong)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-sm font-medium text-white truncate">{item.job.job_id}</p>
                  <p className="mt-1.5 text-sm text-[var(--text-muted)] flex items-center gap-2 truncate">
                    <span>{item.job.mode}</span>
                    <span className="h-1 w-1 rounded-full bg-[var(--border-strong)]" />
                    <span>{item.job.provider || 'default'}</span>
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-soft)] truncate">{item.job.stage_message || 'No detail'}</p>
                  <p className="mt-1.5 text-sm text-[var(--text-muted)] font-medium">result assets {item.result_assets?.length || 0} · source assets {item.source_assets?.length || 0}</p>
                </div>
                <div className="flex flex-col gap-2 shrink-0 lg:items-end">
                  <div className="flex flex-wrap gap-2 text-xs uppercase tracking-wide text-[var(--text-muted)]">
                    <span className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-2.5 py-1 font-medium">{item.job.status}</span>
                    <span className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-2.5 py-1 font-medium">{item.job.stage}</span>
                    <span className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-2.5 py-1 font-medium">progress {item.job.progress}</span>
                  </div>
                  {item.job.charge ? (
                    <div className="flex flex-wrap gap-2 text-xs uppercase tracking-wide text-[var(--text-muted)] mt-1 lg:mt-0">
                      <span className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-2.5 py-1">charge {item.job.charge.status || '-'}</span>
                      {item.job.charge.settlement_id ? <span className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-2.5 py-1">settlement {item.job.charge.settlement_id}</span> : null}
                      {item.job.charge.wallet_debited ? <span className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-2.5 py-1">wallet {formatMinorUnits(t, item.job.charge.wallet_debited, 'CNY')}</span> : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </motion.div>
          )) : <p className="text-sm text-[var(--text-muted)] py-4 text-center">No Menu studio jobs returned for current org.</p>}
        </motion.div>
      </SectionCard>
      
      <SectionCard title="Asset Library" description="Real Menu asset library with business-role context and linked job references.">
        <motion.div variants={listVariants} initial="hidden" animate="show" className="grid grid-auto-fit gap-4">
          {assets.length ? assets.map(item => (
            <motion.div variants={itemVariants} key={item.asset.asset_id} className="flex flex-col rounded-lg border border-[var(--border)] bg-[var(--bg)] p-5 transition-colors hover:border-[var(--border-strong)]">
              {item.asset.preview_url ? (
                <div className="mb-4 aspect-video w-full overflow-hidden rounded-lg border border-[var(--border)]">
                  <img src={item.asset.preview_url} alt={item.asset.file_name || item.asset.asset_id} className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" />
                </div>
              ) : null}
              <div className="flex-1 min-w-0">
                <p className="font-mono text-sm font-medium text-white truncate">{item.asset.asset_id}</p>
                <p className="mt-1.5 text-sm text-[var(--text-muted)] flex items-center gap-2 truncate">
                  <span>{item.asset.asset_type}</span>
                  <span className="h-1 w-1 rounded-full bg-[var(--border-strong)]" />
                  <span>{item.origin_role}</span>
                  <span className="h-1 w-1 rounded-full bg-[var(--border-strong)]" />
                  <span>{item.asset.source_type}</span>
                </p>
                <p className="mt-1 text-sm text-[var(--text-soft)] truncate">{item.produced_by_job_id ? `job ${item.produced_by_job_id}` : 'No producing job'}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs uppercase tracking-wide text-[var(--text-muted)]">
                  {item.can_refine ? <span className="inline-flex items-center rounded-md border border-[var(--primary-soft)] bg-[var(--primary-soft)] text-[var(--primary)] px-2.5 py-1 font-medium">refine</span> : null}
                  {item.can_share ? <span className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-2.5 py-1">share</span> : null}
                  {item.latest_job?.status ? <span className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-2.5 py-1">latest {item.latest_job.status}</span> : null}
                </div>
              </div>
              <div className="mt-5 pt-4 border-t border-[var(--border)]">
                <button
                  type="button"
                  className="text-sm font-medium text-[var(--primary)] hover:text-[var(--primary)]/80 transition-colors"
                  onClick={async () => {
                    try {
                      await menuClient.openAssetContent(item.asset.asset_id)
                    } catch (err) {
                      const message = err instanceof Error ? err.message : 'Failed to open menu asset content'
                      pushToast({ tone: 'error', title: 'Menu asset open failed', description: message })
                    }
                  }}
                >
                  Open content &rarr;
                </button>
              </div>
            </motion.div>
          )) : <p className="text-sm text-[var(--text-muted)] col-span-full py-4 text-center">No Menu assets returned for current org.</p>}
        </motion.div>
      </SectionCard>
    </div>
  )
}
