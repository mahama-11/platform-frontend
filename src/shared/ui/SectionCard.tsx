import type { ReactNode } from 'react'

export function SectionCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow)] transition-colors hover:border-[var(--border-strong)]">
      <div className="mb-6">
        <h2 className="text-base font-semibold tracking-tight text-[var(--text)]">{title}</h2>
        <p className="mt-1.5 text-sm text-[var(--text-muted)]">{description}</p>
      </div>
      {children}
    </section>
  )
}
