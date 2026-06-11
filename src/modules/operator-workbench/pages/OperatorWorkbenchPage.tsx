import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Activity, ClipboardList, CreditCard, Route, Search, ShieldCheck, Sparkles } from 'lucide-react'

import { WorkbenchCard } from '@/modules/operator-workbench/components/WorkbenchPrimitives'
import { classifyInvestigationInput } from '@/modules/operator-workbench/support/investigationSearch'
import { PageHeader } from '@/shared/ui/PageHeader'
import { SectionCard } from '@/shared/ui/SectionCard'

const jobCards = [
  {
    title: 'Runtime Investigator',
    description: '排查 runtime job 状态、provider 尝试、charge session 与下游资产证据。',
    icon: Activity,
    to: '/workbench/runtime',
    hints: ['runtime_job_id', 'provider_job_id', 'source_id'],
  },
  {
    title: 'Finance & Charge Investigator',
    description: '解释扣费会话、结算事件、折扣、wallet 与 route snapshot。',
    icon: CreditCard,
    to: '/workbench/finance',
    hints: ['charge_session_id', 'event_id', 'billing_subject'],
  },
  {
    title: 'Access & Org Investigator',
    description: '诊断用户、组织、成员、角色与权限为何允许或拒绝。',
    icon: ShieldCheck,
    to: '/workbench/access',
    hints: ['user_id', 'org_id', 'permission'],
  },
  {
    title: 'Commercial Route Studio',
    description: '预览商业路由会选中哪个 billing profile、merchant 与 settlement account。',
    icon: Route,
    to: '/workbench/commercial-route',
    hints: ['organization_id', 'channel', 'currency'],
  },
  {
    title: 'Audit & Request Explorer',
    description: '用 request_id / trace_id 串起审计、日志查询和诊断摘要。',
    icon: ClipboardList,
    to: '/workbench/audit',
    hints: ['request_id', 'trace_id', 'audit target'],
  },
]

export function OperatorWorkbenchPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const result = useMemo(() => classifyInvestigationInput(query), [query])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!query.trim()) return
    if (result.deterministic && result.path) {
      navigate(result.path)
      return
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Operator Workbench"
        description="从真实运营/支持/SRE 工作出发，串起 Runtime、Finance、Access、Commercial Route 与 Audit 证据链。Phase 1 只读排查，不新增高风险写操作。"
      />

      <SectionCard title="Universal investigation search" description="粘贴 runtime_job_id、charge_session_id、event_id、request_id、trace_id、org/user/source id；能确定时直接路由，模糊时给出建议入口。">
        <form onSubmit={submit} className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-soft)]" />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="request_id / trace_id / runtime_job_id / charge_session_id / org_id / user_id"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] py-2.5 pl-10 pr-4 text-sm text-[var(--text)] outline-none transition-all focus:border-[var(--primary-soft)] focus:ring-1 focus:ring-[var(--primary-soft)]"
            />
          </div>
          <button type="submit" className="rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-black transition hover:opacity-90">
            Investigate
          </button>
        </form>
        {query.trim() ? (
          <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-[var(--primary)]" />
              <span className="font-medium text-[var(--text)]">{result.label}</span>
              <span className="text-[var(--text-muted)]">{result.deterministic ? 'deterministic route' : 'ambiguous; choose an evidence path'}</span>
            </div>
            {result.deterministic && result.path ? (
              <Link to={result.path} className="mt-3 inline-flex text-sm font-medium text-[var(--primary)] hover:underline">Open {result.path}</Link>
            ) : (
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {result.recommendations.map(item => (
                  <Link key={item.path} to={item.path} className="rounded-lg border border-[var(--border)] bg-[var(--bg-muted)] p-3 text-sm hover:border-[var(--border-strong)]">
                    <p className="font-medium text-[var(--text)]">{item.label}</p>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">{item.reason}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {jobCards.map(card => (
          <WorkbenchCard key={card.to} title={card.title} description={card.description} icon={card.icon} to={card.to}>
            <div className="flex flex-wrap gap-2">
              {card.hints.map(hint => <span key={hint} className="rounded bg-[var(--bg)] px-2 py-1 text-xs text-[var(--text-soft)]">{hint}</span>)}
            </div>
          </WorkbenchCard>
        ))}
      </div>
    </div>
  )
}
