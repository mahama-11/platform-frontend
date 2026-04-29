import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'

import { platformClient } from '@/shared/api/platformClient'
import { PageHeader } from '@/shared/ui/PageHeader'
import { SectionCard } from '@/shared/ui/SectionCard'
import type { ErrorCodesDoc, InternalAccessDoc } from '@/shared/types/platform'

const containerVariants = {
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

export function AuditPage() {
  const { t } = useTranslation()
  const [internalAccessDoc, setInternalAccessDoc] = useState<InternalAccessDoc | null>(null)
  const [errorCodesDoc, setErrorCodesDoc] = useState<ErrorCodesDoc | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setError(null)
        const [accessDoc, codesDoc] = await Promise.all([
          platformClient.internalAccessDoc(),
          platformClient.errorCodesDoc(),
        ])
        if (cancelled) return
        setInternalAccessDoc(accessDoc)
        setErrorCodesDoc(codesDoc)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load audit context')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="space-y-8">
      <PageHeader title={t('audit.title')} description={t('audit.description')} />
      {error ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
          {error}
        </motion.div>
      ) : null}
      
      <SectionCard title="Internal access contract" description="Live documentation exposed by the platform for internal product integrations.">
        {internalAccessDoc ? (
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-auto-fit gap-4">
            <motion.div variants={itemVariants} className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-5">
              <p className="text-xs uppercase tracking-wider font-medium text-[var(--text-soft)] mb-2">Base Path & Auth</p>
              <p className="font-mono text-sm text-[var(--text)] bg-[var(--bg-muted)] px-3 py-2 rounded-md border border-[var(--border)]">{internalAccessDoc.base_path}</p>
              <p className="mt-3 text-sm text-[var(--text-muted)] flex items-center gap-2">
                <span className="inline-flex items-center rounded-md border border-[var(--primary-soft)] bg-[var(--primary-soft)] px-2 py-0.5 text-xs font-medium text-[var(--primary)] uppercase tracking-wide">{internalAccessDoc.auth_method}</span>
              </p>
            </motion.div>
            <motion.div variants={itemVariants} className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-5">
              <p className="text-xs uppercase tracking-wider font-medium text-[var(--text-soft)] mb-3">Required Headers</p>
              <ul className="space-y-2">
                {internalAccessDoc.headers.map(item => (
                  <li key={item} className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)] shrink-0" />
                    <span className="font-mono">{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
            <motion.div variants={itemVariants} className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-5">
              <p className="text-xs uppercase tracking-wider font-medium text-[var(--text-soft)] mb-3">Retry Rules</p>
              <ul className="space-y-2">
                {internalAccessDoc.retry_rules.map(item => (
                  <li key={item} className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)] shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </motion.div>
        ) : <p className="text-sm text-[var(--text-muted)] py-4 text-center">Loading internal access guide...</p>}
      </SectionCard>
      
      <SectionCard title="Error code reference" description="Current browser-readable error code catalog from platform docs endpoints.">
        {errorCodesDoc ? (
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-auto-fit gap-4">
            {[
              ['Client Errors', errorCodesDoc.client_errors.length, 'border-amber-500/30 bg-amber-500/5', 'text-amber-400'],
              ['Business Errors', errorCodesDoc.business_errors.length, 'border-sky-500/30 bg-sky-500/5', 'text-sky-400'],
              ['Payment Errors', errorCodesDoc.payment_errors.length, 'border-emerald-500/30 bg-emerald-500/5', 'text-emerald-400'],
              ['Server Errors', errorCodesDoc.server_errors.length, 'border-rose-500/30 bg-rose-500/5', 'text-rose-400'],
            ].map(item => (
              <motion.div variants={itemVariants} key={item[0] as string} className={`rounded-lg border ${item[2]} p-6 transition-colors hover:bg-opacity-10`}>
                <p className="text-sm font-medium text-[var(--text-soft)]">{item[0]}</p>
                <p className={`mt-3 text-3xl font-semibold tracking-tight ${item[3]}`}>{item[1]}</p>
              </motion.div>
            ))}
          </motion.div>
        ) : <p className="text-sm text-[var(--text-muted)] py-4 text-center">Loading error code document...</p>}
      </SectionCard>
    </div>
  )
}
