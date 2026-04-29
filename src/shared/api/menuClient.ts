import { env } from '@/shared/config/env'
import { openProtectedResource, requestMenu } from '@/shared/api/http'
import type { MenuAssetLibraryResult, MenuGenerationJobSummary, MenuJobHistoryResult } from '@/shared/types/menu'

export const menuClient = {
  jobHistory: (input: { status?: string; limit?: number; offset?: number }) => {
    const params = new URLSearchParams()
    if (input.status) params.set('status', input.status)
    params.set('limit', String(input.limit ?? 20))
    params.set('offset', String(input.offset ?? 0))
    return requestMenu<MenuJobHistoryResult>(`/studio/history/jobs?${params.toString()}`)
  },
  generationJob: (jobId: string) => requestMenu<MenuGenerationJobSummary>(`/studio/jobs/${jobId}`),
  assetLibrary: (input: { assetType?: string; status?: string; query?: string; limit?: number; offset?: number }) => {
    const params = new URLSearchParams()
    if (input.assetType) params.set('asset_type', input.assetType)
    if (input.status) params.set('status', input.status)
    if (input.query) params.set('query', input.query)
    params.set('limit', String(input.limit ?? 20))
    params.set('offset', String(input.offset ?? 0))
    return requestMenu<MenuAssetLibraryResult>(`/studio/library/assets?${params.toString()}`)
  },
  assetContentUrl: (assetId: string) => `${env.menuApiBaseUrl}/studio/assets/${encodeURIComponent(assetId)}/content`,
  openAssetContent: (assetId: string) => openProtectedResource(env.menuApiBaseUrl, `/studio/assets/${encodeURIComponent(assetId)}/content`),
}
