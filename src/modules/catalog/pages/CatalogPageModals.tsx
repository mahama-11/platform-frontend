import type { Dispatch, SetStateAction } from 'react'
import type { TFunction } from 'i18next'
import { AnimatePresence } from 'framer-motion'

import { platformClient } from '@/shared/api/platformClient'
import type {
  AssetDefinitionRecord,
  BillableItemRecord,
  PackageRecord,
  ProductRecord,
} from '@/shared/types/platform'
import { AdvancedMetadata, Field, FormGrid, ModalShell, SelectInput, TextAreaInput, TextInput } from './CatalogPage.parts'
import type {
  defaultAssetForm,
  defaultBillableForm,
  defaultCapabilityPolicyForm,
  defaultPackageForm,
  defaultPolicyForm,
  defaultProductForm,
  defaultQuotaPolicyForm,
  defaultRateCardForm,
  defaultSkuForm,
} from './CatalogPage.defaults'

type Option = { value: string; label: string }
type ModalKind = 'product' | 'sku' | 'package' | 'billable' | 'rate-card' | 'asset' | 'policy' | 'quota-policy' | 'capability-policy'
type CatalogEntityKey = 'product' | 'sku' | 'package' | 'billableItem' | 'rateCard' | 'asset' | 'quotaPolicy' | 'capabilityPolicy' | 'allowancePolicy'
type MutationAction = 'create' | 'update' | 'delete'
type ProductForm = typeof defaultProductForm
type SkuForm = typeof defaultSkuForm
type PackageForm = typeof defaultPackageForm
type BillableForm = typeof defaultBillableForm
type RateCardForm = typeof defaultRateCardForm
type AssetForm = typeof defaultAssetForm
type PolicyForm = typeof defaultPolicyForm
type QuotaPolicyForm = typeof defaultQuotaPolicyForm
type CapabilityPolicyForm = typeof defaultCapabilityPolicyForm
type VoidValidator = () => void
type LabelResolver = (key: CatalogEntityKey) => string
type FieldLabelResolver = (key: string) => string
type MutationHandler = (action: () => Promise<void>, successTitle: string, failureTitle?: string) => Promise<void>

type CatalogPageModalsProps = {
  t: TFunction
  activeModal: ModalKind | null
  productEditingId: string
  skuEditingId: string
  packageEditingId: string
  billableEditingId: string
  rateCardEditingId: string
  assetEditingCode: string
  policyEditingId: string
  quotaPolicyEditingId: string
  capabilityPolicyEditingId: string
  productForm: ProductForm
  skuForm: SkuForm
  packageForm: PackageForm
  billableForm: BillableForm
  rateCardForm: RateCardForm
  assetForm: AssetForm
  policyForm: PolicyForm
  quotaPolicyForm: QuotaPolicyForm
  capabilityPolicyForm: CapabilityPolicyForm
  setProductForm: Dispatch<SetStateAction<ProductForm>>
  setSkuForm: Dispatch<SetStateAction<SkuForm>>
  setPackageForm: Dispatch<SetStateAction<PackageForm>>
  setBillableForm: Dispatch<SetStateAction<BillableForm>>
  setRateCardForm: Dispatch<SetStateAction<RateCardForm>>
  setAssetForm: Dispatch<SetStateAction<AssetForm>>
  setPolicyForm: Dispatch<SetStateAction<PolicyForm>>
  setQuotaPolicyForm: Dispatch<SetStateAction<QuotaPolicyForm>>
  setCapabilityPolicyForm: Dispatch<SetStateAction<CapabilityPolicyForm>>
  statusOptions: Option[]
  skuTypeOptions: Option[]
  billingModeOptions: Option[]
  packageTypeOptions: Option[]
  billingScopeOptions: Option[]
  settlementModeOptions: Option[]
  pricingBehaviorOptions: Option[]
  rateCardTargetTypeOptions: Option[]
  rateCardTargetOptions: Option[]
  priceModelOptions: Option[]
  assetTypeOptions: Option[]
  lifecycleOptions: Option[]
  subjectTypeOptions: Option[]
  assets: AssetDefinitionRecord[]
  packages: PackageRecord[]
  billableItems: BillableItemRecord[]
  quotaGrantModeOptions: Option[]
  capabilityCodeOptions: Option[]
  templateScopeOptions: Option[]
  entityLabel: LabelResolver
  fieldLabel: FieldLabelResolver
  closeModal: () => void
  handleMutation: MutationHandler
  validateProductForm: VoidValidator
  validateSkuForm: VoidValidator
  validatePackageForm: VoidValidator
  validateBillableForm: VoidValidator
  validateRateCardForm: VoidValidator
  validateAssetForm: VoidValidator
  validatePolicyForm: VoidValidator
  validateQuotaPolicyForm: VoidValidator
  validateCapabilityPolicyForm: VoidValidator
  mutationSuccessTitle: (action: MutationAction, entity: CatalogEntityKey) => string
  mutationFailureTitle: (action: MutationAction, entity: CatalogEntityKey) => string
  requireSelectedProduct: () => ProductRecord
  toRfc3339: (value: string) => string
}

export function CatalogPageModals({
  activeModal,
  productEditingId,
  skuEditingId,
  packageEditingId,
  billableEditingId,
  rateCardEditingId,
  assetEditingCode,
  policyEditingId,
  quotaPolicyEditingId,
  capabilityPolicyEditingId,
  productForm,
  skuForm,
  packageForm,
  billableForm,
  rateCardForm,
  assetForm,
  policyForm,
  quotaPolicyForm,
  capabilityPolicyForm,
  setProductForm,
  setSkuForm,
  setPackageForm,
  setBillableForm,
  setRateCardForm,
  setAssetForm,
  setPolicyForm,
  setQuotaPolicyForm,
  setCapabilityPolicyForm,
  statusOptions,
  skuTypeOptions,
  billingModeOptions,
  packageTypeOptions,
  billingScopeOptions,
  settlementModeOptions,
  pricingBehaviorOptions,
  rateCardTargetTypeOptions,
  rateCardTargetOptions,
  priceModelOptions,
  assetTypeOptions,
  lifecycleOptions,
  subjectTypeOptions,
  assets,
  packages,
  billableItems,
  quotaGrantModeOptions,
  capabilityCodeOptions,
  templateScopeOptions,
  t,
  entityLabel,
  fieldLabel,
  closeModal,
  handleMutation,
  validateProductForm,
  validateSkuForm,
  validatePackageForm,
  validateBillableForm,
  validateRateCardForm,
  validateAssetForm,
  validatePolicyForm,
  validateQuotaPolicyForm,
  validateCapabilityPolicyForm,
  mutationSuccessTitle,
  mutationFailureTitle,
  requireSelectedProduct,
  toRfc3339,
}: CatalogPageModalsProps) {
  return (
      <AnimatePresence>
        {activeModal === 'product' && (
          <ModalShell
            key="modal-product"
            title={`${t(productEditingId ? 'catalog.action.edit' : 'catalog.action.create')} ${entityLabel('product')}`}
            description={t('catalog.page.modal.productDescription')}
            onClose={closeModal}
            onSubmit={() => void handleMutation(async () => {
              validateProductForm()
              const payload = { ...productForm }
              if (productEditingId) {
                await platformClient.updateCatalogProduct(productEditingId, payload)
              } else {
                await platformClient.createCatalogProduct(payload)
              }
            }, mutationSuccessTitle(productEditingId ? 'update' : 'create', 'product'), mutationFailureTitle(productEditingId ? 'update' : 'create', 'product'))}
          >
            <FormGrid>
              <Field label={fieldLabel('code')}><TextInput value={productForm.code} onChange={value => setProductForm(prev => ({ ...prev, code: value }))} placeholder="menu" /></Field>
              <Field label={fieldLabel('name')}><TextInput value={productForm.name} onChange={value => setProductForm(prev => ({ ...prev, name: value }))} placeholder="Menu" /></Field>
              <Field label={fieldLabel('status')}><SelectInput value={productForm.status} onChange={value => setProductForm(prev => ({ ...prev, status: value }))} options={statusOptions} /></Field>
              <Field label={fieldLabel('ownerTeam')}><TextInput value={productForm.owner_team} onChange={value => setProductForm(prev => ({ ...prev, owner_team: value }))} placeholder="v-menu-backend" /></Field>
            </FormGrid>
            <AdvancedMetadata value={productForm.metadata} onChange={value => setProductForm(prev => ({ ...prev, metadata: value }))} />
          </ModalShell>
        )}

        {activeModal === 'sku' && (
          <ModalShell
            key="modal-sku"
            title={`${t(skuEditingId ? 'catalog.action.edit' : 'catalog.action.create')} ${entityLabel('sku')}`}
            description={t('catalog.page.modal.skuDescription')}
            onClose={closeModal}
            onSubmit={() => void handleMutation(async () => {
              const product = requireSelectedProduct()
              validateSkuForm()
              const payload = {
                product_id: product.id,
                code: skuForm.code,
                name: skuForm.name,
                sku_type: skuForm.sku_type,
                billing_mode: skuForm.billing_mode,
                currency: skuForm.currency,
                list_price: Number(skuForm.list_price || '0'),
                status: skuForm.status,
                metadata: skuForm.metadata,
              }
              if (skuEditingId) {
                await platformClient.updateCatalogSku(skuEditingId, payload)
              } else {
                await platformClient.createCatalogSku(payload)
              }
            }, mutationSuccessTitle(skuEditingId ? 'update' : 'create', 'sku'), mutationFailureTitle(skuEditingId ? 'update' : 'create', 'sku'))}
          >
            <FormGrid>
              <Field label={fieldLabel('code')}><TextInput value={skuForm.code} onChange={value => setSkuForm(prev => ({ ...prev, code: value }))} placeholder="menu.sku.sub.basic.monthly" /></Field>
              <Field label={fieldLabel('name')}><TextInput value={skuForm.name} onChange={value => setSkuForm(prev => ({ ...prev, name: value }))} placeholder="Menu Basic Monthly" /></Field>
              <Field label={fieldLabel('skuType')}><SelectInput value={skuForm.sku_type} onChange={value => setSkuForm(prev => ({ ...prev, sku_type: value }))} options={skuTypeOptions} /></Field>
              <Field label={fieldLabel('billingMode')}><SelectInput value={skuForm.billing_mode} onChange={value => setSkuForm(prev => ({ ...prev, billing_mode: value }))} options={billingModeOptions} /></Field>
              <Field label={fieldLabel('currency')}><TextInput value={skuForm.currency} onChange={value => setSkuForm(prev => ({ ...prev, currency: value }))} placeholder="CNY" /></Field>
              <Field label={fieldLabel('listPriceCents')}><TextInput value={skuForm.list_price} onChange={value => setSkuForm(prev => ({ ...prev, list_price: value }))} placeholder="900" /></Field>
              <Field label={fieldLabel('status')}><SelectInput value={skuForm.status} onChange={value => setSkuForm(prev => ({ ...prev, status: value }))} options={statusOptions} /></Field>
            </FormGrid>
            <p className="text-xs text-[var(--text-soft)]">{t('catalog.help.listPriceMinor')}</p>
            <AdvancedMetadata value={skuForm.metadata} onChange={value => setSkuForm(prev => ({ ...prev, metadata: value }))} />
          </ModalShell>
        )}

        {activeModal === 'package' && (
          <ModalShell
            key="modal-package"
            title={`${t(packageEditingId ? 'catalog.action.edit' : 'catalog.action.create')} ${entityLabel('package')}`}
            description={t('catalog.page.modal.packageDescription')}
            onClose={closeModal}
            onSubmit={() => void handleMutation(async () => {
              const product = requireSelectedProduct()
              validatePackageForm()
              const payload = {
                product_id: product.id,
                code: packageForm.code,
                name: packageForm.name,
                package_type: packageForm.package_type,
                status: packageForm.status,
                metadata: packageForm.metadata,
              }
              if (packageEditingId) {
                await platformClient.updateCatalogPackage(packageEditingId, payload)
              } else {
                await platformClient.createCatalogPackage(payload)
              }
            }, mutationSuccessTitle(packageEditingId ? 'update' : 'create', 'package'), mutationFailureTitle(packageEditingId ? 'update' : 'create', 'package'))}
          >
            <FormGrid>
              <Field label={fieldLabel('code')}><TextInput value={packageForm.code} onChange={value => setPackageForm(prev => ({ ...prev, code: value }))} placeholder="menu.pkg.sub.basic.monthly" /></Field>
              <Field label={fieldLabel('name')}><TextInput value={packageForm.name} onChange={value => setPackageForm(prev => ({ ...prev, name: value }))} placeholder="Basic Monthly Package" /></Field>
              <Field label={fieldLabel('packageType')}><SelectInput value={packageForm.package_type} onChange={value => setPackageForm(prev => ({ ...prev, package_type: value }))} options={packageTypeOptions} /></Field>
              <Field label={fieldLabel('status')}><SelectInput value={packageForm.status} onChange={value => setPackageForm(prev => ({ ...prev, status: value }))} options={statusOptions} /></Field>
            </FormGrid>
            <AdvancedMetadata value={packageForm.metadata} onChange={value => setPackageForm(prev => ({ ...prev, metadata: value }))} />
          </ModalShell>
        )}

        {activeModal === 'billable' && (
          <ModalShell
            key="modal-billable"
            title={`${t(billableEditingId ? 'catalog.action.edit' : 'catalog.action.create')} ${entityLabel('billableItem')}`}
            description={t('catalog.page.modal.billableDescription')}
            onClose={closeModal}
            onSubmit={() => void handleMutation(async () => {
              const product = requireSelectedProduct()
              validateBillableForm()
              const payload = { product_id: product.id, ...billableForm }
              if (billableEditingId) {
                await platformClient.updateCatalogBillableItem(billableEditingId, payload)
              } else {
                await platformClient.createCatalogBillableItem(payload)
              }
            }, mutationSuccessTitle(billableEditingId ? 'update' : 'create', 'billableItem'), mutationFailureTitle(billableEditingId ? 'update' : 'create', 'billableItem'))}
          >
            <FormGrid>
              <Field label={fieldLabel('code')}><TextInput value={billableForm.code} onChange={value => setBillableForm(prev => ({ ...prev, code: value }))} placeholder="menu.render.call" /></Field>
              <Field label={fieldLabel('name')}><TextInput value={billableForm.name} onChange={value => setBillableForm(prev => ({ ...prev, name: value }))} placeholder="Menu Render Call" /></Field>
              <Field label={fieldLabel('meterUnit')}><TextInput value={billableForm.meter_unit} onChange={value => setBillableForm(prev => ({ ...prev, meter_unit: value }))} placeholder="call" /></Field>
              <Field label={fieldLabel('billingScope')}><SelectInput value={billableForm.billing_scope} onChange={value => setBillableForm(prev => ({ ...prev, billing_scope: value }))} options={billingScopeOptions} /></Field>
              <Field label={fieldLabel('settlementMode')}><SelectInput value={billableForm.settlement_mode} onChange={value => setBillableForm(prev => ({ ...prev, settlement_mode: value }))} options={settlementModeOptions} /></Field>
              <Field label={fieldLabel('pricingBehavior')}><SelectInput value={billableForm.pricing_behavior} onChange={value => setBillableForm(prev => ({ ...prev, pricing_behavior: value }))} options={pricingBehaviorOptions} /></Field>
              <Field label={fieldLabel('status')}><SelectInput value={billableForm.status} onChange={value => setBillableForm(prev => ({ ...prev, status: value }))} options={statusOptions} /></Field>
            </FormGrid>
            <AdvancedMetadata value={billableForm.metadata} onChange={value => setBillableForm(prev => ({ ...prev, metadata: value }))} />
          </ModalShell>
        )}

        {activeModal === 'rate-card' && (
          <ModalShell
            key="modal-rate-card"
            title={`${t(rateCardEditingId ? 'catalog.action.edit' : 'catalog.action.create')} ${entityLabel('rateCard')}`}
            description={t('catalog.page.modal.rateCardDescription')}
            onClose={closeModal}
            onSubmit={() => void handleMutation(async () => {
              const product = requireSelectedProduct()
              validateRateCardForm()
              const payload = {
                product_id: product.id,
                code: rateCardForm.code,
                target_type: rateCardForm.target_type,
                target_id: rateCardForm.target_id,
                price_model: rateCardForm.price_model,
                currency: rateCardForm.currency,
                price_config: rateCardForm.price_config,
                effective_from: toRfc3339(rateCardForm.effective_from),
                effective_to: toRfc3339(rateCardForm.effective_to),
                version: Number(rateCardForm.version || '1'),
                status: rateCardForm.status,
                metadata: rateCardForm.metadata,
              }
              if (rateCardEditingId) {
                await platformClient.updateCatalogRateCard(rateCardEditingId, payload)
              } else {
                await platformClient.createCatalogRateCard(payload)
              }
            }, mutationSuccessTitle(rateCardEditingId ? 'update' : 'create', 'rateCard'), mutationFailureTitle(rateCardEditingId ? 'update' : 'create', 'rateCard'))}
          >
            <FormGrid>
              <Field label={fieldLabel('code')}><TextInput value={rateCardForm.code} onChange={value => setRateCardForm(prev => ({ ...prev, code: value }))} placeholder="menu.render.call.v1" /></Field>
              <Field label={fieldLabel('targetType')}><SelectInput value={rateCardForm.target_type} onChange={value => setRateCardForm(prev => ({ ...prev, target_type: value, target_id: '' }))} options={rateCardTargetTypeOptions} /></Field>
              <Field label={fieldLabel('targetId')}><SelectInput value={rateCardForm.target_id} onChange={value => setRateCardForm(prev => ({ ...prev, target_id: value }))} options={rateCardTargetOptions} placeholder={t('catalog.placeholder.selectTarget')} /></Field>
              <Field label={fieldLabel('priceModel')}><SelectInput value={rateCardForm.price_model} onChange={value => setRateCardForm(prev => ({ ...prev, price_model: value }))} options={priceModelOptions} /></Field>
              <Field label={fieldLabel('currency')}><TextInput value={rateCardForm.currency} onChange={value => setRateCardForm(prev => ({ ...prev, currency: value }))} placeholder="CNY" /></Field>
              <Field label={fieldLabel('version')}><TextInput value={rateCardForm.version} onChange={value => setRateCardForm(prev => ({ ...prev, version: value }))} placeholder="1" /></Field>
              <Field label={fieldLabel('effectiveFrom')}><TextInput type="datetime-local" value={rateCardForm.effective_from} onChange={value => setRateCardForm(prev => ({ ...prev, effective_from: value }))} /></Field>
              <Field label={fieldLabel('effectiveTo')}><TextInput type="datetime-local" value={rateCardForm.effective_to} onChange={value => setRateCardForm(prev => ({ ...prev, effective_to: value }))} /></Field>
              <Field label={fieldLabel('status')}><SelectInput value={rateCardForm.status} onChange={value => setRateCardForm(prev => ({ ...prev, status: value }))} options={statusOptions} /></Field>
            </FormGrid>
            <Field label={fieldLabel('priceConfigJson')}><TextAreaInput value={rateCardForm.price_config} onChange={value => setRateCardForm(prev => ({ ...prev, price_config: value }))} placeholder='{"unit_amount":10}' /></Field>
            <p className="text-xs text-[var(--text-soft)]">{t('catalog.help.priceConfigMinor')}</p>
            <AdvancedMetadata value={rateCardForm.metadata} onChange={value => setRateCardForm(prev => ({ ...prev, metadata: value }))} />
          </ModalShell>
        )}

        {activeModal === 'asset' && (
          <ModalShell
            key="modal-asset"
            title={`${t(assetEditingCode ? 'catalog.action.edit' : 'catalog.action.create')} ${entityLabel('asset')}`}
            description={t('catalog.page.modal.assetDescription')}
            onClose={closeModal}
            onSubmit={() => void handleMutation(async () => {
              const product = requireSelectedProduct()
              validateAssetForm()
              const payload = {
                product_code: product.code,
                asset_code: assetForm.asset_code,
                asset_type: assetForm.asset_type,
                lifecycle_type: assetForm.lifecycle_type,
                default_expire_days: Number(assetForm.default_expire_days || '0'),
                reset_cycle: assetForm.reset_cycle,
                status: assetForm.status,
                description: assetForm.description,
                metadata: assetForm.metadata,
              }
              if (assetEditingCode) {
                await platformClient.updateWalletAsset(assetEditingCode, payload)
              } else {
                await platformClient.createWalletAsset(payload)
              }
            }, mutationSuccessTitle(assetEditingCode ? 'update' : 'create', 'asset'), mutationFailureTitle(assetEditingCode ? 'update' : 'create', 'asset'))}
          >
            <FormGrid>
              <Field label={fieldLabel('assetCode')}><TextInput value={assetForm.asset_code} onChange={value => setAssetForm(prev => ({ ...prev, asset_code: value }))} placeholder="MENU_MONTHLY_ALLOWANCE" /></Field>
              <Field label={fieldLabel('assetType')}><SelectInput value={assetForm.asset_type} onChange={value => setAssetForm(prev => ({ ...prev, asset_type: value }))} options={assetTypeOptions} /></Field>
              <Field label={fieldLabel('lifecycle')}><SelectInput value={assetForm.lifecycle_type} onChange={value => setAssetForm(prev => ({ ...prev, lifecycle_type: value }))} options={lifecycleOptions} /></Field>
              <Field label={fieldLabel('expireDays')}><TextInput value={assetForm.default_expire_days} onChange={value => setAssetForm(prev => ({ ...prev, default_expire_days: value }))} placeholder="90" /></Field>
              <Field label={fieldLabel('resetCycle')}><TextInput value={assetForm.reset_cycle} onChange={value => setAssetForm(prev => ({ ...prev, reset_cycle: value }))} placeholder="monthly" /></Field>
              <Field label={fieldLabel('status')}><SelectInput value={assetForm.status} onChange={value => setAssetForm(prev => ({ ...prev, status: value }))} options={statusOptions} /></Field>
            </FormGrid>
            <Field label={fieldLabel('description')}><TextInput value={assetForm.description} onChange={value => setAssetForm(prev => ({ ...prev, description: value }))} placeholder="Monthly included allowance" /></Field>
            <AdvancedMetadata value={assetForm.metadata} onChange={value => setAssetForm(prev => ({ ...prev, metadata: value }))} />
          </ModalShell>
        )}

        {activeModal === 'policy' && (
          <ModalShell
            key="modal-policy"
            title={`${t(policyEditingId ? 'catalog.action.edit' : 'catalog.action.create')} ${entityLabel('allowancePolicy')}`}
            description={t('catalog.page.modal.policyDescription')}
            onClose={closeModal}
            onSubmit={() => void handleMutation(async () => {
              const product = requireSelectedProduct()
              validatePolicyForm()
              const payload = {
                product_code: product.code,
                billing_subject_type: policyForm.billing_subject_type,
                billing_subject_id: policyForm.billing_subject_id,
                asset_code: policyForm.asset_code,
                amount: Number(policyForm.amount || '0'),
                reset_cycle: policyForm.reset_cycle,
                status: policyForm.status,
                effective_from: toRfc3339(policyForm.effective_from),
                effective_to: toRfc3339(policyForm.effective_to),
                metadata: policyForm.metadata,
              }
              if (policyEditingId) {
                await platformClient.updateAllowancePolicy(policyEditingId, payload)
              } else {
                await platformClient.createAllowancePolicy(payload)
              }
            }, mutationSuccessTitle(policyEditingId ? 'update' : 'create', 'allowancePolicy'), mutationFailureTitle(policyEditingId ? 'update' : 'create', 'allowancePolicy'))}
          >
            <FormGrid>
              <Field label={fieldLabel('subjectType')}><SelectInput value={policyForm.billing_subject_type} onChange={value => setPolicyForm(prev => ({ ...prev, billing_subject_type: value }))} options={subjectTypeOptions} /></Field>
              <Field label={fieldLabel('subjectId')}><TextInput value={policyForm.billing_subject_id} onChange={value => setPolicyForm(prev => ({ ...prev, billing_subject_id: value }))} placeholder="org_xxx 或 plan_template_basic" /></Field>
              <Field label={fieldLabel('assetCode')}><SelectInput value={policyForm.asset_code} onChange={value => setPolicyForm(prev => ({ ...prev, asset_code: value }))} options={assets.map(item => ({ value: item.asset_code, label: item.asset_code }))} placeholder={t('catalog.placeholder.selectAsset')} /></Field>
              <Field label={fieldLabel('amount')}><TextInput value={policyForm.amount} onChange={value => setPolicyForm(prev => ({ ...prev, amount: value }))} placeholder="300" /></Field>
              <Field label={fieldLabel('resetCycle')}><TextInput value={policyForm.reset_cycle} onChange={value => setPolicyForm(prev => ({ ...prev, reset_cycle: value }))} placeholder="monthly" /></Field>
              <Field label={fieldLabel('status')}><SelectInput value={policyForm.status} onChange={value => setPolicyForm(prev => ({ ...prev, status: value }))} options={statusOptions} /></Field>
              <Field label={fieldLabel('effectiveFrom')}><TextInput type="datetime-local" value={policyForm.effective_from} onChange={value => setPolicyForm(prev => ({ ...prev, effective_from: value }))} /></Field>
              <Field label={fieldLabel('effectiveTo')}><TextInput type="datetime-local" value={policyForm.effective_to} onChange={value => setPolicyForm(prev => ({ ...prev, effective_to: value }))} /></Field>
            </FormGrid>
            <AdvancedMetadata value={policyForm.metadata} onChange={value => setPolicyForm(prev => ({ ...prev, metadata: value }))} />
          </ModalShell>
        )}

        {activeModal === 'quota-policy' && (
          <ModalShell
            key="modal-quota-policy"
            title={`${t(quotaPolicyEditingId ? 'catalog.action.edit' : 'catalog.action.create')} ${entityLabel('quotaPolicy')}`}
            description={t('catalog.page.modal.quotaPolicyDescription')}
            onClose={closeModal}
            onSubmit={() => void handleMutation(async () => {
              const product = requireSelectedProduct()
              validateQuotaPolicyForm()
              const payload = {
                product_code: product.code,
                package_code: quotaPolicyForm.package_code,
                billable_item_code: quotaPolicyForm.billable_item_code,
                grant_mode: quotaPolicyForm.grant_mode,
                units: Number(quotaPolicyForm.units || '0'),
                reset_cycle: quotaPolicyForm.reset_cycle,
                status: quotaPolicyForm.status,
                metadata: quotaPolicyForm.metadata,
              }
              if (quotaPolicyEditingId) {
                await platformClient.updateQuotaPolicy(quotaPolicyEditingId, payload)
              } else {
                await platformClient.createQuotaPolicy(payload)
              }
            }, mutationSuccessTitle(quotaPolicyEditingId ? 'update' : 'create', 'quotaPolicy'), mutationFailureTitle(quotaPolicyEditingId ? 'update' : 'create', 'quotaPolicy'))}
          >
            <FormGrid>
              <Field label={fieldLabel('packageCode')}><SelectInput value={quotaPolicyForm.package_code} onChange={value => setQuotaPolicyForm(prev => ({ ...prev, package_code: value }))} options={packages.map(item => ({ value: item.code, label: `${item.code} · ${item.name}` }))} placeholder={t('catalog.placeholder.selectPackage')} /></Field>
              <Field label={fieldLabel('billableItemCode')}><SelectInput value={quotaPolicyForm.billable_item_code} onChange={value => setQuotaPolicyForm(prev => ({ ...prev, billable_item_code: value }))} options={billableItems.map(item => ({ value: item.code, label: `${item.code} · ${item.name}` }))} placeholder={t('catalog.placeholder.selectBillableItem')} /></Field>
              <Field label={fieldLabel('grantMode')}><SelectInput value={quotaPolicyForm.grant_mode} onChange={value => setQuotaPolicyForm(prev => ({ ...prev, grant_mode: value }))} options={quotaGrantModeOptions} /></Field>
              <Field label={fieldLabel('units')}><TextInput value={quotaPolicyForm.units} onChange={value => setQuotaPolicyForm(prev => ({ ...prev, units: value }))} placeholder="300" /></Field>
              <Field label={fieldLabel('resetCycle')}><TextInput value={quotaPolicyForm.reset_cycle} onChange={value => setQuotaPolicyForm(prev => ({ ...prev, reset_cycle: value }))} placeholder="monthly" /></Field>
              <Field label={fieldLabel('status')}><SelectInput value={quotaPolicyForm.status} onChange={value => setQuotaPolicyForm(prev => ({ ...prev, status: value }))} options={statusOptions} /></Field>
            </FormGrid>
            <AdvancedMetadata value={quotaPolicyForm.metadata} onChange={value => setQuotaPolicyForm(prev => ({ ...prev, metadata: value }))} />
          </ModalShell>
        )}

        {activeModal === 'capability-policy' && (
          <ModalShell
            key="modal-capability-policy"
            title={`${t(capabilityPolicyEditingId ? 'catalog.action.edit' : 'catalog.action.create')} ${entityLabel('capabilityPolicy')}`}
            description={t('catalog.page.modal.capabilityPolicyDescription')}
            onClose={closeModal}
            onSubmit={() => void handleMutation(async () => {
              const product = requireSelectedProduct()
              validateCapabilityPolicyForm()
              const payload = {
                product_code: product.code,
                package_code: capabilityPolicyForm.package_code,
                capability_code: capabilityPolicyForm.capability_code,
                grant_value: capabilityPolicyForm.grant_value,
                status: capabilityPolicyForm.status,
                metadata: capabilityPolicyForm.metadata,
              }
              if (capabilityPolicyEditingId) {
                await platformClient.updateCapabilityPolicy(capabilityPolicyEditingId, payload)
              } else {
                await platformClient.createCapabilityPolicy(payload)
              }
            }, mutationSuccessTitle(capabilityPolicyEditingId ? 'update' : 'create', 'capabilityPolicy'), mutationFailureTitle(capabilityPolicyEditingId ? 'update' : 'create', 'capabilityPolicy'))}
          >
            <FormGrid>
              <Field label={fieldLabel('packageCode')}><SelectInput value={capabilityPolicyForm.package_code} onChange={value => setCapabilityPolicyForm(prev => ({ ...prev, package_code: value }))} options={packages.map(item => ({ value: item.code, label: `${item.code} · ${item.name}` }))} placeholder={t('catalog.placeholder.selectPackage')} /></Field>
              <Field label={fieldLabel('capabilityCode')}><SelectInput value={capabilityPolicyForm.capability_code} onChange={value => setCapabilityPolicyForm(prev => ({ ...prev, capability_code: value }))} options={capabilityCodeOptions} /></Field>
              <Field label={fieldLabel('grantValue')}><SelectInput value={capabilityPolicyForm.grant_value} onChange={value => setCapabilityPolicyForm(prev => ({ ...prev, grant_value: value }))} options={templateScopeOptions} /></Field>
              <Field label={fieldLabel('status')}><SelectInput value={capabilityPolicyForm.status} onChange={value => setCapabilityPolicyForm(prev => ({ ...prev, status: value }))} options={statusOptions} /></Field>
            </FormGrid>
            <AdvancedMetadata value={capabilityPolicyForm.metadata} onChange={value => setCapabilityPolicyForm(prev => ({ ...prev, metadata: value }))} />
          </ModalShell>
        )}
      </AnimatePresence>
  )
}
