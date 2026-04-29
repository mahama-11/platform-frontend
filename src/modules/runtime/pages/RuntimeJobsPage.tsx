import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Search } from 'lucide-react'

import { useSessionStore } from '@/app/store/sessionStore'
import { useShellStore } from '@/app/store/shellStore'
import { platformClient } from '@/shared/api/platformClient'
import {
  getRuntimeProviderLabel,
  getRuntimeSourceTypeLabel,
  getRuntimeStageLabel,
  getRuntimeStatusLabel,
  getRuntimeTaskTypeLabel,
} from '@/shared/i18n/helpers'
import { PageHeader } from '@/shared/ui/PageHeader'
import { SectionCard } from '@/shared/ui/SectionCard'
import type { RuntimeJob } from '@/shared/types/platform'

const listVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  show: { opacity: 1, x: 0 }
}

export function RuntimeJobsPage() {
  const { t } = useTranslation()
  const currentOrgId = useSessionStore(state => state.currentOrgId)
  const opsScope = useShellStore(state => state.opsScope)
  const [searchParams, setSearchParams] = useSearchParams()
  const [items, setItems] = useState<RuntimeJob[]>([])
  const [total, setTotal] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const query = searchParams.get('query') || ''
  const scopedOrgId = opsScope === 'workspace' ? (currentOrgId ?? undefined) : undefined

  useEffect(() => {
    if (opsScope === 'workspace' && !currentOrgId) return
    let cancelled = false
    ;(async () => {
      try {
        setError(null)
        const result = await platformClient.runtimeJobs({ organizationId: scopedOrgId, query, limit: 20, offset: 0 })
        if (cancelled) return
        setItems(result.items)
        setTotal(result.total)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : t('runtime.error.loadJobs'))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [currentOrgId, opsScope, query, scopedOrgId, t])

  return (
    <div className="space-y-8">
      <PageHeader title={t('runtime.title')} description={t('runtime.description')} />
      <SectionCard title={t('runtime.sections.search')} description={t('runtime.sectionDescription.search')}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-soft)]" />
            <input
              value={query}
              onChange={event => setSearchParams(event.target.value ? { query: event.target.value } : {})}
              placeholder="job_id / provider_job_id / source_id / status"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] pl-10 pr-4 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--primary-soft)] focus:ring-1 focus:ring-[var(--primary-soft)] transition-all"
            />
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-muted)] px-4 py-2.5 text-sm text-[var(--text-muted)] font-medium">{t('runtime.detail.total')} {total}</div>
        </div>
        {error ? (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
            {error}
          </motion.div>
        ) : null}
      </SectionCard>
      <SectionCard title={t('runtime.sections.jobs')} description={opsScope === 'global' ? t('runtime.sectionDescription.jobsGlobal') : t('runtime.sectionDescription.jobsWorkspace')}>
        <motion.div variants={listVariants} initial="hidden" animate="show" className="space-y-2">
          {items.length ? items.map(item => (
            <motion.div variants={itemVariants} key={item.id}>
              <Link to={`/runtime/jobs/${item.id}`} className="group flex flex-col gap-4 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4 transition-all hover:border-[var(--border-strong)] hover:shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <p className="font-mono text-sm font-medium text-white truncate">{item.id}</p>
                    <span className="shrink-0 rounded bg-[var(--bg-muted)] px-2 py-0.5 text-xs text-[var(--text-muted)]">{item.product_code}</span>
                  </div>
                  <p className="mt-1.5 text-sm text-[var(--text-muted)] flex items-center gap-2 truncate">
                    <span>{getRuntimeTaskTypeLabel(t, item.task_type)}</span>
                    <span className="h-1 w-1 rounded-full bg-[var(--border-strong)]" />
                    <span>{getRuntimeSourceTypeLabel(t, item.source_type)}/{item.source_id}</span>
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-soft)] truncate">{item.stage_message || item.error_message || t('runtime.detail.noDetail')}</p>
                </div>
                <div className="flex flex-wrap shrink-0 gap-2 sm:justify-end">
                  <span className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-2.5 py-1 text-xs font-medium text-[var(--text)] tracking-wide">{getRuntimeStatusLabel(t, item.status)}</span>
                  <span className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-2.5 py-1 text-xs font-medium text-[var(--text)] tracking-wide">{getRuntimeStageLabel(t, item.stage)}</span>
                  <span className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-2.5 py-1 text-xs font-medium text-[var(--text)] tracking-wide">{getRuntimeProviderLabel(t, item.provider_code)}</span>
                  <span className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-2.5 py-1 text-xs font-medium text-[var(--text)] tracking-wide">{t('runtime.detail.attemptsShort')} {item.attempt_count}/{item.max_attempts}</span>
                </div>
              </Link>
            </motion.div>
          )) : <p className="text-sm text-[var(--text-muted)] py-4 text-center">{opsScope === 'global' ? t('runtime.empty.jobsGlobal') : t('runtime.empty.jobsWorkspace')}</p>}
        </motion.div>
      </SectionCard>
    </div>
  )
}
