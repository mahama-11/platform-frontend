import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, RefreshCcw, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

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
  formatMinorMoney,
  formatRateCardPriceSummary,
} from '@/shared/i18n/helpers'
import { PageHeader } from '@/shared/ui/PageHeader'
import { SectionCard } from '@/shared/ui/SectionCard'
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
  const [activeTab, setActiveTab] = useState<'sku' | 'package' | 'billable' | 'rate-card' | 'asset' | 'policy' | 'api'>('sku')
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
  const [productForm, setProductForm] = useState({ code: '', name: '', status: 'active', owner_team: '', metadata: '' })
  const [skuForm, setSkuForm] = useState({ code: '', name: '', sku_type: 'subscription', billing_mode: 'recurring', currency: 'CNY', list_price: '0', status: 'active', metadata: '' })
  const [packageForm, setPackageForm] = useState({ code: '', name: '', package_type: 'subscription', status: 'active', metadata: '' })
  const [billableForm, setBillableForm] = useState({ code: '', name: '', meter_unit: 'call', billing_scope: 'organization', settlement_mode: 'included_then_overage', pricing_behavior: 'quota_first', status: 'active', metadata: '' })
  const [rateCardForm, setRateCardForm] = useState({ code: '', target_type: 'sku', target_id: '', price_model: 'flat', currency: 'CNY', price_config: '{"unit_amount": 0}', effective_from: '', effective_to: '', version: '1', status: 'active', metadata: '' })
  const [assetForm, setAssetForm] = useState({ asset_code: '', asset_type: 'wallet_credit', lifecycle_type: 'permanent', default_expire_days: '0', reset_cycle: '', status: 'active', description: '', metadata: '' })
  const [policyForm, setPolicyForm] = useState({ billing_subject_type: 'organization', billing_subject_id: '', asset_code: '', amount: '0', reset_cycle: 'monthly', status: 'active', effective_from: '', effective_to: '', metadata: '' })
  const [quotaPolicyForm, setQuotaPolicyForm] = useState({ package_code: '', billable_item_code: '', grant_mode: 'cycle_reset', units: '0', reset_cycle: 'monthly', status: 'active', metadata: '' })
  const [capabilityPolicyForm, setCapabilityPolicyForm] = useState({ package_code: '', capability_code: 'template_scope', grant_value: 'free_templates', status: 'active', metadata: '' })

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
    setProductForm({ code: '', name: '', status: 'active', owner_team: '', metadata: '' })
  }

  function resetSkuForm() {
    setSkuEditingId('')
    setSkuForm({ code: '', name: '', sku_type: 'subscription', billing_mode: 'recurring', currency: 'CNY', list_price: '0', status: 'active', metadata: '' })
  }

  function resetPackageForm() {
    setPackageEditingId('')
    setPackageForm({ code: '', name: '', package_type: 'subscription', status: 'active', metadata: '' })
  }

  function resetBillableForm() {
    setBillableEditingId('')
    setBillableForm({ code: '', name: '', meter_unit: 'call', billing_scope: 'organization', settlement_mode: 'included_then_overage', pricing_behavior: 'quota_first', status: 'active', metadata: '' })
  }

  function resetRateCardForm() {
    setRateCardEditingId('')
    setRateCardForm({ code: '', target_type: 'sku', target_id: '', price_model: 'flat', currency: 'CNY', price_config: '{"unit_amount": 0}', effective_from: '', effective_to: '', version: '1', status: 'active', metadata: '' })
  }

  function resetAssetForm() {
    setAssetEditingCode('')
    setAssetForm({ asset_code: '', asset_type: 'wallet_credit', lifecycle_type: 'permanent', default_expire_days: '0', reset_cycle: '', status: 'active', description: '', metadata: '' })
  }

  function resetPolicyForm() {
    setPolicyEditingId('')
    setPolicyForm({ billing_subject_type: 'organization', billing_subject_id: '', asset_code: '', amount: '0', reset_cycle: 'monthly', status: 'active', effective_from: '', effective_to: '', metadata: '' })
  }

  function resetQuotaPolicyForm() {
    setQuotaPolicyEditingId('')
    setQuotaPolicyForm({ package_code: '', billable_item_code: '', grant_mode: 'cycle_reset', units: '0', reset_cycle: 'monthly', status: 'active', metadata: '' })
  }

  function resetCapabilityPolicyForm() {
    setCapabilityPolicyEditingId('')
    setCapabilityPolicyForm({ package_code: '', capability_code: 'template_scope', grant_value: 'free_templates', status: 'active', metadata: '' })
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

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  }

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="flex w-full min-w-0 flex-col gap-8"
    >
      <motion.div variants={itemVariants} className="min-w-0">
        <PageHeader
          title={t('catalog.title')}
          description={t('catalog.page.description')}
          actions={pageActions}
        />
      </motion.div>

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


      <motion.div variants={itemVariants} className="min-w-0 flex flex-col gap-6">
        <div className="flex w-full min-w-0 overflow-x-auto border-b border-white/10">
          <div className="flex min-w-0 shrink-0 gap-6">
            {[
              { id: 'sku', label: 'SKU' },
              { id: 'package', label: 'Package' },
              { id: 'billable', label: 'Billable Item' },
              { id: 'rate-card', label: 'Rate Card' },
              { id: 'asset', label: 'Asset Definition' },
              { id: 'policy', label: 'Allowance Policy' },
              { id: 'api', label: t('catalog.page.section.apiTitle') },
            ].map(tab => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
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

        <div className="min-w-0 relative">
          <AnimatePresence mode="wait">
            {activeTab === 'sku' && (
              <motion.div key="tab-sku" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }} className="min-w-0">
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
              <motion.div key="tab-package" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }} className="min-w-0">
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
              <motion.div key="tab-billable" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }} className="min-w-0">
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
              <motion.div key="tab-rate-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }} className="min-w-0">
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
              <motion.div key="tab-asset" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }} className="min-w-0">
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
              <motion.div key="tab-api" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }} className="min-w-0">
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
    </motion.div>
  )
}

const primaryButtonClass = 'inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-950 transition-all hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60 shrink-0'
const secondaryButtonClass = 'inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition-all hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60 shrink-0'
const actionButtonClass = 'inline-flex items-center justify-center rounded-lg border border-white/10 bg-transparent px-3 py-1.5 text-xs font-medium text-slate-300 transition-all hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60 shrink-0'
const dangerButtonClass = 'inline-flex items-center justify-center rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-400 transition-all hover:bg-rose-500/20 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-60 shrink-0'

const STATUS_OPTION_VALUES = ['active', 'inactive', 'draft']
const SKU_TYPE_OPTION_VALUES = ['subscription', 'resource_pack', 'promo_pack']
const BILLING_MODE_OPTION_VALUES = ['recurring', 'one_time']
const PACKAGE_TYPE_OPTION_VALUES = ['subscription', 'permanent_pack', 'expiring_pack', 'promo_pack']
const SETTLEMENT_MODE_OPTION_VALUES = ['included_then_overage', 'credits', 'quota', 'usage_billing']
const PRICING_BEHAVIOR_OPTION_VALUES = ['quota_first', 'prepaid', 'postpaid']
const BILLING_SCOPE_OPTION_VALUES = ['organization', 'user']
const RATE_CARD_TARGET_TYPE_OPTION_VALUES = ['sku', 'package', 'billable_item']
const PRICE_MODEL_OPTION_VALUES = ['flat', 'tiered']
const ASSET_TYPE_OPTION_VALUES = ['wallet_credit', 'reward_credit', 'subscription_allow']
const LIFECYCLE_OPTION_VALUES = ['permanent', 'expiring', 'cycle_reset']
const SUBJECT_TYPE_OPTION_VALUES = ['organization', 'user']
const QUOTA_GRANT_MODE_OPTION_VALUES = ['cycle_reset', 'one_time']
const CAPABILITY_CODE_OPTION_VALUES = ['template_scope']
const TEMPLATE_SCOPE_OPTION_VALUES = ['free_templates', 'official_templates', 'all_templates']

function ListHeader({
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

function ModalShell({
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

function AdvancedMetadata({ value, onChange }: { value: string; onChange: (value: string) => void }) {
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

function CodePanel({ children }: { children: string }) {
  return (
    <pre className="w-full min-w-0 overflow-x-auto rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm font-mono text-slate-300">
      {children}
    </pre>
  )
}

function FormGrid({ children }: { children: ReactNode }) {
  return <div className="grid w-full min-w-0 gap-5 md:grid-cols-2">{children}</div>
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex w-full min-w-0 flex-col gap-1.5">
      <span className="truncate text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</span>
      {children}
    </label>
  )
}

function TextInput({
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

function TextAreaInput({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
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

function SelectInput({
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

function RecordList({
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
