import { AlertTriangle, CheckCircle2, CircleHelp, ClipboardList, Route, ShieldAlert, ShoppingBag, Wrench } from 'lucide-react'

import { buildDiagnosticsViewModel, type DiagnosticsStageView } from '@/modules/audit/diagnosticsViewModel'
import type { RequestDiagnosticsResult } from '@/shared/types/platform'

const statusClass: Record<DiagnosticsStageView['status'], string> = {
  ok: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  warning: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
  failed: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
  unknown: 'border-[var(--border)] bg-[var(--bg)] text-[var(--text-muted)]',
}

const healthClass = {
  healthy: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  degraded: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
  failed: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
  unknown: 'border-[var(--border)] bg-[var(--bg)] text-[var(--text-muted)]',
}

const failureClass = {
  info: 'border-sky-500/30 bg-sky-500/10 text-sky-100',
  warning: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
  error: 'border-rose-500/30 bg-rose-500/10 text-rose-100',
}

function ChipList({ values, empty }: { values: string[]; empty: string }) {
  if (!values.length) return <p className="text-sm text-[var(--text-muted)]">{empty}</p>
  return (
    <div className="flex flex-wrap gap-2">
      {values.map(value => (
        <span key={value} className="rounded-full border border-[var(--border)] bg-[var(--bg)] px-3 py-1 font-mono text-xs text-[var(--text)]">
          {value}
        </span>
      ))}
    </div>
  )
}

export function RequestDiagnosticsPanel({ result }: { result: RequestDiagnosticsResult }) {
  const model = buildDiagnosticsViewModel(result)
  return (
    <div className="mt-4 space-y-4" data-testid="request-diagnostics-summary">
      <div className={`rounded-xl border p-4 ${healthClass[model.health]}`}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide">
              {model.health === 'failed' ? <ShieldAlert className="h-4 w-4" /> : model.health === 'healthy' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              Operator diagnosis
            </div>
            <h3 className="mt-2 text-lg font-semibold text-white">{model.headline}</h3>
            <p className="mt-1 break-all font-mono text-xs text-[var(--text-muted)]">request {model.requestID} · trace {model.traceID || '—'}</p>
          </div>
          <span className="rounded-full border border-current/20 px-3 py-1 text-xs font-medium uppercase tracking-wide">
            {model.diagnosticsEnabled ? 'embedded diagnostics' : 'external search only'}
          </span>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-muted)] p-4 xl:col-span-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-white"><Route className="h-4 w-4 text-sky-300" />Request path</div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            {model.path.map((item, index) => (
              <div key={`${item}-${index}`} className="flex items-center gap-2">
                {index > 0 ? <span className="text-[var(--text-soft)]">→</span> : null}
                <span className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 font-mono text-xs text-[var(--text)]">{item}</span>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <p className="mb-2 text-xs uppercase tracking-wide text-[var(--text-soft)]">Services</p>
            <ChipList values={model.services} empty="No service names returned." />
          </div>
        </div>

        <div className={`rounded-xl border p-4 ${failureClass[model.failure.severity]}`}>
          <div className="flex items-center gap-2 text-sm font-semibold"><ShieldAlert className="h-4 w-4" />Failure</div>
          <p className="mt-3 font-mono text-sm font-semibold">{model.failure.title}</p>
          <p className="mt-2 text-sm leading-6">{model.failure.detail}</p>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-5">
        {model.businessStages.map(stage => (
          <div key={stage.key} className={`rounded-xl border p-4 ${statusClass[stage.status]}`}>
            <p className="text-sm font-semibold text-white">{stage.label}</p>
            <p className="mt-1 text-xs uppercase tracking-wide opacity-80">{stage.status}</p>
            <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">{stage.detail}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-muted)] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white"><CircleHelp className="h-4 w-4 text-amber-200" />Likely cause</div>
          <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">{model.likelyCause}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-muted)] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white"><Wrench className="h-4 w-4 text-emerald-200" />Next steps</div>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-[var(--text-muted)]">
            {model.nextSteps.map(step => <li key={step}>{step}</li>)}
          </ol>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-muted)] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white"><ShoppingBag className="h-4 w-4 text-violet-200" />Product context</div>
          {model.productContext.length ? (
            <dl className="mt-3 grid gap-2 sm:grid-cols-2">
              {model.productContext.map(item => (
                <div key={item.label} className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3">
                  <dt className="text-xs uppercase tracking-wide text-[var(--text-soft)]">{item.label}</dt>
                  <dd className="mt-1 break-all font-mono text-sm text-[var(--text)]">{item.value}</dd>
                </div>
              ))}
            </dl>
          ) : <p className="mt-3 text-sm text-[var(--text-muted)]">No product-specific IDs were present in the sanitized diagnostic payload.</p>}
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-muted)] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white"><ClipboardList className="h-4 w-4 text-sky-200" />Recent sanitized events</div>
          {model.recentEvents.length ? (
            <div className="mt-3 space-y-2">
              {model.recentEvents.map(item => (
                <div key={`${item.label}-${item.value}`} className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3">
                  <p className="text-xs uppercase tracking-wide text-[var(--text-soft)]">{item.label}</p>
                  <p className="mt-1 break-words text-sm text-[var(--text-muted)]">{item.value}</p>
                </div>
              ))}
            </div>
          ) : <p className="mt-3 text-sm text-[var(--text-muted)]">No sanitized events returned.</p>}
        </div>
      </div>

      {model.findings.length ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-muted)] p-4">
          <p className="text-sm font-semibold text-white">Diagnostics findings</p>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {model.findings.map(item => (
              <div key={`${item.code}-${item.message}`} className={`rounded-lg border p-3 ${failureClass[item.severity]}`}>
                <p className="font-mono text-xs font-semibold uppercase tracking-wide">{item.severity} · {item.code}</p>
                <p className="mt-2 text-sm leading-6">{item.message}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
