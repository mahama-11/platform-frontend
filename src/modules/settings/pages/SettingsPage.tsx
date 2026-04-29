import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'

import { PageHeader } from '@/shared/ui/PageHeader'
import { SectionCard } from '@/shared/ui/SectionCard'

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

export function SettingsPage() {
  const { t } = useTranslation()

  return (
    <div className="space-y-8">
      <PageHeader title={t('settings.title')} description={t('settings.description')} />
      <SectionCard title="System defaults" description="Use modular forms to manage platform-wide defaults without coupling domain pages.">
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-auto-fit gap-4">
          {[
            ['Role & access presets', 'Manage operator roles, scopes and future fine-grained permissions.'],
            ['Locale resources', 'Edit multi-language labels and verify translation coverage.'],
            ['Notification templates', 'Standardize internal alerts, audit notices and customer-facing templates.'],
            ['Default policies', 'Control provider binding defaults, settlement defaults and safe rollout flags.'],
          ].map(([title, body]) => (
            <motion.div variants={itemVariants} key={title} className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-6 transition-colors hover:border-[var(--border-strong)]">
              <h3 className="text-base font-semibold tracking-tight text-white">{title}</h3>
              <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">{body}</p>
            </motion.div>
          ))}
        </motion.div>
      </SectionCard>
    </div>
  )
}
