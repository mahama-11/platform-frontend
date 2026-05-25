import { env } from '@/shared/config/env'
import { openProtectedResource, request, requestText } from '@/shared/api/http'
import type {
  AuthResult,
  MePermissionsResult,
  OrganizationMembersResult,
  PermissionsResult,
  PlatformOrganizationsResult,
  PlatformUsersResult,
  RolePermissionsResult,
  RolesResult,
  SwitchOrgResult,
  UserProfile,
} from '@/shared/types/auth'
import type { AllowancePolicyRecord, AssetDefinitionRecord, AssetRecord, AuditLogRecord, AuditLogsResult, BatchUploadAssetsResult, BillableItemRecord, ChargeSession, ChargeSessionsResult, DiscountLedger, ErrorCodesDoc, InternalAccessDoc, OfferingsView, PackageCapabilityPolicyRecord, PackageRecord, PreparedAssetImportResult, PreparedTemplateOpsImportBundle, ProductRecord, QuotaGrantPolicyRecord, RateCardRecord, RuntimeJobDetail, RuntimeJobsResult, SettlementRecord, SKURecord, TemplateAssetBindingsResult, TemplateOpsCatalogDetail, TemplateOpsCatalogResult, TemplateOpsImportPreviewResult, WalletSummary } from '@/shared/types/platform'

export const platformClient = {
  login: (email: string, password: string) =>
    request<AuthResult>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<UserProfile>('/auth/me'),
  organizations: () => request<Array<{ id: string; name: string; role: string }>>('/orgs'),
  opsOrganizations: (input: { query?: string; status?: string; limit?: number; offset?: number } = {}) => {
    const params = new URLSearchParams()
    if (input.query) params.set('query', input.query)
    if (input.status) params.set('status', input.status)
    params.set('limit', String(input.limit ?? 20))
    params.set('offset', String(input.offset ?? 0))
    return request<PlatformOrganizationsResult>(`/ops/organizations?${params.toString()}`)
  },
  switchOrganization: (organizationId: string) =>
    request<SwitchOrgResult>('/orgs/switch', {
      method: 'POST',
      body: JSON.stringify({ organization_id: organizationId }),
    }),
  myPermissions: () => request<MePermissionsResult>('/access/permissions/me'),
  accessPermissions: (input: { query?: string; limit?: number; offset?: number } = {}) => {
    const params = new URLSearchParams()
    if (input.query) params.set('query', input.query)
    params.set('limit', String(input.limit ?? 50))
    params.set('offset', String(input.offset ?? 0))
    return request<PermissionsResult>(`/access/permissions?${params.toString()}`)
  },
  createAccessPermission: (payload: Record<string, unknown>) => request('/access/permissions', { method: 'POST', body: JSON.stringify(payload) }),
  updateAccessPermission: (permissionId: string, payload: Record<string, unknown>) => request(`/access/permissions/${encodeURIComponent(permissionId)}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteAccessPermission: (permissionId: string) => request(`/access/permissions/${encodeURIComponent(permissionId)}`, { method: 'DELETE' }),
  accessRoles: (input: { query?: string; limit?: number; offset?: number } = {}) => {
    const params = new URLSearchParams()
    if (input.query) params.set('query', input.query)
    params.set('limit', String(input.limit ?? 50))
    params.set('offset', String(input.offset ?? 0))
    return request<RolesResult>(`/access/roles?${params.toString()}`)
  },
  createAccessRole: (payload: Record<string, unknown>) => request('/access/roles', { method: 'POST', body: JSON.stringify(payload) }),
  updateAccessRole: (roleId: string, payload: Record<string, unknown>) => request(`/access/roles/${encodeURIComponent(roleId)}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteAccessRole: (roleId: string) => request(`/access/roles/${encodeURIComponent(roleId)}`, { method: 'DELETE' }),
  rolePermissions: (roleId: string) => request<RolePermissionsResult>(`/access/roles/${encodeURIComponent(roleId)}/permissions`),
  setRolePermissions: (roleId: string, permissionIds: string[]) => request<RolePermissionsResult>(`/access/roles/${encodeURIComponent(roleId)}/permissions`, { method: 'PUT', body: JSON.stringify({ permission_ids: permissionIds }) }),
  opsUsers: (input: { query?: string; status?: string; limit?: number; offset?: number } = {}) => {
    const params = new URLSearchParams()
    if (input.query) params.set('query', input.query)
    if (input.status) params.set('status', input.status)
    params.set('limit', String(input.limit ?? 20))
    params.set('offset', String(input.offset ?? 0))
    return request<PlatformUsersResult>(`/ops/users?${params.toString()}`)
  },
  createOpsUser: (payload: Record<string, unknown>) => request('/ops/users', { method: 'POST', body: JSON.stringify(payload) }),
  updateOpsUser: (userId: string, payload: Record<string, unknown>) => request(`/ops/users/${encodeURIComponent(userId)}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteOpsUser: (userId: string) => request(`/ops/users/${encodeURIComponent(userId)}`, { method: 'DELETE' }),
  createOpsOrganization: (payload: Record<string, unknown>) => request('/ops/organizations', { method: 'POST', body: JSON.stringify(payload) }),
  updateOpsOrganization: (orgId: string, payload: Record<string, unknown>) => request(`/ops/organizations/${encodeURIComponent(orgId)}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteOpsOrganization: (orgId: string) => request(`/ops/organizations/${encodeURIComponent(orgId)}`, { method: 'DELETE' }),
  organizationMembers: (orgId: string) => request<OrganizationMembersResult>(`/ops/organizations/${encodeURIComponent(orgId)}/members`),
  createOrganizationMember: (orgId: string, payload: Record<string, unknown>) => request(`/ops/organizations/${encodeURIComponent(orgId)}/members`, { method: 'POST', body: JSON.stringify(payload) }),
  updateOrganizationMember: (orgId: string, userId: string, payload: Record<string, unknown>) => request(`/ops/organizations/${encodeURIComponent(orgId)}/members/${encodeURIComponent(userId)}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteOrganizationMember: (orgId: string, userId: string) => request(`/ops/organizations/${encodeURIComponent(orgId)}/members/${encodeURIComponent(userId)}`, { method: 'DELETE' }),
  walletSummary: (billingSubjectType: string, billingSubjectId: string, productCode = '') => {
    const params = new URLSearchParams({
      billing_subject_type: billingSubjectType,
      billing_subject_id: billingSubjectId,
    })
    if (productCode) params.set('product_code', productCode)
    return request<WalletSummary>(`/wallet/summary?${params.toString()}`)
  },
  catalogProducts: () => request<{ items: ProductRecord[] }>('/catalog/products'),
  catalogOfferings: (productCode: string) => request<OfferingsView>(`/catalog/offerings?product_code=${encodeURIComponent(productCode)}`),
  templateOpsCatalog: (input: { productCode?: string; query?: string; locale?: string; limit?: number; offset?: number } = {}) => {
    const params = new URLSearchParams()
    if (input.productCode) params.set('product_code', input.productCode)
    if (input.query) params.set('query', input.query)
    if (input.locale) params.set('locale', input.locale)
    params.set('limit', String(input.limit ?? 50))
    params.set('offset', String(input.offset ?? 0))
    return request<TemplateOpsCatalogResult>(`/template-ops/catalog?${params.toString()}`)
  },
  templateOpsDetail: (templateRef: string, locale = 'zh') =>
    request<TemplateOpsCatalogDetail>(`/template-ops/catalog/${encodeURIComponent(templateRef)}?locale=${encodeURIComponent(locale)}`),
  syncTemplateOpsCatalog: (productCode?: string, locale = 'zh') => {
    const params = new URLSearchParams()
    if (productCode) params.set('product_code', productCode)
    params.set('locale', locale)
    return request<TemplateOpsCatalogResult>(`/template-ops/sync?${params.toString()}`, { method: 'POST' })
  },
  createTemplateOpsCatalog: (payload: Record<string, unknown>) => request<TemplateOpsCatalogDetail>('/template-ops/catalog', { method: 'POST', body: JSON.stringify(payload) }),
  updateTemplateOpsCatalog: (templateRef: string, payload: Record<string, unknown>) => request<TemplateOpsCatalogDetail>(`/template-ops/catalog/${encodeURIComponent(templateRef)}`, { method: 'PUT', body: JSON.stringify(payload) }),
  templateOpsAssets: (templateRef: string) => request<TemplateAssetBindingsResult>(`/template-ops/catalog/${encodeURIComponent(templateRef)}/assets`),
  upsertTemplateOpsAsset: (templateRef: string, assetRole: string, payload: Record<string, unknown>) =>
    request<TemplateAssetBindingsResult>(`/template-ops/catalog/${encodeURIComponent(templateRef)}/assets/${encodeURIComponent(assetRole)}`, { method: 'PUT', body: JSON.stringify(payload) }),
  unbindTemplateOpsAsset: (templateRef: string, assetRole: string) =>
    request<TemplateAssetBindingsResult>(`/template-ops/catalog/${encodeURIComponent(templateRef)}/assets/${encodeURIComponent(assetRole)}`, { method: 'DELETE' }),
  publishTemplateOpsCatalog: (templateRef: string) => request<TemplateOpsCatalogDetail>(`/template-ops/catalog/${encodeURIComponent(templateRef)}/publish`, { method: 'POST' }),
  importTemplateOpsCSV: (content: string, publish = false) =>
    request<{ imported_count: number; published_count: number; rows: Array<{ row: number; template_ref: string; action: string; error?: string }> }>(
      '/template-ops/import/csv',
      { method: 'POST', body: JSON.stringify({ content, publish }) },
    ),
  previewTemplateOpsCSVImport: (content: string) =>
    request<TemplateOpsImportPreviewResult>(
      '/template-ops/import/csv/preview',
      { method: 'POST', body: JSON.stringify({ content }) },
    ),
  importPreparedTemplateOpsAssets: (onlyMissing = true) =>
    request<PreparedAssetImportResult>(
      '/template-ops/import/assets/prepared',
      { method: 'POST', body: JSON.stringify({ only_missing: onlyMissing }) },
    ),
  batchUploadTemplateOpsAssets: (items: Array<Record<string, unknown>>) =>
    request<BatchUploadAssetsResult>(
      '/template-ops/import/assets/upload',
      { method: 'POST', body: JSON.stringify({ items }) },
    ),
  exportTemplateOpsCSV: (input: { productCode?: string; publishedOnly?: boolean } = {}) => {
    const params = new URLSearchParams()
    if (input.productCode) params.set('product_code', input.productCode)
    if (input.publishedOnly) params.set('published_only', 'true')
    return requestText(`/template-ops/export/csv?${params.toString()}`)
  },
  exportTemplateOpsCSVTemplate: () => requestText('/template-ops/export/csv-template'),
  exportPreparedRealTemplateOpsCSV: () => request<PreparedTemplateOpsImportBundle>('/template-ops/export/csv-real-sample'),
  createCatalogProduct: (payload: Record<string, unknown>) => request<ProductRecord>('/catalog/products', { method: 'POST', body: JSON.stringify(payload) }),
  updateCatalogProduct: (productId: string, payload: Record<string, unknown>) => request<ProductRecord>(`/catalog/products/${productId}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteCatalogProduct: (productId: string) => request<{ deleted: boolean; id: string }>(`/catalog/products/${productId}`, { method: 'DELETE' }),
  catalogSkus: (productId = '') => request<{ items: SKURecord[] }>(`/catalog/skus${productId ? `?product_id=${encodeURIComponent(productId)}` : ''}`),
  createCatalogSku: (payload: Record<string, unknown>) => request<SKURecord>('/catalog/skus', { method: 'POST', body: JSON.stringify(payload) }),
  updateCatalogSku: (skuId: string, payload: Record<string, unknown>) => request<SKURecord>(`/catalog/skus/${skuId}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteCatalogSku: (skuId: string) => request<{ deleted: boolean; id: string }>(`/catalog/skus/${skuId}`, { method: 'DELETE' }),
  catalogPackages: (productId = '') => request<{ items: PackageRecord[] }>(`/catalog/packages${productId ? `?product_id=${encodeURIComponent(productId)}` : ''}`),
  createCatalogPackage: (payload: Record<string, unknown>) => request<PackageRecord>('/catalog/packages', { method: 'POST', body: JSON.stringify(payload) }),
  updateCatalogPackage: (packageId: string, payload: Record<string, unknown>) => request<PackageRecord>(`/catalog/packages/${packageId}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteCatalogPackage: (packageId: string) => request<{ deleted: boolean; id: string }>(`/catalog/packages/${packageId}`, { method: 'DELETE' }),
  catalogBillableItems: (productId = '') => request<{ items: BillableItemRecord[] }>(`/catalog/billable-items${productId ? `?product_id=${encodeURIComponent(productId)}` : ''}`),
  createCatalogBillableItem: (payload: Record<string, unknown>) => request<BillableItemRecord>('/catalog/billable-items', { method: 'POST', body: JSON.stringify(payload) }),
  updateCatalogBillableItem: (billableItemId: string, payload: Record<string, unknown>) => request<BillableItemRecord>(`/catalog/billable-items/${billableItemId}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteCatalogBillableItem: (billableItemId: string) => request<{ deleted: boolean; id: string }>(`/catalog/billable-items/${billableItemId}`, { method: 'DELETE' }),
  catalogRateCards: (productId = '', targetType = '') => {
    const params = new URLSearchParams()
    if (productId) params.set('product_id', productId)
    if (targetType) params.set('target_type', targetType)
    return request<{ items: RateCardRecord[] }>(`/catalog/rate-cards${params.size ? `?${params.toString()}` : ''}`)
  },
  createCatalogRateCard: (payload: Record<string, unknown>) => request<RateCardRecord>('/catalog/rate-cards', { method: 'POST', body: JSON.stringify(payload) }),
  updateCatalogRateCard: (rateCardId: string, payload: Record<string, unknown>) => request<RateCardRecord>(`/catalog/rate-cards/${rateCardId}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteCatalogRateCard: (rateCardId: string) => request<{ deleted: boolean; id: string }>(`/catalog/rate-cards/${rateCardId}`, { method: 'DELETE' }),
  walletAssets: (productCode = '') => request<{ items: AssetDefinitionRecord[] }>(`/wallet/assets${productCode ? `?product_code=${encodeURIComponent(productCode)}` : ''}`),
  createWalletAsset: (payload: Record<string, unknown>) => request<AssetDefinitionRecord>('/wallet/assets', { method: 'POST', body: JSON.stringify(payload) }),
  updateWalletAsset: (assetCode: string, payload: Record<string, unknown>) => request<AssetDefinitionRecord>(`/wallet/assets/${encodeURIComponent(assetCode)}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteWalletAsset: (assetCode: string) => request<{ deleted: boolean; id: string }>(`/wallet/assets/${encodeURIComponent(assetCode)}`, { method: 'DELETE' }),
  allowancePolicies: (productCode = '', assetCode = '') => {
    const params = new URLSearchParams()
    if (productCode) params.set('product_code', productCode)
    if (assetCode) params.set('asset_code', assetCode)
    return request<{ items: AllowancePolicyRecord[] }>(`/wallet/allowance-policies${params.size ? `?${params.toString()}` : ''}`)
  },
  createAllowancePolicy: (payload: Record<string, unknown>) => request<AllowancePolicyRecord>('/wallet/allowance-policies', { method: 'POST', body: JSON.stringify(payload) }),
  updateAllowancePolicy: (policyId: string, payload: Record<string, unknown>) => request<AllowancePolicyRecord>(`/wallet/allowance-policies/${policyId}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteAllowancePolicy: (policyId: string) => request<{ deleted: boolean; id: string }>(`/wallet/allowance-policies/${policyId}`, { method: 'DELETE' }),
  quotaPolicies: (productCode = '', packageCode = '') => {
    const params = new URLSearchParams()
    if (productCode) params.set('product_code', productCode)
    if (packageCode) params.set('package_code', packageCode)
    return request<{ items: QuotaGrantPolicyRecord[] }>(`/controls/quota/policies${params.size ? `?${params.toString()}` : ''}`)
  },
  createQuotaPolicy: (payload: Record<string, unknown>) => request<QuotaGrantPolicyRecord>('/controls/quota/policies', { method: 'POST', body: JSON.stringify(payload) }),
  updateQuotaPolicy: (policyId: string, payload: Record<string, unknown>) => request<QuotaGrantPolicyRecord>(`/controls/quota/policies/${policyId}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteQuotaPolicy: (policyId: string) => request<{ deleted: boolean; id: string }>(`/controls/quota/policies/${policyId}`, { method: 'DELETE' }),
  capabilityPolicies: (productCode = '', packageCode = '') => {
    const params = new URLSearchParams()
    if (productCode) params.set('product_code', productCode)
    if (packageCode) params.set('package_code', packageCode)
    return request<{ items: PackageCapabilityPolicyRecord[] }>(`/controls/capability/policies${params.size ? `?${params.toString()}` : ''}`)
  },
  createCapabilityPolicy: (payload: Record<string, unknown>) => request<PackageCapabilityPolicyRecord>('/controls/capability/policies', { method: 'POST', body: JSON.stringify(payload) }),
  updateCapabilityPolicy: (policyId: string, payload: Record<string, unknown>) => request<PackageCapabilityPolicyRecord>(`/controls/capability/policies/${policyId}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteCapabilityPolicy: (policyId: string) => request<{ deleted: boolean; id: string }>(`/controls/capability/policies/${policyId}`, { method: 'DELETE' }),
  chargeSessions: (input: { organizationId?: string; query?: string; status?: string; productCode?: string; limit?: number; offset?: number }) => {
    const params = new URLSearchParams()
    if (input.organizationId) params.set('organization_id', input.organizationId)
    if (input.query) params.set('query', input.query)
    if (input.status) params.set('status', input.status)
    if (input.productCode) params.set('product_code', input.productCode)
    params.set('limit', String(input.limit ?? 20))
    params.set('offset', String(input.offset ?? 0))
    return request<ChargeSessionsResult>(`/runtime/charge-sessions?${params.toString()}`)
  },
  chargeSessionDetail: (chargeSessionId: string) => request<ChargeSession>(`/runtime/charge-sessions/${chargeSessionId}`),
  settlements: (billingSubjectType: string, billingSubjectId: string, productCode = '') => {
    const params = new URLSearchParams({
      billing_subject_type: billingSubjectType,
      billing_subject_id: billingSubjectId,
    })
    if (productCode) params.set('product_code', productCode)
    return request<{ items: SettlementRecord[] }>(`/metering/settlements?${params.toString()}`)
  },
  settlementDetail: (eventId: string) => request<SettlementRecord>(`/metering/settlements/${eventId}`),
  discounts: (billingSubjectType: string, billingSubjectId: string, productCode = '') => {
    const params = new URLSearchParams({
      billing_subject_type: billingSubjectType,
      billing_subject_id: billingSubjectId,
    })
    if (productCode) params.set('product_code', productCode)
    return request<{ items: DiscountLedger[] }>(`/metering/discounts?${params.toString()}`)
  },
  runtimeJobs: (input: { organizationId?: string; query?: string; status?: string; stage?: string; limit?: number; offset?: number }) => {
    const params = new URLSearchParams()
    if (input.organizationId) params.set('organization_id', input.organizationId)
    if (input.query) params.set('query', input.query)
    if (input.status) params.set('status', input.status)
    if (input.stage) params.set('stage', input.stage)
    params.set('limit', String(input.limit ?? 20))
    params.set('offset', String(input.offset ?? 0))
    return request<RuntimeJobsResult>(`/runtime/jobs?${params.toString()}`)
  },
  runtimeJobDetail: (runtimeJobId: string) => request<RuntimeJobDetail>(`/runtime/jobs/${runtimeJobId}`),
  auditLogs: (input: { query?: string; action?: string; target_type?: string; status?: string; actor_user_id?: string; actor_org_id?: string; request_id?: string; trace_id?: string; limit?: number; offset?: number } = {}) => {
    const params = new URLSearchParams()
    if (input.query) params.set('query', input.query)
    if (input.action) params.set('action', input.action)
    if (input.target_type) params.set('target_type', input.target_type)
    if (input.status) params.set('status', input.status)
    if (input.actor_user_id) params.set('actor_user_id', input.actor_user_id)
    if (input.actor_org_id) params.set('actor_org_id', input.actor_org_id)
    if (input.request_id) params.set('request_id', input.request_id)
    if (input.trace_id) params.set('trace_id', input.trace_id)
    params.set('limit', String(input.limit ?? 20))
    params.set('offset', String(input.offset ?? 0))
    return request<AuditLogsResult>(`/audit/logs?${params.toString()}`)
  },
  auditLogDetail: (auditID: string) => request<AuditLogRecord>(`/audit/logs/${encodeURIComponent(auditID)}`),
  assetMetadataByStorageKey: (storageKey: string) => request<AssetRecord>(`/assets/metadata?storage_key=${encodeURIComponent(storageKey)}`),
  assetMetadataBySource: (input: { productCode: string; category: string; sourceType: string; sourceRef: string }) => {
    const params = new URLSearchParams({
      product_code: input.productCode,
      category: input.category,
      source_type: input.sourceType,
      source_ref: input.sourceRef,
    })
    return request<AssetRecord>(`/assets/metadata?${params.toString()}`)
  },
  assetContentUrl: (storageKey: string) => `${env.apiBaseUrl}/assets/content?storage_key=${encodeURIComponent(storageKey)}`,
  openAssetContent: (storageKey: string) => openProtectedResource(env.apiBaseUrl, `/assets/content?storage_key=${encodeURIComponent(storageKey)}`),
  internalAccessDoc: () => request<InternalAccessDoc>('/docs/internal-access'),
  errorCodesDoc: () => request<ErrorCodesDoc>('/docs/error-codes'),
  healthz: async () => {
    const response = await fetch('/healthz')
    return response.json() as Promise<{ code: number; data: { service: string; status: string } }>
  },
}
