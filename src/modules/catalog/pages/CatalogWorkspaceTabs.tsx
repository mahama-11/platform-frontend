import { AnimatePresence, motion } from 'framer-motion'
import type { TFunction } from 'i18next'

import { platformClient } from '@/shared/api/platformClient'
import {
  formatMinorMoney,
  formatRateCardPriceSummary,
  getCatalogAssetTypeLabel,
  getCatalogBillingModeLabel,
  getCatalogCapabilityCodeLabel,
  getCatalogGrantModeLabel,
  getCatalogLifecycleTypeLabel,
  getCatalogPackageTypeLabel,
  getCatalogPricingBehaviorLabel,
  getCatalogSettlementModeLabel,
  getCatalogSkuTypeLabel,
  getCatalogStatusLabel,
  getCatalogTemplateScopeLabel,
} from '@/shared/i18n/helpers'
import { SectionCard } from '@/shared/ui/SectionCard'
import { CatalogTabNav, CodePanel, ListHeader, RecordList } from './CatalogPage.parts'

import type {
  AllowancePolicyRecord,
  AssetDefinitionRecord,
  BillableItemRecord,
  PackageCapabilityPolicyRecord,
  PackageRecord,
  ProductRecord,
  QuotaGrantPolicyRecord,
  RateCardRecord,
  SKURecord,
} from '@/shared/types/platform'

export type CatalogTabKey = 'sku' | 'package' | 'billable' | 'rate-card' | 'asset' | 'policy' | 'api'
type CatalogEntityKey = 'product' | 'sku' | 'package' | 'billableItem' | 'rateCard' | 'asset' | 'quotaPolicy' | 'capabilityPolicy' | 'allowancePolicy'
type MutationAction = 'create' | 'update' | 'delete'

type CatalogWorkspaceTabsProps = {
  activeTab: CatalogTabKey
  onTabChange: (tab: CatalogTabKey) => void
  t: TFunction
  selectedProduct: ProductRecord | null
  skus: SKURecord[]
  packages: PackageRecord[]
  billableItems: BillableItemRecord[]
  rateCards: RateCardRecord[]
  assets: AssetDefinitionRecord[]
  allowancePolicies: AllowancePolicyRecord[]
  quotaPolicies: QuotaGrantPolicyRecord[]
  capabilityPolicies: PackageCapabilityPolicyRecord[]
  entityLabel: (key: CatalogEntityKey) => string
  openSkuModal: (item?: SKURecord) => void
  openPackageModal: (item?: PackageRecord) => void
  openBillableModal: (item?: BillableItemRecord) => void
  openRateCardModal: (item?: RateCardRecord) => void
  openAssetModal: (item?: AssetDefinitionRecord) => void
  openPolicyModal: (item?: AllowancePolicyRecord) => void
  openQuotaPolicyModal: (item?: QuotaGrantPolicyRecord) => void
  openCapabilityPolicyModal: (item?: PackageCapabilityPolicyRecord) => void
  deleteConfirmMessage: (entity: CatalogEntityKey, target: string) => string
  handleMutation: (action: () => Promise<void>, successTitle: string, failureTitle?: string) => Promise<void>
  mutationSuccessTitle: (action: MutationAction, entity: CatalogEntityKey) => string
  mutationFailureTitle: (action: MutationAction, entity: CatalogEntityKey) => string
}

const tabMotionProps = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.15 },
  className: 'min-w-0',
}

export function CatalogWorkspaceTabs({
  activeTab,
  onTabChange,
  t,
  selectedProduct,
  skus,
  packages,
  billableItems,
  rateCards,
  assets,
  allowancePolicies,
  quotaPolicies,
  capabilityPolicies,
  entityLabel,
  openSkuModal,
  openPackageModal,
  openBillableModal,
  openRateCardModal,
  openAssetModal,
  openPolicyModal,
  openQuotaPolicyModal,
  openCapabilityPolicyModal,
  deleteConfirmMessage,
  handleMutation,
  mutationSuccessTitle,
  mutationFailureTitle,
}: CatalogWorkspaceTabsProps) {
  return (
    <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }} className="min-w-0 flex flex-col gap-6">
      <CatalogTabNav
        activeTab={activeTab}
        apiLabel={t('catalog.page.section.apiTitle')}
        onTabChange={onTabChange}
      />

      <div className="min-w-0 relative">
        <AnimatePresence mode="wait">
          {activeTab === 'sku' && (
            <motion.div key="tab-sku" {...tabMotionProps}>
              <SectionCard title={t('catalog.page.section.skuTitle')} description={t('catalog.page.section.skuDescription')}>
                <ListHeader subtitle={t('catalog.page.section.skuSubtitle')} actionLabel={`${t('catalog.action.create')} ${entityLabel('sku')}`} onAction={() => openSkuModal()} disabled={!selectedProduct} />
                <RecordList
                  columns={['Code', 'Name', 'SKU Type', 'Billing Mode', 'List Price', 'Status']}
                  rows={skus.map(item => ({
                    key: item.id,
                    cells: [item.code, item.name, getCatalogSkuTypeLabel(t, item.sku_type), getCatalogBillingModeLabel(t, item.billing_mode), formatMinorMoney(t, item.currency, item.list_price), getCatalogStatusLabel(t, item.status)],
                    onEdit: () => openSkuModal(item),
                    onDelete: () => {
                      if (!window.confirm(deleteConfirmMessage('sku', item.code))) return
                      void handleMutation(async () => {
                        await platformClient.deleteCatalogSku(item.id)
                      }, mutationSuccessTitle('delete', 'sku'), mutationFailureTitle('delete', 'sku'))
                    },
                  }))}
                  emptyMessage={t('catalog.page.section.skuEmpty')}
                />
              </SectionCard>
            </motion.div>
          )}

          {activeTab === 'package' && (
            <motion.div key="tab-package" {...tabMotionProps}>
              <SectionCard title={t('catalog.page.section.packageTitle')} description={t('catalog.page.section.packageDescription')}>
                <ListHeader subtitle={t('catalog.page.section.packageSubtitle')} actionLabel={`${t('catalog.action.create')} ${entityLabel('package')}`} onAction={() => openPackageModal()} disabled={!selectedProduct} />
                <RecordList
                  columns={['Code', 'Name', 'Package Type', 'Status']}
                  rows={packages.map(item => ({
                    key: item.id,
                    cells: [item.code, item.name, getCatalogPackageTypeLabel(t, item.package_type), getCatalogStatusLabel(t, item.status)],
                    onEdit: () => openPackageModal(item),
                    onDelete: () => {
                      if (!window.confirm(deleteConfirmMessage('package', item.code))) return
                      void handleMutation(async () => {
                        await platformClient.deleteCatalogPackage(item.id)
                      }, mutationSuccessTitle('delete', 'package'), mutationFailureTitle('delete', 'package'))
                    },
                  }))}
                  emptyMessage={t('catalog.page.section.packageEmpty')}
                />
              </SectionCard>
            </motion.div>
          )}

          {activeTab === 'billable' && (
            <motion.div key="tab-billable" {...tabMotionProps}>
              <SectionCard title={t('catalog.page.section.billableTitle')} description={t('catalog.page.section.billableDescription')}>
                <ListHeader subtitle={t('catalog.page.section.billableSubtitle')} actionLabel={`${t('catalog.action.create')} ${entityLabel('billableItem')}`} onAction={() => openBillableModal()} disabled={!selectedProduct} />
                <RecordList
                  columns={['Code', 'Name', 'Meter Unit', 'Settlement Mode', 'Pricing Behavior', 'Status']}
                  rows={billableItems.map(item => ({
                    key: item.id,
                    cells: [item.code, item.name, item.meter_unit, getCatalogSettlementModeLabel(t, item.settlement_mode), getCatalogPricingBehaviorLabel(t, item.pricing_behavior), getCatalogStatusLabel(t, item.status)],
                    onEdit: () => openBillableModal(item),
                    onDelete: () => {
                      if (!window.confirm(deleteConfirmMessage('billableItem', item.code))) return
                      void handleMutation(async () => {
                        await platformClient.deleteCatalogBillableItem(item.id)
                      }, mutationSuccessTitle('delete', 'billableItem'), mutationFailureTitle('delete', 'billableItem'))
                    },
                  }))}
                  emptyMessage={t('catalog.page.section.billableEmpty')}
                />
              </SectionCard>
            </motion.div>
          )}

          {activeTab === 'rate-card' && (
            <motion.div key="tab-rate-card" {...tabMotionProps}>
              <SectionCard title={t('catalog.page.section.rateCardTitle')} description={t('catalog.page.section.rateCardDescription')}>
                <ListHeader subtitle={t('catalog.page.section.rateCardSubtitle')} actionLabel={`${t('catalog.action.create')} ${entityLabel('rateCard')}`} onAction={() => openRateCardModal()} disabled={!selectedProduct} />
                <RecordList
                  columns={['Code', 'Target', 'Price', 'Version', 'Window', 'Status']}
                  rows={rateCards.map(item => ({
                    key: item.id,
                    cells: [
                      item.code,
                      `${item.target_type}:${item.target_id}`,
                      formatRateCardPriceSummary(t, item.currency, item.price_model, item.price_config),
                      String(item.version),
                      [item.effective_from?.slice(0, 10), item.effective_to?.slice(0, 10)].filter(Boolean).join(' ~ ') || 'always',
                      getCatalogStatusLabel(t, item.status),
                    ],
                    onEdit: () => openRateCardModal(item),
                    onDelete: () => {
                      if (!window.confirm(deleteConfirmMessage('rateCard', item.code))) return
                      void handleMutation(async () => {
                        await platformClient.deleteCatalogRateCard(item.id)
                      }, mutationSuccessTitle('delete', 'rateCard'), mutationFailureTitle('delete', 'rateCard'))
                    },
                  }))}
                  emptyMessage={t('catalog.page.section.rateCardEmpty')}
                />
              </SectionCard>
            </motion.div>
          )}

          {activeTab === 'asset' && (
            <motion.div key="tab-asset" {...tabMotionProps}>
              <SectionCard title={t('catalog.page.section.assetTitle')} description={t('catalog.page.section.assetDescription')}>
                <ListHeader subtitle={t('catalog.page.section.assetSubtitle')} actionLabel={`${t('catalog.action.create')} ${entityLabel('asset')}`} onAction={() => openAssetModal()} disabled={!selectedProduct} />
                <RecordList
                  columns={['Asset Code', 'Asset Type', 'Lifecycle', 'Reset/Expire', 'Status']}
                  rows={assets.map(item => ({
                    key: item.asset_code,
                    cells: [item.asset_code, getCatalogAssetTypeLabel(t, item.asset_type), getCatalogLifecycleTypeLabel(t, item.lifecycle_type), item.reset_cycle || String(item.default_expire_days || 0), getCatalogStatusLabel(t, item.status)],
                    onEdit: () => openAssetModal(item),
                    onDelete: () => {
                      if (!window.confirm(deleteConfirmMessage('asset', item.asset_code))) return
                      void handleMutation(async () => {
                        await platformClient.deleteWalletAsset(item.asset_code)
                      }, mutationSuccessTitle('delete', 'asset'), mutationFailureTitle('delete', 'asset'))
                    },
                  }))}
                  emptyMessage={t('catalog.page.section.assetEmpty')}
                />
              </SectionCard>
            </motion.div>
          )}

          {activeTab === 'policy' && (
            <motion.div key="tab-policy" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }} className="min-w-0 flex flex-col gap-6">
              <SectionCard title={t('catalog.page.section.quotaPolicyTitle')} description={t('catalog.page.section.quotaPolicyDescription')}>
                <ListHeader subtitle={t('catalog.page.section.quotaPolicySubtitle')} actionLabel={`${t('catalog.action.create')} ${entityLabel('quotaPolicy')}`} onAction={() => openQuotaPolicyModal()} disabled={!selectedProduct} />
                <RecordList
                  columns={['Package', 'Billable Item', 'Grant Mode', 'Units', 'Reset Cycle', 'Status']}
                  rows={quotaPolicies.map(item => ({
                    key: item.id,
                    cells: [item.package_code, item.billable_item_code, getCatalogGrantModeLabel(t, item.grant_mode), String(item.units), item.reset_cycle || '-', getCatalogStatusLabel(t, item.status)],
                    onEdit: () => openQuotaPolicyModal(item),
                    onDelete: () => {
                      if (!window.confirm(deleteConfirmMessage('quotaPolicy', item.id))) return
                      void handleMutation(async () => {
                        await platformClient.deleteQuotaPolicy(item.id)
                      }, mutationSuccessTitle('delete', 'quotaPolicy'), mutationFailureTitle('delete', 'quotaPolicy'))
                    },
                  }))}
                  emptyMessage={t('catalog.page.section.quotaPolicyEmpty')}
                />
              </SectionCard>

              <SectionCard title={t('catalog.page.section.capabilityPolicyTitle')} description={t('catalog.page.section.capabilityPolicyDescription')}>
                <ListHeader subtitle={t('catalog.page.section.capabilityPolicySubtitle')} actionLabel={`${t('catalog.action.create')} ${entityLabel('capabilityPolicy')}`} onAction={() => openCapabilityPolicyModal()} disabled={!selectedProduct} />
                <RecordList
                  columns={['Package', 'Capability', 'Grant Value', 'Status']}
                  rows={capabilityPolicies.map(item => ({
                    key: item.id,
                    cells: [item.package_code, getCatalogCapabilityCodeLabel(t, item.capability_code), getCatalogTemplateScopeLabel(t, item.grant_value), getCatalogStatusLabel(t, item.status)],
                    onEdit: () => openCapabilityPolicyModal(item),
                    onDelete: () => {
                      if (!window.confirm(deleteConfirmMessage('capabilityPolicy', item.id))) return
                      void handleMutation(async () => {
                        await platformClient.deleteCapabilityPolicy(item.id)
                      }, mutationSuccessTitle('delete', 'capabilityPolicy'), mutationFailureTitle('delete', 'capabilityPolicy'))
                    },
                  }))}
                  emptyMessage={t('catalog.page.section.capabilityPolicyEmpty')}
                />
              </SectionCard>

              <SectionCard title={t('catalog.page.section.allowancePolicyTitle')} description={t('catalog.page.section.allowancePolicyDescription')}>
                <ListHeader subtitle={t('catalog.page.section.allowancePolicySubtitle')} actionLabel={`${t('catalog.action.create')} ${entityLabel('allowancePolicy')}`} onAction={() => openPolicyModal()} disabled={!selectedProduct} />
                <RecordList
                  columns={['Subject', 'Asset', 'Amount', 'Reset Cycle', 'Window', 'Status']}
                  rows={allowancePolicies.map(item => ({
                    key: item.id,
                    cells: [
                      `${item.billing_subject_type}/${item.billing_subject_id}`,
                      item.asset_code,
                      String(item.amount),
                      item.reset_cycle || '-',
                      [item.effective_from?.slice(0, 10), item.effective_to?.slice(0, 10)].filter(Boolean).join(' ~ ') || 'always',
                      getCatalogStatusLabel(t, item.status),
                    ],
                    onEdit: () => openPolicyModal(item),
                    onDelete: () => {
                      if (!window.confirm(deleteConfirmMessage('allowancePolicy', item.id))) return
                      void handleMutation(async () => {
                        await platformClient.deleteAllowancePolicy(item.id)
                      }, mutationSuccessTitle('delete', 'allowancePolicy'), mutationFailureTitle('delete', 'allowancePolicy'))
                    },
                  }))}
                  emptyMessage={t('catalog.page.section.allowancePolicyEmpty')}
                />
              </SectionCard>
            </motion.div>
          )}

          {activeTab === 'api' && (
            <motion.div key="tab-api" {...tabMotionProps}>
              <SectionCard title={t('catalog.page.section.apiTitle')} description={t('catalog.page.section.apiDescription')}>
                <CodePanel>
                  {`GET /internal/v1/catalog/offerings?product_code=${selectedProduct?.code || 'menu'}`}
                </CodePanel>
                <p className="mt-4 text-sm text-slate-400">
                  {t('catalog.page.section.apiBody')}
                </p>
              </SectionCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
