import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RefreshCcw } from 'lucide-react'
import { motion } from 'framer-motion'

import { useToastStore } from '@/app/store/toastStore'
import { platformClient } from '@/shared/api/platformClient'
import {
  getCatalogAssetTypeLabel,
  getCatalogBillingModeLabel,
  getCatalogBillingScopeLabel,
  getCatalogCapabilityCodeLabel,
  getCatalogGrantModeLabel,
  getCatalogLifecycleTypeLabel,
  getCatalogPackageTypeLabel,
  getCatalogPriceModelLabel,
  getCatalogPricingBehaviorLabel,
  getCatalogRateCardTargetTypeLabel,
  getCatalogSettlementModeLabel,
  getCatalogSkuTypeLabel,
  getCatalogStatusLabel,
  getCatalogSubjectTypeLabel,
  getCatalogTemplateScopeLabel,
} from '@/shared/i18n/helpers'
import { PageHeader } from '@/shared/ui/PageHeader'
import {
  ASSET_TYPE_OPTION_VALUES,
  BILLING_MODE_OPTION_VALUES,
  BILLING_SCOPE_OPTION_VALUES,
  CAPABILITY_CODE_OPTION_VALUES,
  CatalogProductSection,
  LIFECYCLE_OPTION_VALUES,
  PACKAGE_TYPE_OPTION_VALUES,
  PRICE_MODEL_OPTION_VALUES,
  PRICING_BEHAVIOR_OPTION_VALUES,
  QUOTA_GRANT_MODE_OPTION_VALUES,
  RATE_CARD_TARGET_TYPE_OPTION_VALUES,
  secondaryButtonClass,
  SETTLEMENT_MODE_OPTION_VALUES,
  SKU_TYPE_OPTION_VALUES,
  STATUS_OPTION_VALUES,
  SUBJECT_TYPE_OPTION_VALUES,
  TEMPLATE_SCOPE_OPTION_VALUES,
} from './CatalogPage.parts'
import {
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
import { CatalogPageModals } from './CatalogPageModals'
import { CatalogWorkspaceTabs, type CatalogTabKey } from './CatalogWorkspaceTabs'

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

type ModalKind = 'product' | 'sku' | 'package' | 'billable' | 'rate-card' | 'asset' | 'policy' | 'quota-policy' | 'capability-policy'
type CatalogEntityKey = 'product' | 'sku' | 'package' | 'billableItem' | 'rateCard' | 'asset' | 'quotaPolicy' | 'capabilityPolicy' | 'allowancePolicy'
type MutationAction = 'create' | 'update' | 'delete'

export function CatalogPage() {
  const { t } = useTranslation()
  const pushToast = useToastStore(state => state.push)
  const [loading, setLoading] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState('')
  const [activeModal, setActiveModal] = useState<ModalKind | null>(null)
  const [activeTab, setActiveTab] = useState<CatalogTabKey>('sku')
  const [products, setProducts] = useState<ProductRecord[]>([])
  const [skus, setSkus] = useState<SKURecord[]>([])
  const [packages, setPackages] = useState<PackageRecord[]>([])
  const [billableItems, setBillableItems] = useState<BillableItemRecord[]>([])
  const [rateCards, setRateCards] = useState<RateCardRecord[]>([])
  const [assets, setAssets] = useState<AssetDefinitionRecord[]>([])
  const [allowancePolicies, setAllowancePolicies] = useState<AllowancePolicyRecord[]>([])
  const [quotaPolicies, setQuotaPolicies] = useState<QuotaGrantPolicyRecord[]>([])
  const [capabilityPolicies, setCapabilityPolicies] = useState<PackageCapabilityPolicyRecord[]>([])
  const [productEditingId, setProductEditingId] = useState('')
  const [skuEditingId, setSkuEditingId] = useState('')
  const [packageEditingId, setPackageEditingId] = useState('')
  const [billableEditingId, setBillableEditingId] = useState('')
  const [rateCardEditingId, setRateCardEditingId] = useState('')
  const [assetEditingCode, setAssetEditingCode] = useState('')
  const [policyEditingId, setPolicyEditingId] = useState('')
  const [quotaPolicyEditingId, setQuotaPolicyEditingId] = useState('')
  const [capabilityPolicyEditingId, setCapabilityPolicyEditingId] = useState('')
  const [productForm, setProductForm] = useState(defaultProductForm)
  const [skuForm, setSkuForm] = useState(defaultSkuForm)
  const [packageForm, setPackageForm] = useState(defaultPackageForm)
  const [billableForm, setBillableForm] = useState(defaultBillableForm)
  const [rateCardForm, setRateCardForm] = useState(defaultRateCardForm)
  const [assetForm, setAssetForm] = useState(defaultAssetForm)
  const [policyForm, setPolicyForm] = useState(defaultPolicyForm)
  const [quotaPolicyForm, setQuotaPolicyForm] = useState(defaultQuotaPolicyForm)
  const [capabilityPolicyForm, setCapabilityPolicyForm] = useState(defaultCapabilityPolicyForm)

  const selectedProduct = useMemo(
    () => products.find(item => item.id === selectedProductId) ?? null,
    [products, selectedProductId]
  )
  const entityLabel = (key: CatalogEntityKey) => t(`catalog.entity.${key}`)
  const fieldLabel = (key: string) => t(`catalog.field.${key}`)
  const mutationSuccessTitle = (action: MutationAction, entity: CatalogEntityKey) => t(`catalog.toast.${action}Success`, { entity: entityLabel(entity) })
  const mutationFailureTitle = (action: MutationAction, entity: CatalogEntityKey) => t(`catalog.toast.${action}Failed`, { entity: entityLabel(entity) })
  const deleteConfirmMessage = (entity: CatalogEntityKey, target: string) => t('catalog.confirm.delete', { entity: entityLabel(entity), target })
  const requiredFieldError = (fieldKey: string) => new Error(t('catalog.validation.required', { field: fieldLabel(fieldKey) }))
  const statusOptions = useMemo(
    () => STATUS_OPTION_VALUES.map(value => ({ value, label: getCatalogStatusLabel(t, value) })),
    [t],
  )
  const skuTypeOptions = useMemo(
    () => SKU_TYPE_OPTION_VALUES.map(value => ({ value, label: getCatalogSkuTypeLabel(t, value) })),
    [t],
  )
  const billingModeOptions = useMemo(
    () => BILLING_MODE_OPTION_VALUES.map(value => ({ value, label: getCatalogBillingModeLabel(t, value) })),
    [t],
  )
  const packageTypeOptions = useMemo(
    () => PACKAGE_TYPE_OPTION_VALUES.map(value => ({ value, label: getCatalogPackageTypeLabel(t, value) })),
    [t],
  )
  const settlementModeOptions = useMemo(
    () => SETTLEMENT_MODE_OPTION_VALUES.map(value => ({ value, label: getCatalogSettlementModeLabel(t, value) })),
    [t],
  )
  const pricingBehaviorOptions = useMemo(
    () => PRICING_BEHAVIOR_OPTION_VALUES.map(value => ({ value, label: getCatalogPricingBehaviorLabel(t, value) })),
    [t],
  )
  const billingScopeOptions = useMemo(
    () => BILLING_SCOPE_OPTION_VALUES.map(value => ({ value, label: getCatalogBillingScopeLabel(t, value) })),
    [t],
  )
  const rateCardTargetTypeOptions = useMemo(
    () => RATE_CARD_TARGET_TYPE_OPTION_VALUES.map(value => ({ value, label: getCatalogRateCardTargetTypeLabel(t, value) })),
    [t],
  )
  const priceModelOptions = useMemo(
    () => PRICE_MODEL_OPTION_VALUES.map(value => ({ value, label: getCatalogPriceModelLabel(t, value) })),
    [t],
  )
  const assetTypeOptions = useMemo(
    () => ASSET_TYPE_OPTION_VALUES.map(value => ({ value, label: getCatalogAssetTypeLabel(t, value) })),
    [t],
  )
  const lifecycleOptions = useMemo(
    () => LIFECYCLE_OPTION_VALUES.map(value => ({ value, label: getCatalogLifecycleTypeLabel(t, value) })),
    [t],
  )
  const subjectTypeOptions = useMemo(
    () => SUBJECT_TYPE_OPTION_VALUES.map(value => ({ value, label: getCatalogSubjectTypeLabel(t, value) })),
    [t],
  )
  const quotaGrantModeOptions = useMemo(
    () => QUOTA_GRANT_MODE_OPTION_VALUES.map(value => ({ value, label: getCatalogGrantModeLabel(t, value) })),
    [t],
  )
  const capabilityCodeOptions = useMemo(
    () => CAPABILITY_CODE_OPTION_VALUES.map(value => ({ value, label: getCatalogCapabilityCodeLabel(t, value) })),
    [t],
  )
  const templateScopeOptions = useMemo(
    () => TEMPLATE_SCOPE_OPTION_VALUES.map(value => ({ value, label: getCatalogTemplateScopeLabel(t, value) })),
    [t],
  )

  const rateCardTargetOptions = useMemo(() => {
    switch (rateCardForm.target_type) {
      case 'sku':
        return skus.map(item => ({ value: item.id, label: `${item.code} · ${item.name}` }))
      case 'package':
        return packages.map(item => ({ value: item.id, label: `${item.code} · ${item.name}` }))
      case 'billable_item':
        return billableItems.map(item => ({ value: item.id, label: `${item.code} · ${item.name}` }))
      default:
        return []
    }
  }, [billableItems, packages, rateCardForm.target_type, skus])

  function clearCoreData() {
    setSkus([])
    setPackages([])
    setBillableItems([])
    setRateCards([])
    setAssets([])
  }

  function clearPolicyData() {
    setAllowancePolicies([])
    setQuotaPolicies([])
    setCapabilityPolicies([])
  }

  function reportSectionLoadFailure(section: string, err: unknown) {
    pushToast({
      tone: 'error',
      title: t('catalog.toast.loadWorkspaceFailed'),
      description: `${section}: ${err instanceof Error ? err.message : t('catalog.toast.loadWorkspaceFailed')}`,
    })
  }

  async function loadPolicyData(productCode: string) {
    if (!productCode) {
      clearPolicyData()
      return
    }

    const [allowanceResp, quotaPolicyResp, capabilityPolicyResp] = await Promise.allSettled([
      platformClient.allowancePolicies(productCode),
      platformClient.quotaPolicies(productCode),
      platformClient.capabilityPolicies(productCode),
    ])

    if (allowanceResp.status === 'fulfilled') {
      setAllowancePolicies(allowanceResp.value.items)
    } else {
      setAllowancePolicies([])
      reportSectionLoadFailure('Allowance Policy', allowanceResp.reason)
    }

    if (quotaPolicyResp.status === 'fulfilled') {
      setQuotaPolicies(quotaPolicyResp.value.items)
    } else {
      setQuotaPolicies([])
      reportSectionLoadFailure('Quota Policy', quotaPolicyResp.reason)
    }

    if (capabilityPolicyResp.status === 'fulfilled') {
      setCapabilityPolicies(capabilityPolicyResp.value.items)
    } else {
      setCapabilityPolicies([])
      reportSectionLoadFailure('Capability Policy', capabilityPolicyResp.reason)
    }
  }

  async function loadWorkspace(nextProductId?: string) {
    const currentProductId = nextProductId ?? selectedProductId
    setLoading(true)
    try {
      const productResp = await platformClient.catalogProducts()
      const nextProducts = productResp.items
      setProducts(nextProducts)
      const resolvedProductId = currentProductId || nextProducts[0]?.id || ''
      if (resolvedProductId !== selectedProductId) {
        setSelectedProductId(resolvedProductId)
      }
      if (!resolvedProductId) {
        clearCoreData()
        clearPolicyData()
        return
      }
      const currentProduct = nextProducts.find(item => item.id === resolvedProductId)
      const currentProductCode = currentProduct?.code ?? ''

      const [skuResp, packageResp, billableResp, rateCardResp, assetResp] = await Promise.allSettled([
        platformClient.catalogSkus(resolvedProductId),
        platformClient.catalogPackages(resolvedProductId),
        platformClient.catalogBillableItems(resolvedProductId),
        platformClient.catalogRateCards(resolvedProductId),
        platformClient.walletAssets(currentProductCode),
      ])

      if (skuResp.status === 'fulfilled') {
        setSkus(skuResp.value.items)
      } else {
        setSkus([])
        reportSectionLoadFailure('SKU', skuResp.reason)
      }

      if (packageResp.status === 'fulfilled') {
        setPackages(packageResp.value.items)
      } else {
        setPackages([])
        reportSectionLoadFailure('Package', packageResp.reason)
      }

      if (billableResp.status === 'fulfilled') {
        setBillableItems(billableResp.value.items)
      } else {
        setBillableItems([])
        reportSectionLoadFailure('Billable Item', billableResp.reason)
      }

      if (rateCardResp.status === 'fulfilled') {
        setRateCards(rateCardResp.value.items)
      } else {
        setRateCards([])
        reportSectionLoadFailure('Rate Card', rateCardResp.reason)
      }

      if (assetResp.status === 'fulfilled') {
        setAssets(assetResp.value.items)
      } else {
        setAssets([])
        reportSectionLoadFailure('Asset Definition', assetResp.reason)
      }

      void loadPolicyData(currentProductCode)
    } catch (err) {
      pushToast({ tone: 'error', title: t('catalog.toast.loadWorkspaceFailed'), description: err instanceof Error ? err.message : t('catalog.toast.loadWorkspaceFailed') })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadWorkspace()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!selectedProductId) return
    void loadWorkspace(selectedProductId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProductId])

  async function handleMutation(action: () => Promise<void>, successTitle: string, failureTitle?: string) {
    try {
      await action()
      pushToast({ tone: 'success', title: successTitle })
      closeModal()
      await loadWorkspace(selectedProductId)
    } catch (err) {
      pushToast({ tone: 'error', title: failureTitle || t('catalog.toast.operationFailed'), description: err instanceof Error ? err.message : t('catalog.toast.operationFailed') })
    }
  }

  function closeModal() {
    setActiveModal(null)
    resetProductForm()
    resetSkuForm()
    resetPackageForm()
    resetBillableForm()
    resetRateCardForm()
    resetAssetForm()
    resetPolicyForm()
    resetQuotaPolicyForm()
    resetCapabilityPolicyForm()
  }

  function resetProductForm() {
    setProductEditingId('')
    setProductForm(defaultProductForm)
  }

  function resetSkuForm() {
    setSkuEditingId('')
    setSkuForm(defaultSkuForm)
  }

  function resetPackageForm() {
    setPackageEditingId('')
    setPackageForm(defaultPackageForm)
  }

  function resetBillableForm() {
    setBillableEditingId('')
    setBillableForm(defaultBillableForm)
  }

  function resetRateCardForm() {
    setRateCardEditingId('')
    setRateCardForm({ code: '', target_type: 'sku', target_id: '', price_model: 'flat', currency: 'CNY', price_config: '{"unit_amount": 0}', effective_from: '', effective_to: '', version: '1', status: 'active', metadata: '' })
  }

  function resetAssetForm() {
    setAssetEditingCode('')
    setAssetForm(defaultAssetForm)
  }

  function resetPolicyForm() {
    setPolicyEditingId('')
    setPolicyForm(defaultPolicyForm)
  }

  function resetQuotaPolicyForm() {
    setQuotaPolicyEditingId('')
    setQuotaPolicyForm(defaultQuotaPolicyForm)
  }

  function resetCapabilityPolicyForm() {
    setCapabilityPolicyEditingId('')
    setCapabilityPolicyForm(defaultCapabilityPolicyForm)
  }

  function openProductModal(item?: ProductRecord) {
    if (item) {
      setProductEditingId(item.id)
      setProductForm({ code: item.code, name: item.name, status: item.status, owner_team: item.owner_team || '', metadata: item.metadata || '' })
    } else {
      resetProductForm()
    }
    setActiveModal('product')
  }

  function openSkuModal(item?: SKURecord) {
    if (item) {
      setSkuEditingId(item.id)
      setSkuForm({ code: item.code, name: item.name, sku_type: item.sku_type, billing_mode: item.billing_mode, currency: item.currency, list_price: String(item.list_price), status: item.status, metadata: item.metadata || '' })
    } else {
      resetSkuForm()
    }
    setActiveModal('sku')
  }

  function openPackageModal(item?: PackageRecord) {
    if (item) {
      setPackageEditingId(item.id)
      setPackageForm({ code: item.code, name: item.name, package_type: item.package_type, status: item.status, metadata: item.metadata || '' })
    } else {
      resetPackageForm()
    }
    setActiveModal('package')
  }

  function openBillableModal(item?: BillableItemRecord) {
    if (item) {
      setBillableEditingId(item.id)
      setBillableForm({ code: item.code, name: item.name, meter_unit: item.meter_unit, billing_scope: item.billing_scope, settlement_mode: item.settlement_mode, pricing_behavior: item.pricing_behavior, status: item.status, metadata: item.metadata || '' })
    } else {
      resetBillableForm()
    }
    setActiveModal('billable')
  }

  function openRateCardModal(item?: RateCardRecord) {
    if (item) {
      setRateCardEditingId(item.id)
      setRateCardForm({
        code: item.code,
        target_type: item.target_type,
        target_id: item.target_id,
        price_model: item.price_model,
        currency: item.currency,
        price_config: item.price_config || '',
        effective_from: toIsoDateTimeInput(item.effective_from),
        effective_to: toIsoDateTimeInput(item.effective_to),
        version: String(item.version),
        status: item.status,
        metadata: item.metadata || '',
      })
    } else {
      resetRateCardForm()
    }
    setActiveModal('rate-card')
  }

  function openAssetModal(item?: AssetDefinitionRecord) {
    if (item) {
      setAssetEditingCode(item.asset_code)
      setAssetForm({
        asset_code: item.asset_code,
        asset_type: item.asset_type,
        lifecycle_type: item.lifecycle_type,
        default_expire_days: String(item.default_expire_days ?? 0),
        reset_cycle: item.reset_cycle || '',
        status: item.status,
        description: item.description || '',
        metadata: item.metadata || '',
      })
    } else {
      resetAssetForm()
    }
    setActiveModal('asset')
  }

  function openPolicyModal(item?: AllowancePolicyRecord) {
    if (item) {
      setPolicyEditingId(item.id)
      setPolicyForm({
        billing_subject_type: item.billing_subject_type,
        billing_subject_id: item.billing_subject_id,
        asset_code: item.asset_code,
        amount: String(item.amount),
        reset_cycle: item.reset_cycle || '',
        status: item.status,
        effective_from: toIsoDateTimeInput(item.effective_from),
        effective_to: toIsoDateTimeInput(item.effective_to),
        metadata: item.metadata || '',
      })
    } else {
      resetPolicyForm()
    }
    setActiveModal('policy')
  }

  function openQuotaPolicyModal(item?: QuotaGrantPolicyRecord) {
    if (item) {
      setQuotaPolicyEditingId(item.id)
      setQuotaPolicyForm({
        package_code: item.package_code,
        billable_item_code: item.billable_item_code,
        grant_mode: item.grant_mode,
        units: String(item.units),
        reset_cycle: item.reset_cycle || '',
        status: item.status,
        metadata: item.metadata || '',
      })
    } else {
      resetQuotaPolicyForm()
    }
    setActiveModal('quota-policy')
  }

  function openCapabilityPolicyModal(item?: PackageCapabilityPolicyRecord) {
    if (item) {
      setCapabilityPolicyEditingId(item.id)
      setCapabilityPolicyForm({
        package_code: item.package_code,
        capability_code: item.capability_code,
        grant_value: item.grant_value,
        status: item.status,
        metadata: item.metadata || '',
      })
    } else {
      resetCapabilityPolicyForm()
    }
    setActiveModal('capability-policy')
  }

  function requireSelectedProduct() {
    if (!selectedProduct) {
      throw new Error(t('catalog.validation.selectProductFirst'))
    }
    return selectedProduct
  }

  function validateProductForm() {
    if (!productForm.code.trim()) throw requiredFieldError('productCode')
    if (!productForm.name.trim()) throw requiredFieldError('name')
  }

  function validateSkuForm() {
    if (!skuForm.code.trim()) throw requiredFieldError('skuCode')
    if (!skuForm.name.trim()) throw requiredFieldError('skuName')
    if (!skuForm.sku_type.trim()) throw requiredFieldError('skuType')
    if (!skuForm.billing_mode.trim()) throw requiredFieldError('billingMode')
  }

  function validatePackageForm() {
    if (!packageForm.code.trim()) throw requiredFieldError('packageCode')
    if (!packageForm.name.trim()) throw requiredFieldError('packageName')
    if (!packageForm.package_type.trim()) throw requiredFieldError('packageType')
  }

  function validateBillableForm() {
    if (!billableForm.code.trim()) throw requiredFieldError('billableItemCode')
    if (!billableForm.name.trim()) throw requiredFieldError('billableItemName')
    if (!billableForm.meter_unit.trim()) throw requiredFieldError('meterUnit')
    if (!billableForm.billing_scope.trim()) throw requiredFieldError('billingScope')
    if (!billableForm.settlement_mode.trim()) throw requiredFieldError('settlementMode')
    if (!billableForm.pricing_behavior.trim()) throw requiredFieldError('pricingBehavior')
  }

  function validateRateCardForm() {
    if (!rateCardForm.code.trim()) throw requiredFieldError('rateCardCode')
    if (!rateCardForm.target_type.trim()) throw requiredFieldError('targetType')
    if (!rateCardForm.target_id.trim()) throw requiredFieldError('targetId')
    if (!rateCardForm.price_model.trim()) throw requiredFieldError('priceModel')
  }

  function validateAssetForm() {
    if (!assetForm.asset_code.trim()) throw requiredFieldError('assetCode')
    if (!assetForm.asset_type.trim()) throw requiredFieldError('assetType')
    if (!assetForm.lifecycle_type.trim()) throw requiredFieldError('lifecycle')
  }

  function validatePolicyForm() {
    if (!policyForm.billing_subject_type.trim()) throw requiredFieldError('subjectType')
    if (!policyForm.billing_subject_id.trim()) throw requiredFieldError('subjectId')
    if (!policyForm.asset_code.trim()) throw requiredFieldError('assetCode')
  }

  function validateQuotaPolicyForm() {
    if (!quotaPolicyForm.package_code.trim()) throw requiredFieldError('packageCode')
    if (!quotaPolicyForm.billable_item_code.trim()) throw requiredFieldError('billableItemCode')
    if (!quotaPolicyForm.grant_mode.trim()) throw requiredFieldError('grantMode')
  }

  function validateCapabilityPolicyForm() {
    if (!capabilityPolicyForm.package_code.trim()) throw requiredFieldError('packageCode')
    if (!capabilityPolicyForm.capability_code.trim()) throw requiredFieldError('capabilityCode')
    if (!capabilityPolicyForm.grant_value.trim()) throw requiredFieldError('grantValue')
  }

  function toIsoDateTimeInput(value?: string) {
    if (!value) return ''
    return value.slice(0, 16)
  }

  function toRfc3339(value: string) {
    if (!value) return ''
    return new Date(value).toISOString()
  }

  const pageActions = (
    <button
      type="button"
      className={secondaryButtonClass}
      onClick={() => void loadWorkspace(selectedProductId)}
      disabled={loading}
    >
      <RefreshCcw size={16} className={`shrink-0 ${loading ? 'animate-spin' : ''}`} />
      <span className="truncate">{t('catalog.action.refresh')}</span>
    </button>
  )

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } }
  const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }

  return (<motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="flex w-full min-w-0 flex-col gap-8"
    >
      <motion.div variants={itemVariants} className="min-w-0"><PageHeader
          title={t('catalog.title')}
          description={t('catalog.page.description')}
          actions={pageActions}
        />
      </motion.div>

      <CatalogProductSection
        itemVariants={itemVariants} products={products} selectedProduct={selectedProduct}
        selectedProductId={selectedProductId} t={t} entityLabel={entityLabel}
        openProductModal={openProductModal} deleteConfirmMessage={deleteConfirmMessage}
        handleMutation={handleMutation} mutationSuccessTitle={mutationSuccessTitle}
        mutationFailureTitle={mutationFailureTitle} setSelectedProductId={setSelectedProductId}
      />

      <CatalogWorkspaceTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        t={t}
        selectedProduct={selectedProduct}
        skus={skus}
        packages={packages}
        billableItems={billableItems}
        rateCards={rateCards}
        assets={assets}
        allowancePolicies={allowancePolicies}
        quotaPolicies={quotaPolicies}
        capabilityPolicies={capabilityPolicies}
        entityLabel={entityLabel}
        openSkuModal={openSkuModal}
        openPackageModal={openPackageModal}
        openBillableModal={openBillableModal}
        openRateCardModal={openRateCardModal}
        openAssetModal={openAssetModal}
        openPolicyModal={openPolicyModal}
        openQuotaPolicyModal={openQuotaPolicyModal}
        openCapabilityPolicyModal={openCapabilityPolicyModal}
        deleteConfirmMessage={deleteConfirmMessage}
        handleMutation={handleMutation}
        mutationSuccessTitle={mutationSuccessTitle}
        mutationFailureTitle={mutationFailureTitle}
      />

      <CatalogPageModals
        activeModal={activeModal}
        productEditingId={productEditingId}
        skuEditingId={skuEditingId}
        packageEditingId={packageEditingId}
        billableEditingId={billableEditingId}
        rateCardEditingId={rateCardEditingId}
        assetEditingCode={assetEditingCode}
        policyEditingId={policyEditingId}
        quotaPolicyEditingId={quotaPolicyEditingId}
        capabilityPolicyEditingId={capabilityPolicyEditingId}
        productForm={productForm}
        skuForm={skuForm}
        packageForm={packageForm}
        billableForm={billableForm}
        rateCardForm={rateCardForm}
        assetForm={assetForm}
        policyForm={policyForm}
        quotaPolicyForm={quotaPolicyForm}
        capabilityPolicyForm={capabilityPolicyForm}
        setProductForm={setProductForm}
        setSkuForm={setSkuForm}
        setPackageForm={setPackageForm}
        setBillableForm={setBillableForm}
        setRateCardForm={setRateCardForm}
        setAssetForm={setAssetForm}
        setPolicyForm={setPolicyForm}
        setQuotaPolicyForm={setQuotaPolicyForm}
        setCapabilityPolicyForm={setCapabilityPolicyForm}
        statusOptions={statusOptions}
        skuTypeOptions={skuTypeOptions}
        billingModeOptions={billingModeOptions}
        packageTypeOptions={packageTypeOptions}
        billingScopeOptions={billingScopeOptions}
        settlementModeOptions={settlementModeOptions}
        pricingBehaviorOptions={pricingBehaviorOptions}
        rateCardTargetTypeOptions={rateCardTargetTypeOptions}
        rateCardTargetOptions={rateCardTargetOptions}
        priceModelOptions={priceModelOptions}
        assetTypeOptions={assetTypeOptions}
        lifecycleOptions={lifecycleOptions}
        subjectTypeOptions={subjectTypeOptions}
        assets={assets}
        packages={packages}
        billableItems={billableItems}
        quotaGrantModeOptions={quotaGrantModeOptions}
        capabilityCodeOptions={capabilityCodeOptions}
        templateScopeOptions={templateScopeOptions}
        t={t}
        entityLabel={entityLabel}
        fieldLabel={fieldLabel}
        closeModal={closeModal}
        handleMutation={handleMutation}
        validateProductForm={validateProductForm}
        validateSkuForm={validateSkuForm}
        validatePackageForm={validatePackageForm}
        validateBillableForm={validateBillableForm}
        validateRateCardForm={validateRateCardForm}
        validateAssetForm={validateAssetForm}
        validatePolicyForm={validatePolicyForm}
        validateQuotaPolicyForm={validateQuotaPolicyForm}
        validateCapabilityPolicyForm={validateCapabilityPolicyForm}
        mutationSuccessTitle={mutationSuccessTitle}
        mutationFailureTitle={mutationFailureTitle}
        requireSelectedProduct={requireSelectedProduct}
        toRfc3339={toRfc3339}
      />
    </motion.div>
  )
}
