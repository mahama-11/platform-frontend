import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { AlertTriangle, BookOpen, KeyRound, RefreshCw, ShieldCheck } from 'lucide-react'

import { platformClient } from '@/shared/api/platformClient'
import { PageHeader } from '@/shared/ui/PageHeader'
import { SectionCard } from '@/shared/ui/SectionCard'
import type { ErrorCodesDoc, InternalAccessDoc } from '@/shared/types/platform'

const containerVariants = {
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

function DocMetric({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <motion.div variants={itemVariants} className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow)]">
      <p className="text-sm font-medium text-[var(--text-soft)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-white">{value}</p>
      <p className="mt-1 text-sm text-[var(--text-muted)]">{detail}</p>
    </motion.div>
  )
}

function countErrorCodes(doc: ErrorCodesDoc | null) {
  if (!doc) return 0
  return doc.client_errors.length + doc.business_errors.length + doc.payment_errors.length + doc.server_errors.length
}

export function SettingsPage() {
  const { t } = useTranslation()
  const [accessDoc, setAccessDoc] = useState<InternalAccessDoc | null>(null)
  const [errorCodesDoc, setErrorCodesDoc] = useState<ErrorCodesDoc | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState(0)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const [internalAccess, errorCodes] = await Promise.all([
          platformClient.internalAccessDoc(),
          platformClient.errorCodesDoc(),
        ])
        if (cancelled) return
        setAccessDoc(internalAccess)
        setErrorCodesDoc(errorCodes)
      } catch (err) {
        if (cancelled) return
        setAccessDoc(null)
        setErrorCodesDoc(null)
        setError(err instanceof Error ? err.message : 'Failed to load platform settings baseline')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [refreshToken])

  return (
    <div className="space-y-8">
      <PageHeader
        title={t('settings.title')}
        description={t('settings.description')}
        actions={(
          <button type="button" onClick={() => setRefreshToken(value => value + 1)} className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm font-medium text-[var(--text)] transition-colors hover:border-[var(--border-strong)]">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        )}
      />

      <SectionCard title="Settings baseline" description="This page now exposes only real Platform configuration/readiness surfaces. Unsupported write capabilities are intentionally not shown as editable settings.">
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid gap-4 md:grid-cols-3">
          <DocMetric label="Internal API base" value={accessDoc?.base_path ?? '—'} detail={accessDoc?.auth_method ?? 'Docs endpoint not loaded'} />
          <DocMetric label="Documented headers" value={accessDoc?.headers.length ?? 0} detail="From /docs/internal-access" />
          <DocMetric label="Error codes" value={countErrorCodes(errorCodesDoc)} detail="From /docs/error-codes" />
        </motion.div>
        {error ? <div className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div> : null}
        <div className="mt-5 flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-100">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-none" />
          <div>
            <p className="text-sm font-semibold">No fake settings modules</p>
            <p className="mt-1 text-sm leading-6 text-amber-100/80">Role presets, locale resources, notification templates, and default policy editors are not active Platform Console capabilities yet. Configure the real owner surfaces below or add a backend contract before exposing a new settings card.</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Real owner surfaces" description="Use these live modules instead of editing placeholder settings.">
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid gap-4 md:grid-cols-3">
          <Link to="/access-center" className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-5 transition-colors hover:border-[var(--border-strong)]">
            <ShieldCheck className="h-5 w-5 text-emerald-300" />
            <h3 className="mt-3 text-base font-semibold tracking-tight text-white">Access Center</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">Manage real roles, permissions, and role-permission bindings.</p>
          </Link>
          <Link to="/catalog" className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-5 transition-colors hover:border-[var(--border-strong)]">
            <KeyRound className="h-5 w-5 text-sky-300" />
            <h3 className="mt-3 text-base font-semibold tracking-tight text-white">Commercial policies</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">Configure Product, SKU, package, rate card, asset, allowance, quota, and capability policies.</p>
          </Link>
          <Link to="/audit" className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-5 transition-colors hover:border-[var(--border-strong)]">
            <BookOpen className="h-5 w-5 text-violet-300" />
            <h3 className="mt-3 text-base font-semibold tracking-tight text-white">Audit diagnostics</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">Inspect immutable audit facts and request correlation instead of storing raw access logs in settings.</p>
          </Link>
        </motion.div>
      </SectionCard>
    </div>
  )
}
