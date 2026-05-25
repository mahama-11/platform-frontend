import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { Plus, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

import { platformClient } from '@/shared/api/platformClient'
import { getCatalogStatusLabel } from '@/shared/i18n/helpers'
import { SectionCard } from '@/shared/ui/SectionCard'
import type { ProductRecord } from '@/shared/types/platform'

export const primaryButtonClass = 'inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-950 transition-all hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60 shrink-0'
export const secondaryButtonClass = 'inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition-all hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60 shrink-0'
const actionButtonClass = 'inline-flex items-center justify-center rounded-lg border border-white/10 bg-transparent px-3 py-1.5 text-xs font-medium text-slate-300 transition-all hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60 shrink-0'
const dangerButtonClass = 'inline-flex items-center justify-center rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-400 transition-all hover:bg-rose-500/20 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-60 shrink-0'

export const STATUS_OPTION_VALUES = ['active', 'inactive', 'draft']
export const SKU_TYPE_OPTION_VALUES = ['subscription', 'resource_pack', 'promo_pack']
export const BILLING_MODE_OPTION_VALUES = ['recurring', 'one_time']
export const PACKAGE_TYPE_OPTION_VALUES = ['subscription', 'permanent_pack', 'expiring_pack', 'promo_pack']
export const SETTLEMENT_MODE_OPTION_VALUES = ['included_then_overage', 'credits', 'quota', 'usage_billing']
export const PRICING_BEHAVIOR_OPTION_VALUES = ['quota_first', 'prepaid', 'postpaid']
export const BILLING_SCOPE_OPTION_VALUES = ['organization', 'user']
export const RATE_CARD_TARGET_TYPE_OPTION_VALUES = ['sku', 'package', 'billable_item']
export const PRICE_MODEL_OPTION_VALUES = ['flat', 'tiered']
export const ASSET_TYPE_OPTION_VALUES = ['wallet_credit', 'reward_credit', 'subscription_allow']
export const LIFECYCLE_OPTION_VALUES = ['permanent', 'expiring', 'cycle_reset']
export const SUBJECT_TYPE_OPTION_VALUES = ['organization', 'user']
export const QUOTA_GRANT_MODE_OPTION_VALUES = ['cycle_reset', 'one_time']
export const CAPABILITY_CODE_OPTION_VALUES = ['template_scope']
export const TEMPLATE_SCOPE_OPTION_VALUES = ['free_templates', 'official_templates', 'all_templates']

type ProductEntityKey = 'product'
type ProductMutationAction = 'delete'
type CatalogTabId = 'sku' | 'package' | 'billable' | 'rate-card' | 'asset' | 'policy' | 'api'

export function CatalogTabNav({
  activeTab,
  apiLabel,
  onTabChange,
}: {
  activeTab: CatalogTabId
  apiLabel: string
  onTabChange: (tab: CatalogTabId) => void
}) {
  return (
    <div className="flex w-full min-w-0 overflow-x-auto border-b border-white/10">
      <div className="flex min-w-0 shrink-0 gap-6">
        {[
          { id: 'sku', label: 'SKU' },
          { id: 'package', label: 'Package' },
          { id: 'billable', label: 'Billable Item' },
          { id: 'rate-card', label: 'Rate Card' },
          { id: 'asset', label: 'Asset Definition' },
          { id: 'policy', label: 'Allowance Policy' },
          { id: 'api', label: apiLabel },
        ].map(tab => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id as CatalogTabId)}
              className={`relative pb-3 text-sm font-medium outline-none transition-colors ${
                isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
              {isActive && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-white"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function CatalogProductSection({
  itemVariants,
  products,
  selectedProduct,
  selectedProductId,
  t,
  entityLabel,
  openProductModal,
  deleteConfirmMessage,
  handleMutation,
  mutationSuccessTitle,
  mutationFailureTitle,
  setSelectedProductId,
}: {
  itemVariants: { hidden: { opacity: number; y: number }; show: { opacity: number; y: number } }
  products: ProductRecord[]
  selectedProduct: ProductRecord | null
  selectedProductId: string
  t: TFunction
  entityLabel: (key: ProductEntityKey) => string
  openProductModal: (item?: ProductRecord) => void
  deleteConfirmMessage: (entity: ProductEntityKey, target: string) => string
  handleMutation: (action: () => Promise<void>, successTitle: string, failureTitle?: string) => Promise<void>
  mutationSuccessTitle: (action: ProductMutationAction, entity: ProductEntityKey) => string
  mutationFailureTitle: (action: ProductMutationAction, entity: ProductEntityKey) => string
  setSelectedProductId: (value: string) => void
}) {
  return (
    <motion.div variants={itemVariants} className="min-w-0">
      <SectionCard
        title={t('catalog.page.section.productTitle')}
        description={`${t('catalog.page.section.productDescription')} ${t('catalog.page.section.productSubtitle')}`}
      >
        <ListHeader
          subtitle={selectedProduct
            ? t('catalog.page.currentWorkspace', {
              name: selectedProduct.name,
              code: selectedProduct.code,
              owner: selectedProduct.owner_team || t('catalog.page.notSetOwnerTeam'),
            })
            : t('catalog.page.noWorkspace')}
          actionLabel={`${t('catalog.action.create')} ${entityLabel('product')}`}
          onAction={() => openProductModal()}
        />
        <RecordList
          columns={['工作区', 'Code', 'Name', 'Owner Team', 'Status']}
          rows={products.map(item => ({
            key: item.id,
            cells: [selectedProductId === item.id ? t('catalog.page.workspaceBadge') : '', item.code, item.name, item.owner_team || '-', getCatalogStatusLabel(t, item.status)],
            onEdit: () => openProductModal(item),
            onDelete: () => {
              if (!window.confirm(deleteConfirmMessage('product', item.code))) return
              void handleMutation(async () => {
                await platformClient.deleteCatalogProduct(item.id)
                if (selectedProductId === item.id) {
                  setSelectedProductId('')
                }
              }, mutationSuccessTitle('delete', 'product'), mutationFailureTitle('delete', 'product'))
            },
            onSelect: () => setSelectedProductId(item.id),
            selectLabel: selectedProductId === item.id ? t('catalog.page.workspaceBadge') : t('catalog.page.switchWorkspace'),
          }))}
          emptyMessage={t('catalog.page.section.productEmpty')}
        />
      </SectionCard>
    </motion.div>
  )
}

export function ListHeader({
  subtitle,
  actionLabel,
  onAction,
  disabled,
}: {
  subtitle: string
  actionLabel: string
  onAction: () => void
  disabled?: boolean
}) {
  return (
    <div className="mb-4 flex w-full min-w-0 flex-wrap items-center justify-between gap-4">
      <p className="min-w-0 flex-1 truncate text-sm text-slate-400">{subtitle}</p>
      <button type="button" className={primaryButtonClass} onClick={onAction} disabled={disabled}>
        <Plus size={16} className="shrink-0" />
        <span className="truncate">{actionLabel}</span>
      </button>
    </div>
  )
}

export function ModalShell({
  title,
  description,
  children,
  onClose,
  onSubmit,
}: {
  title: string
  description: string
  children: ReactNode
  onClose: () => void
  onSubmit: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-[#0a0a12]/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="relative flex max-h-[90vh] w-full max-w-4xl min-w-0 flex-col overflow-y-auto rounded-2xl border border-white/10 bg-[#0a0a12] p-6 shadow-2xl shadow-black/50"
      >
        <div className="mb-6 flex shrink-0 items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-lg font-semibold text-slate-100">{title}</h3>
            <p className="mt-1 truncate text-sm text-slate-400">{description}</p>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        <div className="min-w-0 flex-1 space-y-5">{children}</div>
        <div className="mt-8 flex shrink-0 justify-end gap-3">
          <button type="button" className={secondaryButtonClass} onClick={onClose}>{t('catalog.action.cancel')}</button>
          <button type="button" className={primaryButtonClass} onClick={onSubmit}>{t('catalog.action.save')}</button>
        </div>
      </motion.div>
    </div>
  )
}

export function AdvancedMetadata({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <details className="group min-w-0 rounded-xl border border-white/10 bg-white/[0.02] p-4 transition-colors hover:border-white/20">
      <summary className="cursor-pointer truncate text-sm font-medium text-slate-200 outline-none">高级字段：Metadata JSON</summary>
      <div className="mt-4 flex min-w-0 flex-col gap-3">
        <p className="truncate text-sm text-slate-400">仅在需要表达额外活动标签、展示标签或业务侧扩展字段时再填写。</p>
        <TextAreaInput value={value} onChange={onChange} placeholder='{"campaign":"spring-sale"}' />
      </div>
    </details>
  )
}

export function CodePanel({ children }: { children: string }) {
  return (
    <pre className="w-full min-w-0 overflow-x-auto rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm font-mono text-slate-300">
      {children}
    </pre>
  )
}

export function FormGrid({ children }: { children: ReactNode }) {
  return <div className="grid w-full min-w-0 gap-5 md:grid-cols-2">{children}</div>
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex w-full min-w-0 flex-col gap-1.5">
      <span className="truncate text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</span>
      {children}
    </label>
  )
}

export function TextInput({
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={event => onChange(event.target.value)}
      placeholder={placeholder}
      className="w-full min-w-0 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-200 outline-none transition-colors focus:border-white/20 focus:bg-white/10 placeholder:text-slate-500"
    />
  )
}

export function TextAreaInput({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <textarea
      value={value}
      onChange={event => onChange(event.target.value)}
      placeholder={placeholder}
      rows={4}
      className="w-full min-w-0 resize-y rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-200 outline-none transition-colors focus:border-white/20 focus:bg-white/10 placeholder:text-slate-500"
    />
  )
}

export function SelectInput({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
  placeholder?: string
}) {
  return (
    <select
      value={value}
      onChange={event => onChange(event.target.value)}
      className="w-full min-w-0 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-200 outline-none transition-colors focus:border-white/20 focus:bg-white/10"
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

export function RecordList({
  columns,
  rows,
  emptyMessage,
}: {
  columns: string[]
  rows: Array<{ key: string; cells: string[]; onEdit: () => void; onDelete: () => void; onSelect?: () => void; selectLabel?: string }>
  emptyMessage: string
}) {
  const { t } = useTranslation()
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10
  const totalPages = Math.ceil(rows.length / pageSize)

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages)
    } else if (totalPages > 0 && currentPage === 0) {
      setCurrentPage(1)
    }
  }, [rows.length, currentPage, totalPages])

  const visibleRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <div className="flex w-full min-w-0 flex-col gap-3">
      {rows.length === 0 ? (
        <div className="flex w-full items-center justify-center rounded-xl border border-white/5 bg-white/[0.02] py-12 text-sm text-slate-400">
          {emptyMessage}
        </div>
      ) : (
        <motion.div
          variants={{
            hidden: { opacity: 0 },
            show: { opacity: 1, transition: { staggerChildren: 0.05 } }
          }}
          initial="hidden"
          animate="show"
          className="flex w-full min-w-0 flex-col"
        >
          <div className="w-full min-w-0 overflow-x-auto rounded-xl border border-white/10 bg-[#0a0a12]">
            <table className="w-full min-w-max text-left text-sm text-slate-200">
              <thead className="border-b border-white/10 bg-white/[0.02]">
                <tr>
                  {columns.map((col, index) => (
                    <th key={index} className="whitespace-nowrap px-4 py-3 font-medium text-slate-400">
                      {col}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right font-medium text-slate-400">{t('catalog.action.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <AnimatePresence mode="popLayout">
                  {visibleRows.map((row) => (
                    <motion.tr
                      key={row.key}
                      layout
                      variants={{
                        hidden: { opacity: 0, y: 10 },
                        show: { opacity: 1, y: 0 }
                      }}
                      exit={{ opacity: 0, transition: { duration: 0.2 } }}
                      className="group transition-colors hover:bg-white/[0.02]"
                    >
                      {row.cells.map((cell, index) => (
                        <td key={`${row.key}-${index}`} className="max-w-[200px] truncate whitespace-nowrap px-4 py-2.5">
                          {cell || '-'}
                        </td>
                      ))}
                      <td className="px-4 py-2.5 text-right align-middle">
                        <div className="flex items-center justify-end gap-2 opacity-100 transition-opacity duration-200 lg:opacity-0 lg:group-hover:opacity-100">
                          {row.onSelect ? (
                            <button type="button" className={actionButtonClass} onClick={row.onSelect}>
                              {row.selectLabel || t('catalog.action.select')}
                            </button>
                          ) : null}
                          <button type="button" className={actionButtonClass} onClick={row.onEdit}>{t('catalog.action.edit')}</button>
                          <button type="button" className={dangerButtonClass} onClick={row.onDelete}>{t('catalog.action.delete')}</button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
              <div>
                {t('catalog.pagination.totalRecords', { count: rows.length })}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 transition-colors hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('catalog.action.previousPage')}
                </button>
                <span className="px-2">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 transition-colors hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('catalog.action.nextPage')}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}
