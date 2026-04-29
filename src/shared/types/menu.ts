export interface MenuAssetSummary {
  asset_id: string
  asset_type: string
  source_type: string
  file_name: string
  mime_type: string
  storage_key: string
  source_url: string
  preview_url: string
  width: number
  height: number
  file_size: number
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface MenuVariantSummary {
  variant_id: string
  asset_id?: string
  preview_url?: string
  status: string
  index: number
  score: number
  is_selected: boolean
}

export interface MenuGenerationJobSummary {
  job_id: string
  mode: string
  provider: string
  runtime_job_id: string
  status: string
  stage: string
  stage_message: string
  progress: number
  error_code?: string
  error_message?: string
  selected_variant_id?: string
  created_at: string
  updated_at: string
  charge?: {
    status?: string
    failure_code?: string
    failure_message?: string
    reservation_id?: string
    settlement_id?: string
    final_units?: number
    net_amount?: number
    wallet_debited?: number
    credits_consumed?: number
  }
  variants?: MenuVariantSummary[]
}

export interface MenuJobHistoryItem {
  job: MenuGenerationJobSummary
  source_assets?: MenuAssetSummary[]
  result_assets?: MenuAssetSummary[]
  selected_asset?: MenuAssetSummary
}

export interface MenuJobHistoryResult {
  items: MenuJobHistoryItem[]
  total: number
}

export interface MenuAssetLibraryItem {
  asset: MenuAssetSummary
  origin_role: string
  produced_by_job_id?: string
  variant_id?: string
  latest_job?: {
    job_id: string
    status: string
    stage: string
    progress: number
  }
  can_refine: boolean
  can_share: boolean
}

export interface MenuAssetLibraryResult {
  items: MenuAssetLibraryItem[]
  total: number
}
