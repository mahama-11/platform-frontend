export interface WalletAssetSummary {
  asset_code: string
  product_code: string
  total_balance: number
  permanent_balance: number
  reward_balance: number
  allowance_balance: number
}

export interface WalletSummary {
  billing_subject_type: string
  billing_subject_id: string
  product_code: string
  total_balance: number
  permanent_balance: number
  reward_balance: number
  allowance_balance: number
  assets: WalletAssetSummary[]
}

export interface ProductRecord {
  id: string
  code: string
  name: string
  status: string
  owner_team: string
  metadata: string
  created_at: string
  updated_at: string
}

export interface SKURecord {
  id: string
  product_id: string
  code: string
  name: string
  sku_type: string
  billing_mode: string
  currency: string
  list_price: number
  status: string
  metadata: string
  created_at: string
  updated_at: string
}

export interface PackageRecord {
  id: string
  product_id: string
  code: string
  name: string
  package_type: string
  status: string
  metadata: string
  created_at: string
  updated_at: string
}

export interface BillableItemRecord {
  id: string
  product_id: string
  code: string
  name: string
  meter_unit: string
  billing_scope: string
  settlement_mode: string
  pricing_behavior: string
  status: string
  metadata: string
  created_at: string
  updated_at: string
}

export interface RateCardRecord {
  id: string
  product_id: string
  code: string
  target_type: string
  target_id: string
  price_model: string
  currency: string
  price_config: string
  effective_from?: string
  effective_to?: string
  version: number
  status: string
  metadata: string
  created_at: string
  updated_at: string
}

export interface AssetDefinitionRecord {
  asset_code: string
  product_code: string
  asset_type: string
  lifecycle_type: string
  default_expire_days: number
  reset_cycle: string
  status: string
  description: string
  metadata: string
  created_at: string
  updated_at: string
}

export interface AllowancePolicyRecord {
  id: string
  product_code: string
  billing_subject_type: string
  billing_subject_id: string
  asset_code: string
  amount: number
  reset_cycle: string
  status: string
  effective_from?: string
  effective_to?: string
  metadata: string
  created_at: string
  updated_at: string
}

export interface QuotaGrantPolicyRecord {
  id: string
  product_code: string
  package_code: string
  billable_item_code: string
  grant_mode: string
  units: number
  reset_cycle: string
  status: string
  metadata: string
  created_at: string
  updated_at: string
}

export interface PackageCapabilityPolicyRecord {
  id: string
  product_code: string
  package_code: string
  capability_code: string
  grant_value: string
  status: string
  metadata: string
  created_at: string
  updated_at: string
}

export interface OfferingsView {
  product: ProductRecord | null
  skus: SKURecord[]
  packages: PackageRecord[]
  billable_items: BillableItemRecord[]
  rate_cards: RateCardRecord[]
  asset_definitions: AssetDefinitionRecord[]
  allowance_policies: AllowancePolicyRecord[]
}

export interface ChargeSession {
  id: string
  source_type: string
  source_id: string
  product_code: string
  organization_id: string
  user_id: string
  billing_subject_type: string
  billing_subject_id: string
  billable_item_code: string
  resource_type: string
  status: string
  reservation_key: string
  reservation_id: string
  finalization_id: string
  event_id: string
  settlement_id: string
  estimated_units: number
  final_units: number
  route_snapshot: string
  metadata: string
  reserved_at?: string
  finalized_at?: string
  released_at?: string
  created_at: string
  updated_at: string
}

export interface ChargeSessionsResult {
  items: ChargeSession[]
  total: number
  limit: number
  offset: number
}

export interface SettlementRecord {
  id: string
  event_id: string
  request_id: string
  trace_id: string
  billing_subject_type: string
  billing_subject_id: string
  product_code: string
  billable_item_code: string
  billing_profile_id: string
  commercial_entity_id: string
  merchant_account_id: string
  settlement_mode: string
  currency: string
  gross_amount: number
  discount_amount: number
  net_amount: number
  quota_consumed: number
  credits_consumed: number
  wallet_asset_code: string
  wallet_debited: number
  billing_amount: number
  reward_amount: number
  commission_amount: number
  status: string
  snapshot: string
  created_at: string
  updated_at: string
}

export interface DiscountLedger {
  id: string
  product_code: string
  campaign_code: string
  discount_type: string
  billing_subject_type: string
  billing_subject_id: string
  currency: string
  amount: number
  status: string
  reference_type: string
  reference_id: string
  created_at: string
  updated_at: string
}

export interface RuntimeJob {
  id: string
  product_code: string
  task_type: string
  provider_code: string
  provider_mode: string
  provider_job_id: string
  organization_id: string
  user_id: string
  source_type: string
  source_id: string
  charge_session_id: string
  status: string
  stage: string
  stage_message: string
  error_class: string
  error_code: string
  error_message: string
  input_manifest: string
  output_manifest: string
  route_snapshot: string
  metadata: string
  attempt_count: number
  max_attempts: number
  created_at: string
  updated_at: string
}

export interface RuntimeAttempt {
  id: string
  runtime_job_id: string
  attempt_no: number
  status: string
  error_class: string
  error_code: string
  error_message: string
  provider_code: string
  provider_mode: string
  provider_request: string
  provider_response: string
  started_at?: string
  ended_at?: string
  created_at: string
  updated_at: string
}

export interface RuntimeJobDetail {
  job: RuntimeJob
  attempts: RuntimeAttempt[]
}

export interface RuntimeJobsResult {
  items: RuntimeJob[]
  total: number
  limit: number
  offset: number
}

export interface AuditLogRecord {
  id: string
  request_id: string
  trace_id: string
  actor_user_id: string
  actor_org_id: string
  action: string
  target_type: string
  target_id: string
  billing_subject_type: string
  billing_subject_id: string
  status: string
  route: string
  method: string
  details: string
  before_snapshot: string
  after_snapshot: string
  diff_summary: string
  created_at: string
}

export interface AuditLogStats {
  total: number
  success_count: number
  failure_count: number
  distinct_actions: number
  latest_created_at?: string
  by_status: Record<string, number>
  by_action: Record<string, number>
  by_target_type: Record<string, number>
}

export interface AuditLogsResult {
  items: AuditLogRecord[]
  total: number
  limit: number
  offset: number
  stats?: AuditLogStats
}

export interface TemplateOpsCatalogItem {
  template_ref: string
  product_code: string
  template_id: string
  slug: string
  name: string
  summary: string
  status: string
  cover_asset_url?: string
  cover_asset_id?: string
  recommend_score: number
  tags?: string[]
  platforms?: string[]
  series?: string
  capability_type?: string
  modality?: string
  scope?: string
  managed_source?: string
  raw?: Record<string, unknown>
}

export interface TemplateOpsCatalogResult {
  items: TemplateOpsCatalogItem[]
  total: number
  limit: number
  offset: number
}

export interface TemplateOpsCatalogDetail {
  item: TemplateOpsCatalogItem
  product: string
  detail_raw: Record<string, unknown>
}

export interface TemplateOpsImportPreviewAssetCheck {
  product_code: string
  category: string
  source_type: string
  source_ref: string
  status: string
  storage_key?: string
}

export interface TemplateOpsImportPreviewRow {
  row: number
  template_ref: string
  action: string
  valid: boolean
  ready_to_import: boolean
  error?: string
  asset_checks?: TemplateOpsImportPreviewAssetCheck[]
}

export interface TemplateOpsImportPreviewSummary {
  total_rows: number
  valid_rows: number
  invalid_rows: number
  create_count: number
  update_count: number
  ready_to_import_count: number
  missing_asset_rows: number
  missing_asset_count: number
}

export interface TemplateOpsImportPreviewResult {
  summary: TemplateOpsImportPreviewSummary
  rows: TemplateOpsImportPreviewRow[]
}

export interface PreparedTemplateOpsImportBundle {
  content: string
  csv_path: string
  asset_manifest_path: string
  summary_path: string
  template_count: number
  menu_template_count: number
  ecommerce_template_count: number
  asset_manifest_item_count: number
  missing_asset_count: number
}

export interface TemplateAssetBinding {
  asset_role: string
  product_code: string
  category: string
  source_type: string
  source_ref: string
  title?: string
  description?: string
  asset_ref?: string
  storage_key?: string
  asset_id?: string
  mime_type?: string
  file_name?: string
  checksum?: string
  preview_url?: string
  example_index?: number
  status: string
}

export interface TemplateAssetBindingsResult {
  template_ref: string
  items: TemplateAssetBinding[]
}

export interface PreparedAssetImportItemResult {
  source_ref: string
  product_code: string
  status: string
  storage_key?: string
  error?: string
}

export interface PreparedAssetImportResult {
  manifest_path: string
  imported_count: number
  skipped_count: number
  failed_count: number
  items: PreparedAssetImportItemResult[]
}

export interface BatchUploadAssetItemResult {
  source_ref: string
  product_code: string
  status: string
  storage_key?: string
  file_name?: string
  error?: string
}

export interface BatchUploadAssetsResult {
  imported_count: number
  failed_count: number
  items: BatchUploadAssetItemResult[]
}

export interface AssetRecord {
  id: string
  product_code: string
  category: string
  source_type: string
  source_ref: string
  storage_key: string
  file_name: string
  mime_type: string
  file_size: number
  checksum: string
  title: string
  description: string
  tags: string[]
  metadata: Record<string, unknown>
  status: string
  imported_at?: string
  created_at: string
  updated_at: string
}

export interface ErrorCodeDocEntry {
  code: number
  name: string
  message: string
  http_status: number
}

export interface ErrorCodesDoc {
  client_errors: ErrorCodeDocEntry[]
  business_errors: ErrorCodeDocEntry[]
  payment_errors: ErrorCodeDocEntry[]
  server_errors: ErrorCodeDocEntry[]
}

export interface InternalAccessDoc {
  base_path: string
  auth_method: string
  headers: string[]
  write_flows: string[]
  query_flows: string[]
  idempotency: string[]
  retry_rules: string[]
}


export interface RequestDiagnosticsResult {
  request_id: string
  trace_id?: string
  log_query?: string
  log_summary: DiagnosticsLogSummary
  trace_summary: DiagnosticsTraceSummary
  operator_summary?: DiagnosticsOperatorSummary
  findings: DiagnosticsFinding[]
  log_lines?: DiagnosticsLogLine[]
  spans?: DiagnosticsSpanSummary[]
  external_urls?: Record<string, string>
  diagnostics_enabled: boolean
}

export interface DiagnosticsOperatorSummary {
  request_path: DiagnosticsRequestPathStep[]
  participating_services: string[]
  business_stages: DiagnosticsBusinessStageSummary[]
  failure?: DiagnosticsFailureSummary
  likely_cause: string
  next_steps: string[]
}

export interface DiagnosticsRequestPathStep {
  timestamp?: string
  service?: string
  operation?: string
  route?: string
  status?: number
  outcome?: 'ok' | 'warning' | 'failed' | string
  error_code?: string
}

export interface DiagnosticsBusinessStageSummary {
  name: string
  status: 'ok' | 'warning' | 'failed' | string
  service?: string
  operation?: string
  error_code?: string
}

export interface DiagnosticsFailureSummary {
  category: string
  stage?: string
  service?: string
  operation?: string
  status?: number
  error_code?: string
  message?: string
}

export interface DiagnosticsLogSummary {
  total_lines: number
  services: string[]
  routes: string[]
  statuses: number[]
  error_codes: string[]
  first_seen_at?: string
  last_seen_at?: string
}

export interface DiagnosticsTraceSummary {
  found: boolean
  span_count: number
  service_names: string[]
  root_operation?: string
  duration_ms?: number
  error_span_count: number
}

export interface DiagnosticsFinding {
  severity: 'info' | 'warning' | 'error'
  code: string
  message: string
}

export interface DiagnosticsLogLine {
  timestamp?: string
  service?: string
  level?: string
  message?: string
  fields?: Record<string, unknown>
}

export interface DiagnosticsSpanSummary {
  trace_id: string
  span_id: string
  parent_span_id?: string
  service?: string
  name: string
  duration_ms?: number
  status?: string
  attributes?: Record<string, string>
}
