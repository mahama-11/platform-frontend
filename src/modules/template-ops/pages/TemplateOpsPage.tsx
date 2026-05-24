import { useEffect, useMemo, useState } from 'react'
import { Download, RefreshCcw, Upload } from 'lucide-react'

import { useToastStore } from '@/app/store/toastStore'
import { platformClient } from '@/shared/api/platformClient'
import { PageHeader } from '@/shared/ui/PageHeader'
import { SectionCard } from '@/shared/ui/SectionCard'
import { EntityModal } from '@/shared/ui/EntityModal'
import { TemplateOpsCsvImportModal, type UploadedBatchAssetCandidate } from './TemplateOpsCsvImportModal'
import { TemplateOpsAssetModal } from './TemplateOpsAssetModal'
import { Field } from './TemplateOpsFormField'
import { buildAssetOptionKey, fileTitleFromName, readFileAsDataURL, suggestMissingAssetKey } from './templateOpsPageUtils'
import type {
  BatchUploadAssetsResult,
  PreparedAssetImportResult,
  PreparedTemplateOpsImportBundle,
  TemplateAssetBinding,
  TemplateOpsCatalogDetail,
  TemplateOpsCatalogItem,
  TemplateOpsImportPreviewResult,
} from '@/shared/types/platform'

const secondaryButtonClass = 'inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-sm font-medium text-[var(--text)] transition-colors hover:border-[var(--border-strong)]'
const primaryButtonClass = 'inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-950 transition-colors hover:bg-slate-200'

export function TemplateOpsPage() {
  const pushToast = useToastStore(state => state.push)
  const [productCode, setProductCode] = useState<'all' | 'menu' | 'ecommerce'>('all')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<TemplateOpsCatalogItem[]>([])
  const [selectedRef, setSelectedRef] = useState('')
  const [detail, setDetail] = useState<TemplateOpsCatalogDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [assetOpen, setAssetOpen] = useState(false)
  const [assetLoading, setAssetLoading] = useState(false)
  const [assetBindings, setAssetBindings] = useState<TemplateAssetBinding[]>([])
  const [assetForm, setAssetForm] = useState({
    asset_role: 'example_1',
    title: '',
    description: '',
    asset_ref: '',
    storage_file_name: '',
    file_name: '',
    mime_type: '',
    payload: '',
  })
  const [csvOpen, setCsvOpen] = useState(false)
  const [csvContent, setCsvContent] = useState('')
  const [publishAfterImport, setPublishAfterImport] = useState(true)
  const [csvPreviewLoading, setCsvPreviewLoading] = useState(false)
  const [csvImporting, setCsvImporting] = useState(false)
  const [preparedAssetImporting, setPreparedAssetImporting] = useState(false)
  const [batchAssetUploading, setBatchAssetUploading] = useState(false)
  const [csvPreview, setCsvPreview] = useState<TemplateOpsImportPreviewResult | null>(null)
  const [preparedBundle, setPreparedBundle] = useState<PreparedTemplateOpsImportBundle | null>(null)
  const [preparedAssetResult, setPreparedAssetResult] = useState<PreparedAssetImportResult | null>(null)
  const [batchAssetResult, setBatchAssetResult] = useState<BatchUploadAssetsResult | null>(null)
  const [uploadedBatchAssets, setUploadedBatchAssets] = useState<UploadedBatchAssetCandidate[]>([])
  const [form, setForm] = useState({
    product_code: 'menu',
    template_id: '',
    slug: '',
    name: '',
    summary: '',
    status: 'active',
    scope: 'official',
    managed_source: 'ops_manual',
    cover_asset_url: '',
    cover_asset_id: '',
    recommend_score: '0',
    platforms: '[]',
    tags: '[]',
    series: '',
    capability_type: '',
    modality: '',
    raw: '{}',
    detail_raw: '{}',
  })

  const selectedItem = useMemo(
    () => items.find(item => item.template_ref === selectedRef) || null,
    [items, selectedRef],
  )
  const missingPreviewAssets = useMemo(() => {
    if (!csvPreview) return []
    const seen = new Set<string>()
    return csvPreview.rows.flatMap(row => (row.asset_checks || []).filter(asset => {
      const key = `${asset.product_code}:${asset.source_ref}`
      if (asset.status === 'ready' || seen.has(key)) return false
      seen.add(key)
      return true
    }))
  }, [csvPreview])
  const missingAssetOptions = useMemo(() => (
    missingPreviewAssets.map(asset => ({
      key: buildAssetOptionKey(asset),
      label: `${asset.product_code} · ${asset.source_ref}`,
      asset,
    }))
  ), [missingPreviewAssets])

  async function loadCatalog(nextSelectedRef?: string) {
    try {
      setLoading(true)
      setError(null)
      const result = await platformClient.templateOpsCatalog({
        productCode: productCode === 'all' ? undefined : productCode,
        query: query.trim() || undefined,
        limit: 200,
        offset: 0,
      })
      setItems(result.items)
      const resolvedRef = nextSelectedRef || selectedRef || result.items[0]?.template_ref || ''
      setSelectedRef(resolvedRef)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load template operations catalog')
    } finally {
      setLoading(false)
    }
  }

  async function loadDetail(templateRef: string) {
    if (!templateRef) {
      setDetail(null)
      return
    }
    try {
      setDetailLoading(true)
      const result = await platformClient.templateOpsDetail(templateRef)
      setDetail(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load template detail')
    } finally {
      setDetailLoading(false)
    }
  }

  async function openDetailModal(templateRef: string) {
    setSelectedRef(templateRef)
    setDetailOpen(true)
    await loadDetail(templateRef)
  }

  async function loadTemplateAssets(templateRef: string) {
    try {
      setAssetLoading(true)
      const result = await platformClient.templateOpsAssets(templateRef)
      setAssetBindings(result.items)
      const firstRole = result.items[0]?.asset_role || 'example_1'
      setAssetForm(current => ({ ...current, asset_role: firstRole }))
    } catch (err) {
      pushToast({
        tone: 'error',
        title: '模板图片绑定加载失败',
        description: err instanceof Error ? err.message : 'Failed to load template assets',
      })
    } finally {
      setAssetLoading(false)
    }
  }

  async function openAssetModal(item: TemplateOpsCatalogItem) {
    setSelectedRef(item.template_ref)
    setAssetOpen(true)
    setAssetBindings([])
    setAssetForm({
      asset_role: 'example_1',
      title: '',
      description: '',
      asset_ref: '',
      storage_file_name: '',
      file_name: '',
      mime_type: '',
      payload: '',
    })
    await loadTemplateAssets(item.template_ref)
  }

  async function saveTemplateAsset() {
    if (!selectedItem) return
    try {
      const result = await platformClient.upsertTemplateOpsAsset(selectedItem.template_ref, assetForm.asset_role, {
        asset_role: assetForm.asset_role,
        title: assetForm.title,
        description: assetForm.description,
        asset_ref: assetForm.asset_ref,
        storage_file_name: assetForm.storage_file_name,
        file_name: assetForm.file_name,
        mime_type: assetForm.mime_type,
        payload: assetForm.payload,
      })
      setAssetBindings(result.items)
      setAssetForm(current => ({ ...current, payload: '' }))
      pushToast({ tone: 'success', title: '模板图片已绑定' })
      await loadCatalog(selectedItem.template_ref)
      await loadDetail(selectedItem.template_ref)
    } catch (err) {
      pushToast({
        tone: 'error',
        title: '模板图片绑定失败',
        description: err instanceof Error ? err.message : 'Failed to bind template asset',
      })
    }
  }

  async function unbindTemplateAsset(assetRole: string) {
    if (!selectedItem) return
    try {
      const result = await platformClient.unbindTemplateOpsAsset(selectedItem.template_ref, assetRole)
      setAssetBindings(result.items)
      pushToast({ tone: 'success', title: '模板图片已解绑' })
      await loadDetail(selectedItem.template_ref)
    } catch (err) {
      pushToast({
        tone: 'error',
        title: '模板图片解绑失败',
        description: err instanceof Error ? err.message : 'Failed to unbind template asset',
      })
    }
  }

  function openEditModal(item?: TemplateOpsCatalogItem | null) {
    const target = item || selectedItem
    setForm(target ? {
      product_code: target.product_code,
      template_id: target.template_id,
      slug: target.slug || '',
      name: target.name || '',
      summary: target.summary || '',
      status: 'active',
      scope: target.scope || 'official',
      managed_source: target.managed_source || 'ops_manual',
      cover_asset_url: target.cover_asset_url || '',
      cover_asset_id: target.cover_asset_id || '',
      recommend_score: String(target.recommend_score || 0),
      platforms: JSON.stringify(target.platforms || [], null, 2),
      tags: JSON.stringify(target.tags || [], null, 2),
      series: target.series || '',
      capability_type: target.capability_type || '',
      modality: target.modality || '',
      raw: JSON.stringify(target.raw || {}, null, 2),
      detail_raw: JSON.stringify(detail?.detail_raw || {}, null, 2),
    } : {
      product_code: 'menu',
      template_id: '',
      slug: '',
      name: '',
      summary: '',
      status: 'active',
      scope: 'official',
      managed_source: 'ops_manual',
      cover_asset_url: '',
      cover_asset_id: '',
      recommend_score: '0',
      platforms: '[]',
      tags: '[]',
      series: '',
      capability_type: '',
      modality: '',
      raw: '{}',
      detail_raw: '{}',
    })
    setEditOpen(true)
  }

  async function saveTemplate() {
    try {
      const payload = {
        product_code: form.product_code,
        template_id: form.template_id,
        slug: form.slug,
        name: form.name,
        summary: form.summary,
        status: form.status,
        scope: form.scope,
        managed_source: form.managed_source,
        cover_asset_url: form.cover_asset_url,
        cover_asset_id: form.cover_asset_id,
        recommend_score: Number(form.recommend_score || 0),
        platforms: JSON.parse(form.platforms || '[]'),
        tags: JSON.parse(form.tags || '[]'),
        series: form.series,
        capability_type: form.capability_type,
        modality: form.modality,
        raw: JSON.parse(form.raw || '{}'),
        detail_raw: JSON.parse(form.detail_raw || '{}'),
      }
      if (selectedItem) {
        await platformClient.updateTemplateOpsCatalog(selectedItem.template_ref, payload)
        pushToast({ tone: 'success', title: '模板投影已更新' })
        await loadCatalog(selectedItem.template_ref)
        await loadDetail(selectedItem.template_ref)
      } else {
        const created = await platformClient.createTemplateOpsCatalog(payload)
        pushToast({ tone: 'success', title: '模板投影已创建' })
        await loadCatalog(created.item.template_ref)
        await loadDetail(created.item.template_ref)
      }
      setEditOpen(false)
    } catch (err) {
      pushToast({ tone: 'error', title: '模板保存失败', description: err instanceof Error ? err.message : 'Failed to save template projection' })
    }
  }

  function downloadTextFile(filename: string, content: string) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.click()
    URL.revokeObjectURL(url)
  }

  function resetCSVFlow() {
    setCsvContent('')
    setCsvPreview(null)
    setPreparedBundle(null)
    setPreparedAssetResult(null)
    setBatchAssetResult(null)
    setUploadedBatchAssets([])
    setPublishAfterImport(true)
    setCsvPreviewLoading(false)
    setCsvImporting(false)
    setPreparedAssetImporting(false)
  }

  async function loadPreparedRealCSV() {
    try {
      const bundle = await platformClient.exportPreparedRealTemplateOpsCSV()
      setPreparedBundle(bundle)
      setCsvContent(bundle.content)
      setCsvPreview(null)
      pushToast({
        tone: 'success',
        title: '真实样例已加载',
        description: `已载入 ${bundle.template_count} 条模板，可直接执行预检。`,
      })
    } catch (err) {
      pushToast({
        tone: 'error',
        title: '真实样例加载失败',
        description: err instanceof Error ? err.message : 'Failed to load prepared real csv',
      })
    }
  }

  async function previewCSVImport() {
    try {
      setCsvPreviewLoading(true)
      const result = await platformClient.previewTemplateOpsCSVImport(csvContent)
      setCsvPreview(result)
      pushToast({
        tone: 'success',
        title: '预检完成',
        description: `有效 ${result.summary.valid_rows} 行，缺图 ${result.summary.missing_asset_count} 张。`,
      })
    } catch (err) {
      setCsvPreview(null)
      pushToast({
        tone: 'error',
        title: '预检失败',
        description: err instanceof Error ? err.message : 'Failed to preview template csv',
      })
    } finally {
      setCsvPreviewLoading(false)
    }
  }

  async function importCSV() {
    try {
      setCsvImporting(true)
      const result = await platformClient.importTemplateOpsCSV(csvContent, publishAfterImport)
      pushToast({
        tone: 'success',
        title: 'CSV 导入完成',
        description: `导入 ${result.imported_count} 条，发布 ${result.published_count} 条。`,
      })
      await loadCatalog()
      setCsvOpen(false)
      resetCSVFlow()
    } catch (err) {
      pushToast({
        tone: 'error',
        title: 'CSV 导入失败',
        description: err instanceof Error ? err.message : 'Failed to import template csv',
      })
    } finally {
      setCsvImporting(false)
    }
  }

  async function importPreparedAssets() {
    try {
      setPreparedAssetImporting(true)
      const result = await platformClient.importPreparedTemplateOpsAssets(true)
      setPreparedAssetResult(result)
      pushToast({
        tone: result.failed_count > 0 ? 'error' : 'success',
        title: '真实样例图片导入完成',
        description: `新增 ${result.imported_count} 张，已就绪 ${result.skipped_count} 张，失败 ${result.failed_count} 张。`,
      })
      if (csvContent.trim()) {
        const preview = await platformClient.previewTemplateOpsCSVImport(csvContent)
        setCsvPreview(preview)
      }
    } catch (err) {
      pushToast({
        tone: 'error',
        title: '真实样例图片导入失败',
        description: err instanceof Error ? err.message : 'Failed to import prepared assets',
      })
    } finally {
      setPreparedAssetImporting(false)
    }
  }

  async function handleBatchAssetFilesSelected(fileList: FileList | null) {
    if (!fileList?.length) return
    const files = Array.from(fileList)
    const nextItems = await Promise.all(files.map(async file => {
      const payload = await readFileAsDataURL(file)
      const suggested = suggestMissingAssetKey(file.name, missingPreviewAssets)
      return {
        id: `${file.name}-${file.size}-${file.lastModified}`,
        file_name: file.name,
        mime_type: file.type || 'image/png',
        payload,
        selected_key: suggested,
        suggested_key: suggested,
      } satisfies UploadedBatchAssetCandidate
    }))
    setUploadedBatchAssets(current => {
      const byId = new Map(current.map(item => [item.id, item]))
      nextItems.forEach(item => byId.set(item.id, item))
      return Array.from(byId.values())
    })
  }

  async function uploadMatchedBatchAssets() {
    const matchedItems = uploadedBatchAssets
      .map(item => {
        const target = missingAssetOptions.find(option => option.key === item.selected_key)
        if (!target) return null
        return {
          product_code: target.asset.product_code,
          category: target.asset.category,
          source_type: target.asset.source_type,
          source_ref: target.asset.source_ref,
          file_name: item.file_name,
          mime_type: item.mime_type,
          payload: item.payload,
          title: fileTitleFromName(item.file_name),
        }
      })
      .filter(Boolean)
    if (!matchedItems.length) {
      pushToast({ tone: 'error', title: '没有可上传的匹配项', description: '请先选择图片，并为至少一张图片指定目标 source_ref。' })
      return
    }
    try {
      setBatchAssetUploading(true)
      const result = await platformClient.batchUploadTemplateOpsAssets(matchedItems as Array<Record<string, unknown>>)
      setBatchAssetResult(result)
      pushToast({
        tone: result.failed_count > 0 ? 'error' : 'success',
        title: '批量补图完成',
        description: `成功 ${result.imported_count} 张，失败 ${result.failed_count} 张。`,
      })
      const preview = await platformClient.previewTemplateOpsCSVImport(csvContent)
      setCsvPreview(preview)
    } catch (err) {
      pushToast({
        tone: 'error',
        title: '批量补图失败',
        description: err instanceof Error ? err.message : 'Failed to upload matched assets',
      })
    } finally {
      setBatchAssetUploading(false)
    }
  }

  useEffect(() => {
    void loadCatalog()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productCode])

  useEffect(() => {
    if (selectedRef) {
      void loadDetail(selectedRef)
    } else {
      setDetail(null)
    }
  }, [selectedRef])

  return (
    <div className="space-y-8">
      <PageHeader
        title="Template Ops Center"
        description="平台统一聚合 Menu 与 Ecommerce 模板目录，作为后续模板治理闭环与平滑替换的第一阶段运营入口。"
        actions={(
          <div className="flex gap-3">
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={async () => {
                try {
                  const content = await platformClient.exportTemplateOpsCSVTemplate()
                  downloadTextFile('template_ops_import_template.csv', content)
                  pushToast({ tone: 'success', title: 'CSV 模板已下载' })
                } catch (err) {
                  pushToast({ tone: 'error', title: 'CSV 模板下载失败', description: err instanceof Error ? err.message : 'Failed to download csv template' })
                }
              }}
            >
              <Download className="h-4 w-4" />
              下载模板
            </button>
            <button type="button" className={secondaryButtonClass} onClick={() => { resetCSVFlow(); setCsvOpen(true) }}>
              <Upload className="h-4 w-4" />
              导入向导
            </button>
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={async () => {
                try {
                  const source = productCode === 'all' ? undefined : productCode
                  await platformClient.syncTemplateOpsCatalog(source)
                  pushToast({ tone: 'success', title: '模板同步完成' })
                  await loadCatalog()
                } catch (err) {
                  pushToast({ tone: 'error', title: '模板同步失败', description: err instanceof Error ? err.message : 'Failed to sync template catalog' })
                }
              }}
            >
              <RefreshCcw className="h-4 w-4" />
              同步上游
            </button>
            <button type="button" className={primaryButtonClass} onClick={() => { setSelectedRef(''); setDetail(null); openEditModal(null) }}>
              新建投影
            </button>
          </div>
        )}
      />

      {error ? <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">{error}</div> : null}

      <SectionCard title="Unified catalog" description="当前由平台聚合业务模板目录，先统一运营入口和只读治理面，再逐步推进真源迁移。">
        <div className="mb-5 grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
          <select
            value={productCode}
            onChange={event => setProductCode(event.target.value as 'all' | 'menu' | 'ecommerce')}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]"
          >
            <option value="all">全部业务域</option>
            <option value="menu">Menu</option>
            <option value="ecommerce">Ecommerce</option>
          </select>
          <div className="flex gap-3">
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="按名称、slug 或业务语义搜索模板..."
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]"
            />
            <button type="button" className={secondaryButtonClass} onClick={() => void loadCatalog()}>
              搜索
            </button>
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={async () => {
                try {
                  const content = await platformClient.exportTemplateOpsCSV({
                    productCode: productCode === 'all' ? undefined : productCode,
                    publishedOnly: false,
                  })
                  downloadTextFile('template_ops_catalog.csv', content)
                  pushToast({ tone: 'success', title: 'CSV 导出成功' })
                } catch (err) {
                  pushToast({ tone: 'error', title: 'CSV 导出失败', description: err instanceof Error ? err.message : 'Failed to export template csv' })
                }
              }}
            >
              导出当前目录
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--bg)]">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--bg-muted)]">
                <tr>
                  <th className="px-4 py-3 text-[var(--text-muted)]">模板</th>
                  <th className="px-4 py-3 text-[var(--text-muted)]">业务域</th>
                  <th className="px-4 py-3 text-[var(--text-muted)]">能力标签</th>
                  <th className="px-4 py-3 text-[var(--text-muted)]">推荐分</th>
                  <th className="px-4 py-3 text-right text-[var(--text-muted)]">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {items.length ? items.map(item => (
                  <tr key={item.template_ref} className={item.template_ref === selectedRef ? 'bg-white/5' : undefined}>
                    <td className="px-4 py-3">
                      <div className="min-w-0">
                        <div className="font-medium text-[var(--text)]">{item.name}</div>
                        <div className="mt-1 text-xs text-[var(--text-soft)]">{item.template_ref}</div>
                        <div className="mt-1 text-xs text-[var(--text-muted)]">{item.summary || '-'}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--text)]">{item.product_code}</td>
                    <td className="px-4 py-3 text-[var(--text-muted)]">{[item.series, item.capability_type, item.modality].filter(Boolean).join(' / ') || (item.tags || []).slice(0, 2).join(', ') || '-'}</td>
                    <td className="px-4 py-3 text-[var(--text)]">{item.recommend_score}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button type="button" className={secondaryButtonClass} onClick={() => void openDetailModal(item.template_ref)}>
                          查看详情
                        </button>
                        <button type="button" className={secondaryButtonClass} onClick={() => { setSelectedRef(item.template_ref); void loadDetail(item.template_ref); openEditModal(item) }}>
                          编辑
                        </button>
                        <button type="button" className={secondaryButtonClass} onClick={() => void openAssetModal(item)}>
                          图片管理
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-[var(--text-muted)]">
                      {loading ? 'Loading templates...' : 'No templates returned from upstream products.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4 text-sm text-[var(--text-muted)]">
            单模板详情、编辑和图片治理都已转成弹窗式交互。列表页只保留浏览、搜索和批量操作，避免单个模板操作持续占据主视图。
          </div>
        </div>
      </SectionCard>

      <TemplateOpsCsvImportModal
        open={csvOpen}
        csvContent={csvContent}
        publishAfterImport={publishAfterImport}
        csvPreviewLoading={csvPreviewLoading}
        csvImporting={csvImporting}
        preparedAssetImporting={preparedAssetImporting}
        batchAssetUploading={batchAssetUploading}
        csvPreview={csvPreview}
        preparedBundle={preparedBundle}
        preparedAssetResult={preparedAssetResult}
        batchAssetResult={batchAssetResult}
        missingPreviewAssets={missingPreviewAssets}
        missingAssetOptions={missingAssetOptions}
        uploadedBatchAssets={uploadedBatchAssets}
        secondaryButtonClass={secondaryButtonClass}
        primaryButtonClass={primaryButtonClass}
        setOpen={setCsvOpen}
        setCsvContent={setCsvContent}
        setCsvPreview={setCsvPreview}
        setPublishAfterImport={setPublishAfterImport}
        setUploadedBatchAssets={setUploadedBatchAssets}
        resetCSVFlow={resetCSVFlow}
        loadPreparedRealCSV={loadPreparedRealCSV}
        previewCSVImport={previewCSVImport}
        importCSV={importCSV}
        importPreparedAssets={importPreparedAssets}
        handleBatchAssetFilesSelected={handleBatchAssetFilesSelected}
        uploadMatchedBatchAssets={uploadMatchedBatchAssets}
      />

      <EntityModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={selectedItem ? '编辑平台模板投影' : '新建平台模板投影'}
        description="当前阶段支持平台对模板目录进行导入后编辑和发布，为后续业务真源迁移铺路。"
        footer={(
          <div className="flex justify-end gap-3">
            <button type="button" className={secondaryButtonClass} onClick={() => setEditOpen(false)}>取消</button>
            <button type="button" className={primaryButtonClass} onClick={() => void saveTemplate()}>保存</button>
          </div>
        )}
      >
        <div className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Product code"><input value={form.product_code} onChange={event => setForm(current => ({ ...current, product_code: event.target.value }))} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]" /></Field>
            <Field label="Template ID"><input value={form.template_id} onChange={event => setForm(current => ({ ...current, template_id: event.target.value }))} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]" /></Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Slug"><input value={form.slug} onChange={event => setForm(current => ({ ...current, slug: event.target.value }))} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]" /></Field>
            <Field label="Name"><input value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]" /></Field>
          </div>
          <Field label="Summary"><textarea value={form.summary} onChange={event => setForm(current => ({ ...current, summary: event.target.value }))} className="min-h-24 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]" /></Field>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Status"><input value={form.status} onChange={event => setForm(current => ({ ...current, status: event.target.value }))} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]" /></Field>
            <Field label="Scope"><input value={form.scope} onChange={event => setForm(current => ({ ...current, scope: event.target.value }))} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]" /></Field>
            <Field label="Managed source"><input value={form.managed_source} onChange={event => setForm(current => ({ ...current, managed_source: event.target.value }))} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]" /></Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Cover asset URL"><input value={form.cover_asset_url} onChange={event => setForm(current => ({ ...current, cover_asset_url: event.target.value }))} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]" /></Field>
            <Field label="Cover asset ID"><input value={form.cover_asset_id} onChange={event => setForm(current => ({ ...current, cover_asset_id: event.target.value }))} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]" /></Field>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <Field label="Recommend score"><input value={form.recommend_score} onChange={event => setForm(current => ({ ...current, recommend_score: event.target.value }))} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]" /></Field>
            <Field label="Series"><input value={form.series} onChange={event => setForm(current => ({ ...current, series: event.target.value }))} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]" /></Field>
            <Field label="Capability type"><input value={form.capability_type} onChange={event => setForm(current => ({ ...current, capability_type: event.target.value }))} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]" /></Field>
            <Field label="Modality"><input value={form.modality} onChange={event => setForm(current => ({ ...current, modality: event.target.value }))} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]" /></Field>
          </div>
          <Field label="Platforms JSON"><textarea value={form.platforms} onChange={event => setForm(current => ({ ...current, platforms: event.target.value }))} className="min-h-24 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 font-mono text-sm text-[var(--text)]" /></Field>
          <Field label="Tags JSON"><textarea value={form.tags} onChange={event => setForm(current => ({ ...current, tags: event.target.value }))} className="min-h-24 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 font-mono text-sm text-[var(--text)]" /></Field>
          <Field label="Raw JSON"><textarea value={form.raw} onChange={event => setForm(current => ({ ...current, raw: event.target.value }))} className="min-h-32 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 font-mono text-sm text-[var(--text)]" /></Field>
          <Field label="Detail JSON"><textarea value={form.detail_raw} onChange={event => setForm(current => ({ ...current, detail_raw: event.target.value }))} className="min-h-48 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 font-mono text-sm text-[var(--text)]" /></Field>
        </div>
      </EntityModal>

      <EntityModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={selectedItem ? `${selectedItem.name} · 聚合详情` : '模板聚合详情'}
        description="单模板详情通过弹窗查看，不再长期占据列表页面。这里保留原始 detail payload，便于运营核对模板结构和图片槽位。"
        footer={(
          <div className="flex justify-end gap-3">
            <button type="button" className={secondaryButtonClass} onClick={() => setDetailOpen(false)}>关闭</button>
            {selectedItem ? (
              <button
                type="button"
                className={primaryButtonClass}
                onClick={async () => {
                  try {
                    await platformClient.publishTemplateOpsCatalog(selectedItem.template_ref)
                    pushToast({ tone: 'success', title: '模板已发布到平台投影' })
                    await loadCatalog(selectedItem.template_ref)
                    await loadDetail(selectedItem.template_ref)
                  } catch (err) {
                    pushToast({ tone: 'error', title: '模板发布失败', description: err instanceof Error ? err.message : 'Failed to publish template projection' })
                  }
                }}
              >
                发布模板
              </button>
            ) : null}
          </div>
        )}
      >
        <div className="space-y-4">
          {selectedItem ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4">
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-2.5 py-1 text-xs font-medium text-[var(--text)]">{selectedItem.product_code}</span>
                {(selectedItem.platforms || []).slice(0, 4).map(tag => (
                  <span key={tag} className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-2.5 py-1 text-xs font-medium text-[var(--text-muted)]">{tag}</span>
                ))}
              </div>
              <p className="mt-3 text-sm text-[var(--text)]">{selectedItem.summary || '暂无摘要'}</p>
            </div>
          ) : null}
          <pre className="max-h-[560px] overflow-auto rounded-lg border border-[var(--border)] bg-slate-950/70 p-4 text-xs leading-6 text-slate-200">
            {detailLoading
              ? 'Loading detail...'
              : JSON.stringify(detail?.detail_raw || null, null, 2)}
          </pre>
        </div>
      </EntityModal>

      <TemplateOpsAssetModal
        open={assetOpen}
        setOpen={setAssetOpen}
        selectedItem={selectedItem}
        assetLoading={assetLoading}
        assetBindings={assetBindings}
        assetForm={assetForm}
        setAssetForm={setAssetForm}
        secondaryButtonClass={secondaryButtonClass}
        primaryButtonClass={primaryButtonClass}
        saveTemplateAsset={saveTemplateAsset}
        unbindTemplateAsset={unbindTemplateAsset}
      />
    </div>
  )
}
