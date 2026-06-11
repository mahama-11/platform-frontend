import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'

export function valueOrDash(value?: string | number | null) {
  if (value === undefined || value === null) return '—'
  const text = String(value)
  return text.trim() ? text : '—'
}

export function formatDate(value?: string) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function redactPlainText(value: string) {
  return value
    .replace(/(authorization\s*[:=]\s*(?:bearer\s+)?)[^\s"';,}]+/gi, '$1[REDACTED]')
    .replace(/((?:api[_-]?key|access[_-]?token|refresh[_-]?token|session[_-]?id|token|secret|password|credential)\s*[:=]\s*)[^\s,"'};]+/gi, '$1[REDACTED]')
    .replace(/(["'](?:api[_-]?key|access[_-]?token|refresh[_-]?token|session[_-]?id|token|secret|password|credential)["']\s*:\s*["'])[^"']+(["'])/gi, '$1[REDACTED]$2')
    .replace(/((?:cookie|set-cookie)\s*[:=]\s*)[^\n]+/gi, '$1[REDACTED]')
}

function redactSecrets(value: unknown): unknown {
  if (typeof value === 'string') return redactPlainText(value)
  if (Array.isArray(value)) return value.map(redactSecrets)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value)) {
      const lower = key.toLowerCase()
      out[key] = /token|secret|password|credential|api[_-]?key|authorization/.test(lower) ? '[REDACTED]' : redactSecrets(item)
    }
    return out
  }
  return value
}

export function safePrettyJSON(value?: string | Record<string, unknown> | null) {
  if (!value) return '—'
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value
    return JSON.stringify(redactSecrets(parsed), null, 2)
  } catch {
    return typeof value === 'string' ? redactPlainText(value) : JSON.stringify(redactSecrets(value), null, 2)
  }
}

export function StatusPill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'good' | 'bad' | 'warn' | 'info' }) {
  const tones = {
    neutral: 'border-[var(--border)] bg-[var(--bg-muted)] text-[var(--text)]',
    good: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    bad: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
    warn: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    info: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
  }
  return <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>{children}</span>
}

export function toneForStatus(status?: string): 'neutral' | 'good' | 'bad' | 'warn' | 'info' {
  const value = (status || '').toLowerCase()
  if (['success', 'succeeded', 'completed', 'active', 'ok', 'settled', 'finalized'].includes(value)) return 'good'
  if (['failed', 'error', 'denied', 'cancelled', 'inactive', 'deleted'].includes(value)) return 'bad'
  if (['pending', 'queued', 'running', 'retrying', 'processing'].includes(value)) return 'warn'
  return 'neutral'
}

export function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2">
      <p className="text-xs uppercase tracking-wide text-[var(--text-soft)]">{label}</p>
      <p className="mt-1 break-all font-mono text-sm text-[var(--text)]">{valueOrDash(value)}</p>
    </div>
  )
}

export function CodeBlock({ label, value }: { label: string; value?: string | Record<string, unknown> | null }) {
  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-wide text-[var(--text-soft)]">{label}</p>
      <pre className="max-h-72 overflow-auto rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3 text-xs leading-relaxed text-[var(--text-muted)]">
        {safePrettyJSON(value)}
      </pre>
    </div>
  )
}

export function WorkbenchCard({ title, description, icon: Icon, to, children }: { title: string; description: string; icon: LucideIcon; to: string; children?: ReactNode }) {
  return (
    <Link to={to} className="group rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow)] transition-all hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:bg-[var(--bg-muted)]">
      <div className="flex items-start gap-4">
        <div className="rounded-lg border border-[var(--primary-soft)] bg-[var(--primary-soft)] p-2 text-[var(--primary)]">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-[var(--text)]">{title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">{description}</p>
        </div>
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
    </Link>
  )
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null
  return <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{message}</div>
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="py-4 text-center text-sm text-[var(--text-muted)]">{children}</p>
}
