import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react'

import { useToastStore } from '@/app/store/toastStore'

const toneMap = {
  info: {
    icon: Info,
    border: 'border-blue-400/30',
    iconColor: 'text-blue-300',
  },
  success: {
    icon: CheckCircle2,
    border: 'border-emerald-400/30',
    iconColor: 'text-emerald-300',
  },
  error: {
    icon: TriangleAlert,
    border: 'border-rose-400/30',
    iconColor: 'text-rose-300',
  },
} as const

export function ToastViewport() {
  const items = useToastStore(state => state.items)
  const remove = useToastStore(state => state.remove)

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-3">
      {items.map(item => {
        const tone = toneMap[item.tone]
        const Icon = tone.icon
        return (
          <div key={item.id} className={`pointer-events-auto rounded-xl border ${tone.border} bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow)]`}>
            <div className="flex items-start gap-3">
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${tone.iconColor}`} />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-[var(--text)]">{item.title}</p>
                {item.description ? <p className="mt-1 text-sm text-[var(--text-muted)]">{item.description}</p> : null}
              </div>
              <button type="button" className="text-[var(--text-muted)] transition-colors hover:text-[var(--text)]" onClick={() => remove(item.id)}>
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
