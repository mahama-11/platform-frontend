import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'

import { PageHeader } from '@/shared/ui/PageHeader'
import { SectionCard } from '@/shared/ui/SectionCard'

const rows = [
  ['merchant_sab01', 'Thai Grill Hub', 'active', '2 org admins', '2026-04-26 15:30'],
  ['merchant_jkt92', 'Nasi Corner', 'reviewing', 'Pending KYC', '2026-04-26 14:12'],
  ['merchant_hcm31', 'Pho Wave', 'restricted', 'Risk hold', '2026-04-26 11:03'],
]

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

export function MerchantsPage() {
  const { t } = useTranslation()

  return (
    <div className="space-y-8">
      <PageHeader title={t('merchants.title')} description={t('merchants.description')} />
      <SectionCard title="Merchant queue" description="Unified merchant operations table with responsive card/table fallback.">
        <div className="hidden overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg)] lg:block">
          <table className="min-w-full divide-y divide-[var(--border)] text-left text-sm">
            <thead className="bg-[var(--bg-muted)] text-[var(--text-soft)]">
              <tr>
                {['ID', 'Name', 'Status', 'Context', 'Updated'].map(head => (
                  <th key={head} className="px-4 py-3 font-medium tracking-wider text-xs uppercase">{head}</th>
                ))}
              </tr>
            </thead>
            <motion.tbody variants={listVariants} initial="hidden" animate="show" className="divide-y divide-[var(--border)]">
              {rows.map(row => (
                <motion.tr variants={itemVariants} key={row[0]} className="hover:bg-[var(--bg-muted)]/50 transition-colors">
                  {row.map((cell, i) => (
                    <td key={cell} className={`px-4 py-3 ${i === 0 ? 'font-mono text-[var(--text-muted)] text-xs' : 'text-[var(--text)]'}`}>{cell}</td>
                  ))}
                </motion.tr>
              ))}
            </motion.tbody>
          </table>
        </div>
        <motion.div variants={listVariants} initial="hidden" animate="show" className="space-y-3 lg:hidden">
          {rows.map(row => (
            <motion.div variants={itemVariants} key={row[0]} className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4 transition-colors hover:border-[var(--border-strong)]">
              <p className="font-medium text-white">{row[1]}</p>
              <p className="mt-1 font-mono text-xs text-[var(--text-muted)]">{row[0]}</p>
              <div className="mt-4 grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                <div>
                  <span className="text-[var(--text-soft)] text-xs uppercase tracking-wider block mb-1">Status</span>
                  <span className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-2 py-0.5 text-xs font-medium text-[var(--text)] capitalize tracking-wide">{row[2]}</span>
                </div>
                <div>
                  <span className="text-[var(--text-soft)] text-xs uppercase tracking-wider block mb-1">Context</span>
                  <span className="text-[var(--text-muted)]">{row[3]}</span>
                </div>
                <div className="col-span-2 mt-2">
                  <span className="text-[var(--text-soft)] text-xs uppercase tracking-wider block mb-1">Updated</span>
                  <span className="text-[var(--text-muted)]">{row[4]}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </SectionCard>
    </div>
  )
}
