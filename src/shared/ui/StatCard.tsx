export function StatCard({ label, value, tone, hint }: { label: string; value: string; tone: 'primary' | 'warning' | 'danger' | 'success'; hint: string }) {
  const toneMap = {
    primary: 'border-sky-500/20 bg-sky-500/5',
    warning: 'border-amber-500/20 bg-amber-500/5',
    danger: 'border-rose-500/20 bg-rose-500/5',
    success: 'border-emerald-500/20 bg-emerald-500/5',
  } as const

  const textToneMap = {
    primary: 'text-sky-400',
    warning: 'text-amber-400',
    danger: 'text-rose-400',
    success: 'text-emerald-400',
  } as const

  return (
    <div className={`rounded-xl border ${toneMap[tone]} p-6 shadow-[var(--shadow)] transition-colors hover:border-[var(--border-strong)]`}>
      <p className="text-sm font-medium text-[var(--text-soft)]">{label}</p>
      <p className={`mt-3 text-3xl font-semibold tracking-tight ${textToneMap[tone]}`}>{value}</p>
      <p className="mt-2 text-sm text-[var(--text-muted)]">{hint}</p>
    </div>
  )
}
