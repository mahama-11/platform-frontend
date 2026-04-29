import type { TFunction } from 'i18next'

function formatFallbackLabel(value?: string) {
  if (!value) return '-'
  return value
    .trim()
    .replaceAll(/[_.-]+/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase())
}

function formatMajorAmount(amount: number) {
  return (amount / 100).toFixed(2)
}

function getMinorUnitLabel(t: TFunction, currency?: string) {
  if ((currency || '').toUpperCase() === 'CNY') {
    return t('sharedDisplay.money.minorUnit.cny')
  }
  return t('sharedDisplay.money.minorUnit.generic')
}

export function formatMinorMoney(t: TFunction, currency: string | undefined, amount: number | null | undefined) {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return '-'
  const resolvedCurrency = (currency || 'N/A').toUpperCase()
  return t('sharedDisplay.money.amountWithMinor', {
    currency: resolvedCurrency,
    major: formatMajorAmount(amount),
    minor: amount,
    unit: getMinorUnitLabel(t, resolvedCurrency),
  })
}

export function formatMinorUnits(t: TFunction, amount: number | null | undefined, currency?: string) {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return '-'
  return t('sharedDisplay.money.minorOnly', {
    minor: amount,
    unit: getMinorUnitLabel(t, currency),
  })
}

export function formatRateCardPriceSummary(
  t: TFunction,
  currency: string | undefined,
  priceModel: string | undefined,
  priceConfig: string | undefined,
) {
  const parts = [getCatalogPriceModelLabel(t, priceModel)]
  if (!priceConfig) return parts.join(' · ')
  try {
    const parsed = JSON.parse(priceConfig) as { unit_amount?: number; original_unit_amount?: number }
    if (typeof parsed.unit_amount === 'number') {
      parts.push(t('sharedDisplay.money.currentAmount', { value: formatMinorMoney(t, currency, parsed.unit_amount) }))
    }
    if (typeof parsed.original_unit_amount === 'number') {
      parts.push(t('sharedDisplay.money.originalAmount', { value: formatMinorMoney(t, currency, parsed.original_unit_amount) }))
    }
    return parts.join(' · ')
  } catch {
    return parts.join(' · ')
  }
}

export function getBillingStatusLabel(t: TFunction, value?: string) {
  const keyMap: Record<string, string> = {
    active: 'billing.common.status.active',
    inactive: 'billing.common.status.inactive',
    pending: 'billing.common.status.pending',
    processing: 'billing.common.status.processing',
    reserved: 'billing.common.status.reserved',
    finalized: 'billing.common.status.finalized',
    released: 'billing.common.status.released',
    settled: 'billing.common.status.settled',
    applied: 'billing.common.status.applied',
    reversed: 'billing.common.status.reversed',
    succeeded: 'billing.common.status.succeeded',
    failed: 'billing.common.status.failed',
    cancelled: 'billing.common.status.cancelled',
    canceled: 'billing.common.status.cancelled',
  }
  if (!value) return t('billing.common.status.unknown')
  return keyMap[value] ? t(keyMap[value]) : formatFallbackLabel(value)
}

export function getBillingSettlementModeLabel(t: TFunction, value?: string) {
  const keyMap: Record<string, string> = {
    wallet: 'billing.common.mode.wallet',
    quota: 'billing.common.mode.quota',
    credits: 'billing.common.mode.credits',
    allowance: 'billing.common.mode.allowance',
    hybrid: 'billing.common.mode.hybrid',
    direct: 'billing.common.mode.direct',
  }
  if (!value) return t('billing.common.mode.unknown')
  return keyMap[value] ? t(keyMap[value]) : formatFallbackLabel(value)
}

export function getBillingDiscountTypeLabel(t: TFunction, value?: string) {
  const keyMap: Record<string, string> = {
    campaign: 'billing.common.discountType.campaign',
    promotion: 'billing.common.discountType.promotion',
    promo: 'billing.common.discountType.promotion',
    coupon: 'billing.common.discountType.coupon',
    manual: 'billing.common.discountType.manual',
    allowance: 'billing.common.discountType.allowance',
    reward: 'billing.common.discountType.reward',
  }
  if (!value) return t('billing.common.discountType.unknown')
  return keyMap[value] ? t(keyMap[value]) : formatFallbackLabel(value)
}

export function getBillingProductLabel(t: TFunction, value?: string) {
  const keyMap: Record<string, string> = {
    platform: 'billing.common.product.platform',
    menu: 'billing.common.product.menu',
    ecommerce: 'billing.common.product.ecommerce',
  }
  if (!value) return t('billing.common.product.platform')
  return keyMap[value] ? t(keyMap[value]) : formatFallbackLabel(value)
}

export function getBillingResourceTypeLabel(t: TFunction, value?: string) {
  const keyMap: Record<string, string> = {
    runtime_job: 'billing.common.resourceType.runtimeJob',
    image_generation: 'billing.common.resourceType.imageGeneration',
    template_generation: 'billing.common.resourceType.templateGeneration',
    menu_design: 'billing.common.resourceType.menuDesign',
  }
  if (!value) return t('billing.common.resourceType.unknown')
  return keyMap[value] ? t(keyMap[value]) : formatFallbackLabel(value)
}

export function getBillingSourceTypeLabel(t: TFunction, value?: string) {
  const keyMap: Record<string, string> = {
    runtime_job: 'billing.common.sourceType.runtimeJob',
    charge_session: 'billing.common.sourceType.chargeSession',
    organization: 'billing.common.sourceType.organization',
    user: 'billing.common.sourceType.user',
    template: 'billing.common.sourceType.template',
    design: 'billing.common.sourceType.design',
    order: 'billing.common.sourceType.order',
  }
  if (!value) return t('billing.common.sourceType.unknown')
  return keyMap[value] ? t(keyMap[value]) : formatFallbackLabel(value)
}

export function getBillingFieldLabel(t: TFunction, value: string) {
  const keyMap: Record<string, string> = {
    status: 'billing.common.field.status',
    source: 'billing.common.field.source',
    product: 'billing.common.field.product',
    billable_item: 'billing.common.field.billableItem',
    reservation_id: 'billing.common.field.reservationId',
    finalization_id: 'billing.common.field.finalizationId',
    event_id: 'billing.common.field.eventId',
    settlement_id: 'billing.common.field.settlementId',
    mode: 'billing.common.field.mode',
    net_amount: 'billing.common.field.netAmount',
    discount_amount: 'billing.common.field.discountAmount',
    wallet_debited: 'billing.common.field.walletDebited',
    credits_consumed: 'billing.common.field.creditsConsumed',
  }
  return keyMap[value] ? t(keyMap[value]) : formatFallbackLabel(value)
}

export function getRuntimeStatusLabel(t: TFunction, value?: string) {
  const keyMap: Record<string, string> = {
    pending: 'runtime.common.status.pending',
    queued: 'runtime.common.status.queued',
    running: 'runtime.common.status.running',
    succeeded: 'runtime.common.status.succeeded',
    failed: 'runtime.common.status.failed',
    cancelled: 'runtime.common.status.cancelled',
    canceled: 'runtime.common.status.cancelled',
    retrying: 'runtime.common.status.retrying',
  }
  if (!value) return t('runtime.common.status.unknown')
  return keyMap[value] ? t(keyMap[value]) : formatFallbackLabel(value)
}

export function getRuntimeStageLabel(t: TFunction, value?: string) {
  const keyMap: Record<string, string> = {
    queued: 'runtime.common.stage.queued',
    routing: 'runtime.common.stage.routing',
    submitted: 'runtime.common.stage.submitted',
    processing: 'runtime.common.stage.processing',
    finalized: 'runtime.common.stage.finalized',
    completed: 'runtime.common.stage.completed',
    failed: 'runtime.common.stage.failed',
  }
  if (!value) return t('runtime.common.stage.unknown')
  return keyMap[value] ? t(keyMap[value]) : formatFallbackLabel(value)
}

export function getRuntimeTaskTypeLabel(t: TFunction, value?: string) {
  const keyMap: Record<string, string> = {
    image_generation: 'runtime.common.taskType.imageGeneration',
    template_generation: 'runtime.common.taskType.templateGeneration',
    menu_render: 'runtime.common.taskType.menuRender',
    menu_design: 'runtime.common.taskType.menuDesign',
  }
  if (!value) return t('runtime.common.taskType.unknown')
  return keyMap[value] ? t(keyMap[value]) : formatFallbackLabel(value)
}

export function getRuntimeSourceTypeLabel(t: TFunction, value?: string) {
  const keyMap: Record<string, string> = {
    runtime_job: 'runtime.common.sourceType.runtimeJob',
    template: 'runtime.common.sourceType.template',
    design: 'runtime.common.sourceType.design',
    order: 'runtime.common.sourceType.order',
    user: 'runtime.common.sourceType.user',
  }
  if (!value) return t('runtime.common.sourceType.unknown')
  return keyMap[value] ? t(keyMap[value]) : formatFallbackLabel(value)
}

export function getRuntimeProviderLabel(t: TFunction, value?: string) {
  if (!value) return t('runtime.common.provider.binding')
  return formatFallbackLabel(value)
}

export function getRuntimeFieldLabel(t: TFunction, value: string) {
  const keyMap: Record<string, string> = {
    status: 'runtime.common.field.status',
    stage: 'runtime.common.field.stage',
    provider: 'runtime.common.field.provider',
    provider_job_id: 'runtime.common.field.providerJobId',
    source: 'runtime.common.field.source',
    attempts: 'runtime.common.field.attempts',
    organization: 'runtime.common.field.organization',
    charge_session: 'runtime.common.field.chargeSession',
  }
  return keyMap[value] ? t(keyMap[value]) : formatFallbackLabel(value)
}

function getCatalogMappedLabel(
  t: TFunction,
  group: string,
  value: string | undefined,
  keyMap: Record<string, string>,
) {
  if (!value) return t(`catalog.common.${group}.unknown`)
  return keyMap[value] ? t(keyMap[value]) : formatFallbackLabel(value)
}

export function getCatalogStatusLabel(t: TFunction, value?: string) {
  return getCatalogMappedLabel(t, 'status', value, {
    active: 'catalog.common.status.active',
    inactive: 'catalog.common.status.inactive',
    draft: 'catalog.common.status.draft',
  })
}

export function getCatalogSkuTypeLabel(t: TFunction, value?: string) {
  return getCatalogMappedLabel(t, 'skuType', value, {
    subscription: 'catalog.common.skuType.subscription',
    resource_pack: 'catalog.common.skuType.resourcePack',
    promo_pack: 'catalog.common.skuType.promoPack',
  })
}

export function getCatalogBillingModeLabel(t: TFunction, value?: string) {
  return getCatalogMappedLabel(t, 'billingMode', value, {
    recurring: 'catalog.common.billingMode.recurring',
    one_time: 'catalog.common.billingMode.oneTime',
  })
}

export function getCatalogPackageTypeLabel(t: TFunction, value?: string) {
  return getCatalogMappedLabel(t, 'packageType', value, {
    subscription: 'catalog.common.packageType.subscription',
    permanent_pack: 'catalog.common.packageType.permanentPack',
    expiring_pack: 'catalog.common.packageType.expiringPack',
    promo_pack: 'catalog.common.packageType.promoPack',
  })
}

export function getCatalogSettlementModeLabel(t: TFunction, value?: string) {
  return getCatalogMappedLabel(t, 'settlementMode', value, {
    included_then_overage: 'catalog.common.settlementMode.includedThenOverage',
    credits: 'catalog.common.settlementMode.credits',
    quota: 'catalog.common.settlementMode.quota',
    usage_billing: 'catalog.common.settlementMode.usageBilling',
  })
}

export function getCatalogPricingBehaviorLabel(t: TFunction, value?: string) {
  return getCatalogMappedLabel(t, 'pricingBehavior', value, {
    quota_first: 'catalog.common.pricingBehavior.quotaFirst',
    prepaid: 'catalog.common.pricingBehavior.prepaid',
    postpaid: 'catalog.common.pricingBehavior.postpaid',
  })
}

export function getCatalogBillingScopeLabel(t: TFunction, value?: string) {
  return getCatalogMappedLabel(t, 'billingScope', value, {
    organization: 'catalog.common.billingScope.organization',
    user: 'catalog.common.billingScope.user',
  })
}

export function getCatalogRateCardTargetTypeLabel(t: TFunction, value?: string) {
  return getCatalogMappedLabel(t, 'rateCardTargetType', value, {
    sku: 'catalog.common.rateCardTargetType.sku',
    package: 'catalog.common.rateCardTargetType.package',
    billable_item: 'catalog.common.rateCardTargetType.billableItem',
  })
}

export function getCatalogPriceModelLabel(t: TFunction, value?: string) {
  return getCatalogMappedLabel(t, 'priceModel', value, {
    flat: 'catalog.common.priceModel.flat',
    tiered: 'catalog.common.priceModel.tiered',
  })
}

export function getCatalogAssetTypeLabel(t: TFunction, value?: string) {
  return getCatalogMappedLabel(t, 'assetType', value, {
    wallet_credit: 'catalog.common.assetType.walletCredit',
    reward_credit: 'catalog.common.assetType.rewardCredit',
    subscription_allow: 'catalog.common.assetType.subscriptionAllowance',
  })
}

export function getCatalogLifecycleTypeLabel(t: TFunction, value?: string) {
  return getCatalogMappedLabel(t, 'lifecycleType', value, {
    permanent: 'catalog.common.lifecycleType.permanent',
    expiring: 'catalog.common.lifecycleType.expiring',
    cycle_reset: 'catalog.common.lifecycleType.cycleReset',
  })
}

export function getCatalogSubjectTypeLabel(t: TFunction, value?: string) {
  return getCatalogMappedLabel(t, 'subjectType', value, {
    organization: 'catalog.common.subjectType.organization',
    user: 'catalog.common.subjectType.user',
  })
}

export function getCatalogGrantModeLabel(t: TFunction, value?: string) {
  return getCatalogMappedLabel(t, 'grantMode', value, {
    cycle_reset: 'catalog.common.grantMode.cycleReset',
    one_time: 'catalog.common.grantMode.oneTime',
  })
}

export function getCatalogCapabilityCodeLabel(t: TFunction, value?: string) {
  return getCatalogMappedLabel(t, 'capabilityCode', value, {
    template_scope: 'catalog.common.capabilityCode.templateScope',
  })
}

export function getCatalogTemplateScopeLabel(t: TFunction, value?: string) {
  return getCatalogMappedLabel(t, 'templateScope', value, {
    free_templates: 'catalog.common.templateScope.freeTemplates',
    official_templates: 'catalog.common.templateScope.officialTemplates',
    all_templates: 'catalog.common.templateScope.allTemplates',
  })
}
