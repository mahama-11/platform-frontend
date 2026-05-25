import type { Dispatch, SetStateAction } from 'react'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'

import { EntityModal } from '@/shared/ui/EntityModal'
import type {
  BatchUploadAssetsResult,
  PreparedAssetImportResult,
  PreparedTemplateOpsImportBundle,
  TemplateOpsImportPreviewAssetCheck,
  TemplateOpsImportPreviewResult,
} from '@/shared/types/platform'

export interface UploadedBatchAssetCandidate {
  id: string
  file_name: string
  mime_type: string
  payload: string
  selected_key: string
  suggested_key: string
}

interface MissingAssetOption {
  key: string
  label: string
  asset: TemplateOpsImportPreviewAssetCheck
}

interface TemplateOpsCsvImportModalProps {
  open: boolean
  csvContent: string
  publishAfterImport: boolean
  csvPreviewLoading: boolean
  csvImporting: boolean
  preparedAssetImporting: boolean
  batchAssetUploading: boolean
  csvPreview: TemplateOpsImportPreviewResult | null
  preparedBundle: PreparedTemplateOpsImportBundle | null
  preparedAssetResult: PreparedAssetImportResult | null
  batchAssetResult: BatchUploadAssetsResult | null
  missingPreviewAssets: TemplateOpsImportPreviewAssetCheck[]
  missingAssetOptions: MissingAssetOption[]
  uploadedBatchAssets: UploadedBatchAssetCandidate[]
  secondaryButtonClass: string
  primaryButtonClass: string
  setOpen: (open: boolean) => void
  setCsvContent: (value: string) => void
  setCsvPreview: (value: TemplateOpsImportPreviewResult | null) => void
  setPublishAfterImport: (value: boolean) => void
  setUploadedBatchAssets: Dispatch<SetStateAction<UploadedBatchAssetCandidate[]>>
  resetCSVFlow: () => void
  loadPreparedRealCSV: () => Promise<void>
  previewCSVImport: () => Promise<void>
  importCSV: () => Promise<void>
  importPreparedAssets: () => Promise<void>
  handleBatchAssetFilesSelected: (fileList: FileList | null) => Promise<void>
  uploadMatchedBatchAssets: () => Promise<void>
}

export function TemplateOpsCsvImportModal({
  open,
  csvContent,
  publishAfterImport,
  csvPreviewLoading,
  csvImporting,
  preparedAssetImporting,
  batchAssetUploading,
  csvPreview,
  preparedBundle,
  preparedAssetResult,
  batchAssetResult,
  missingPreviewAssets,
  missingAssetOptions,
  uploadedBatchAssets,
  secondaryButtonClass,
  primaryButtonClass,
  setOpen,
  setCsvContent,
  setCsvPreview,
  setPublishAfterImport,
  setUploadedBatchAssets,
  resetCSVFlow,
  loadPreparedRealCSV,
  previewCSVImport,
  importCSV,
  importPreparedAssets,
  handleBatchAssetFilesSelected,
  uploadMatchedBatchAssets,
}: TemplateOpsCsvImportModalProps) {
  return (
    <EntityModal
      open={open}
      onClose={() => setOpen(false)}
      title="批量导入模板 CSV"
      description="先加载或上传 CSV，再做预检。平台会提前告诉你哪些行可直接导入、哪些模板还缺示例图片，避免整批重来。"
      footer={(
        <div className="flex justify-end gap-3">
          <button type="button" className={secondaryButtonClass} onClick={() => { setOpen(false); resetCSVFlow() }}>取消</button>
          <button
            type="button"
            className={primaryButtonClass}
            disabled={!csvPreview?.summary.ready_to_import_count || csvImporting}
            onClick={() => void importCSV()}
          >
            {csvImporting ? '导入中...' : '确认导入'}
          </button>
        </div>
      )}
    >
      <div className="space-y-4">
        <CsvRules secondaryButtonClass={secondaryButtonClass} loadPreparedRealCSV={loadPreparedRealCSV} csvContent={csvContent} csvPreviewLoading={csvPreviewLoading} previewCSVImport={previewCSVImport} />
        {preparedBundle ? <PreparedBundleNotice bundle={preparedBundle} /> : null}
        <label className="inline-flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm text-[var(--text)]">
          <input type="checkbox" checked={publishAfterImport} onChange={event => setPublishAfterImport(event.target.checked)} />
          导入后自动发布
        </label>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={async event => {
            const file = event.target.files?.[0]
            if (!file) return
            const text = await file.text()
            setCsvContent(text)
          }}
          className="block w-full text-sm text-[var(--text-muted)]"
        />
        <textarea
          value={csvContent}
          onChange={event => {
            setCsvContent(event.target.value)
            setCsvPreview(null)
          }}
          placeholder="粘贴 CSV 内容，或先下载模板后用 Excel 编辑并上传..."
          className="min-h-[360px] w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-3 font-mono text-sm text-[var(--text)]"
        />
        {csvPreview ? (
          <CsvPreviewPanel
            csvPreview={csvPreview}
            preparedBundle={preparedBundle}
            preparedAssetImporting={preparedAssetImporting}
            batchAssetUploading={batchAssetUploading}
            preparedAssetResult={preparedAssetResult}
            batchAssetResult={batchAssetResult}
            missingPreviewAssets={missingPreviewAssets}
            missingAssetOptions={missingAssetOptions}
            uploadedBatchAssets={uploadedBatchAssets}
            secondaryButtonClass={secondaryButtonClass}
            setUploadedBatchAssets={setUploadedBatchAssets}
            importPreparedAssets={importPreparedAssets}
            handleBatchAssetFilesSelected={handleBatchAssetFilesSelected}
            uploadMatchedBatchAssets={uploadMatchedBatchAssets}
          />
        ) : null}
      </div>
    </EntityModal>
  )
}

function CsvRules({ secondaryButtonClass, loadPreparedRealCSV, csvContent, csvPreviewLoading, previewCSVImport }: {
  secondaryButtonClass: string
  loadPreparedRealCSV: () => Promise<void>
  csvContent: string
  csvPreviewLoading: boolean
  previewCSVImport: () => Promise<void>
}) {
  return (
    <>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4 text-sm text-[var(--text-muted)]">
        <p className="font-medium text-[var(--text)]">固定规则</p>
        <ul className="mt-2 space-y-1">
          <li>- 必填列：`product_code`、`template_id`、`name`</li>
          <li>- 批量维护推荐用 Excel 编辑后另存为 CSV</li>
          <li>- `platforms_json`、`tags_json`、`raw_json`、`detail_json` 必须是合法 JSON</li>
          <li>- 已存在 `product_code + template_id` 会更新，不存在会创建</li>
        </ul>
      </div>
      <div className="flex flex-wrap gap-3">
        <button type="button" className={secondaryButtonClass} onClick={() => void loadPreparedRealCSV()}>
          加载真实样例 CSV
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          disabled={!csvContent.trim() || csvPreviewLoading}
          onClick={() => void previewCSVImport()}
        >
          {csvPreviewLoading ? '预检中...' : '执行预检'}
        </button>
      </div>
    </>
  )
}

function PreparedBundleNotice({ bundle }: { bundle: PreparedTemplateOpsImportBundle }) {
  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
      <p className="font-medium text-white">已载入真实验证数据</p>
      <p className="mt-2 text-emerald-100/80">
        模板 {bundle.template_count} 条，其中 Menu {bundle.menu_template_count} / Ecommerce {bundle.ecommerce_template_count}；
        关联图片 {bundle.asset_manifest_item_count} 张。
      </p>
      <p className="mt-1 text-xs text-emerald-100/70">CSV: {bundle.csv_path}</p>
      <p className="mt-1 text-xs text-emerald-100/70">Asset manifest: {bundle.asset_manifest_path}</p>
    </div>
  )
}

function CsvPreviewPanel({
  csvPreview,
  preparedBundle,
  preparedAssetImporting,
  batchAssetUploading,
  preparedAssetResult,
  batchAssetResult,
  missingPreviewAssets,
  missingAssetOptions,
  uploadedBatchAssets,
  secondaryButtonClass,
  setUploadedBatchAssets,
  importPreparedAssets,
  handleBatchAssetFilesSelected,
  uploadMatchedBatchAssets,
}: {
  csvPreview: TemplateOpsImportPreviewResult
  preparedBundle: PreparedTemplateOpsImportBundle | null
  preparedAssetImporting: boolean
  batchAssetUploading: boolean
  preparedAssetResult: PreparedAssetImportResult | null
  batchAssetResult: BatchUploadAssetsResult | null
  missingPreviewAssets: TemplateOpsImportPreviewAssetCheck[]
  missingAssetOptions: MissingAssetOption[]
  uploadedBatchAssets: UploadedBatchAssetCandidate[]
  secondaryButtonClass: string
  setUploadedBatchAssets: Dispatch<SetStateAction<UploadedBatchAssetCandidate[]>>
  importPreparedAssets: () => Promise<void>
  handleBatchAssetFilesSelected: (fileList: FileList | null) => Promise<void>
  uploadMatchedBatchAssets: () => Promise<void>
}) {
  return (
    <div className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4">
      <div className="grid gap-3 md:grid-cols-4">
        <PreviewStat label="总行数" value={String(csvPreview.summary.total_rows)} tone="default" />
        <PreviewStat label="有效行" value={String(csvPreview.summary.valid_rows)} tone="success" />
        <PreviewStat label="待补图" value={String(csvPreview.summary.missing_asset_count)} tone={csvPreview.summary.missing_asset_count ? 'warning' : 'success'} />
        <PreviewStat label="可直接导入" value={String(csvPreview.summary.ready_to_import_count)} tone="default" />
      </div>
      {csvPreview.summary.missing_asset_count > 0 ? (
        <MissingAssetsNotice preparedBundle={preparedBundle} preparedAssetImporting={preparedAssetImporting} secondaryButtonClass={secondaryButtonClass} importPreparedAssets={importPreparedAssets} />
      ) : <CsvReadyNotice />}
      {missingPreviewAssets.length ? (
        <MissingAssetsManager
          missingPreviewAssets={missingPreviewAssets}
          missingAssetOptions={missingAssetOptions}
          uploadedBatchAssets={uploadedBatchAssets}
          batchAssetUploading={batchAssetUploading}
          secondaryButtonClass={secondaryButtonClass}
          setUploadedBatchAssets={setUploadedBatchAssets}
          handleBatchAssetFilesSelected={handleBatchAssetFilesSelected}
          uploadMatchedBatchAssets={uploadMatchedBatchAssets}
        />
      ) : null}
      {preparedAssetResult ? <PreparedAssetResultCard result={preparedAssetResult} /> : null}
      {batchAssetResult ? <BatchAssetResultCard result={batchAssetResult} /> : null}
      <CsvRowsPreview rows={csvPreview.rows} />
    </div>
  )
}

function MissingAssetsNotice({ preparedBundle, preparedAssetImporting, secondaryButtonClass, importPreparedAssets }: {
  preparedBundle: PreparedTemplateOpsImportBundle | null
  preparedAssetImporting: boolean
  secondaryButtonClass: string
  importPreparedAssets: () => Promise<void>
}) {
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-medium text-white">发现缺失图片资源</p>
          <p className="mt-1 text-amber-100/80">平台已列出缺图明细。对于当前真实样例数据，可以直接一键导入缺失图片；导入后会自动重新预检，不需要重做整份 CSV。</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {preparedBundle ? (
              <button type="button" className={secondaryButtonClass} disabled={preparedAssetImporting} onClick={() => void importPreparedAssets()}>
                {preparedAssetImporting ? '补图中...' : '一键导入真实样例图片'}
              </button>
            ) : null}
            <span className="inline-flex items-center rounded-lg border border-amber-400/20 px-3 py-2 text-xs text-amber-100/80">任意自定义 CSV 已支持缺图识别；通用批量补传入口下一步继续补齐。</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function CsvReadyNotice() {
  return (
    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
      <div className="flex items-start gap-2">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-medium text-white">预检通过</p>
          <p className="mt-1 text-emerald-100/80">当前 CSV 已满足导入条件，可以直接执行正式导入。</p>
        </div>
      </div>
    </div>
  )
}

function MissingAssetsManager({ missingPreviewAssets, missingAssetOptions, uploadedBatchAssets, batchAssetUploading, secondaryButtonClass, setUploadedBatchAssets, handleBatchAssetFilesSelected, uploadMatchedBatchAssets }: {
  missingPreviewAssets: TemplateOpsImportPreviewAssetCheck[]
  missingAssetOptions: MissingAssetOption[]
  uploadedBatchAssets: UploadedBatchAssetCandidate[]
  batchAssetUploading: boolean
  secondaryButtonClass: string
  setUploadedBatchAssets: Dispatch<SetStateAction<UploadedBatchAssetCandidate[]>>
  handleBatchAssetFilesSelected: (fileList: FileList | null) => Promise<void>
  uploadMatchedBatchAssets: () => Promise<void>
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-muted)] p-4">
      <p className="text-sm font-semibold text-[var(--text)]">缺图明细</p>
      <p className="mt-1 text-sm text-[var(--text-muted)]">当前预检识别到的缺失图片会按 `source_ref` 列出。你可以直接上传一批图片，平台会先自动建议匹配，再允许手动调整后批量补齐。</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <input type="file" multiple accept="image/*" className="block text-sm text-[var(--text-muted)]" onChange={event => void handleBatchAssetFilesSelected(event.target.files)} />
        <button type="button" className={secondaryButtonClass} disabled={!uploadedBatchAssets.some(item => item.selected_key) || batchAssetUploading} onClick={() => void uploadMatchedBatchAssets()}>
          {batchAssetUploading ? '批量补图中...' : '批量上传已匹配图片'}
        </button>
      </div>
      <div className="mt-3 max-h-48 overflow-auto rounded-lg border border-[var(--border)] bg-[var(--bg)]">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-[var(--border)] bg-[var(--bg-muted)]"><tr><th className="px-3 py-2 text-[var(--text-muted)]">业务域</th><th className="px-3 py-2 text-[var(--text-muted)]">source_ref</th><th className="px-3 py-2 text-[var(--text-muted)]">类别</th></tr></thead>
          <tbody className="divide-y divide-[var(--border)]">
            {missingPreviewAssets.slice(0, 20).map(asset => <tr key={`${asset.product_code}-${asset.source_ref}`}><td className="px-3 py-2 text-[var(--text)]">{asset.product_code}</td><td className="px-3 py-2 text-[var(--text-muted)]">{asset.source_ref}</td><td className="px-3 py-2 text-[var(--text-muted)]">{asset.category}</td></tr>)}
          </tbody>
        </table>
      </div>
      {uploadedBatchAssets.length ? <UploadedBatchAssetTable items={uploadedBatchAssets} options={missingAssetOptions} setItems={setUploadedBatchAssets} /> : null}
    </div>
  )
}

function UploadedBatchAssetTable({ items, options, setItems }: { items: UploadedBatchAssetCandidate[]; options: MissingAssetOption[]; setItems: Dispatch<SetStateAction<UploadedBatchAssetCandidate[]>> }) {
  return (
    <div className="mt-4 space-y-3">
      <p className="text-sm font-semibold text-[var(--text)]">待上传图片匹配</p>
      <div className="max-h-64 overflow-auto rounded-lg border border-[var(--border)] bg-[var(--bg)]">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-[var(--border)] bg-[var(--bg-muted)]"><tr><th className="px-3 py-2 text-[var(--text-muted)]">文件</th><th className="px-3 py-2 text-[var(--text-muted)]">建议匹配</th><th className="px-3 py-2 text-[var(--text-muted)]">目标 source_ref</th></tr></thead>
          <tbody className="divide-y divide-[var(--border)]">
            {items.map(item => (
              <tr key={item.id}>
                <td className="px-3 py-2 text-[var(--text)]">{item.file_name}</td>
                <td className="px-3 py-2 text-[var(--text-muted)]">{item.suggested_key ? (options.find(option => option.key === item.suggested_key)?.label || 'Auto matched') : '未自动命中'}</td>
                <td className="px-3 py-2"><select value={item.selected_key} onChange={event => setItems(current => current.map(candidate => candidate.id === item.id ? { ...candidate, selected_key: event.target.value } : candidate))} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]"><option value="">暂不上传</option>{options.map(option => <option key={option.key} value={option.key}>{option.label}</option>)}</select></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PreparedAssetResultCard({ result }: { result: PreparedAssetImportResult }) {
  return <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100"><p className="font-medium text-white">批量补图结果</p><p className="mt-1 text-emerald-100/80">新增 {result.imported_count} 张，已就绪 {result.skipped_count} 张，失败 {result.failed_count} 张。</p><p className="mt-1 text-xs text-emerald-100/70">Manifest: {result.manifest_path}</p></div>
}

function BatchAssetResultCard({ result }: { result: BatchUploadAssetsResult }) {
  return <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100"><p className="font-medium text-white">通用批量补图结果</p><p className="mt-1 text-emerald-100/80">成功 {result.imported_count} 张，失败 {result.failed_count} 张。</p></div>
}

function CsvRowsPreview({ rows }: { rows: TemplateOpsImportPreviewResult['rows'] }) {
  return (
    <div className="max-h-72 overflow-auto rounded-lg border border-[var(--border)]">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-[var(--border)] bg-[var(--bg-muted)]"><tr><th className="px-3 py-2 text-[var(--text-muted)]">行</th><th className="px-3 py-2 text-[var(--text-muted)]">模板</th><th className="px-3 py-2 text-[var(--text-muted)]">动作</th><th className="px-3 py-2 text-[var(--text-muted)]">资源状态</th><th className="px-3 py-2 text-[var(--text-muted)]">说明</th></tr></thead>
        <tbody className="divide-y divide-[var(--border)]">
          {rows.slice(0, 24).map(row => {
            const readyAssetCount = (row.asset_checks || []).filter(asset => asset.status === 'ready').length
            const missingAssetCount = (row.asset_checks || []).filter(asset => asset.status !== 'ready').length
            return <tr key={`${row.row}-${row.template_ref}`}><td className="px-3 py-2 text-[var(--text-muted)]">{row.row}</td><td className="px-3 py-2 text-[var(--text)]">{row.template_ref || '-'}</td><td className="px-3 py-2 text-[var(--text)]">{row.action}</td><td className="px-3 py-2 text-[var(--text-muted)]">{row.asset_checks?.length ? `${readyAssetCount} ready / ${missingAssetCount} missing` : 'No asset dependency'}</td><td className="px-3 py-2 text-[var(--text-muted)]">{row.error || (row.ready_to_import ? '可导入' : '需先补资源')}</td></tr>
          })}
        </tbody>
      </table>
    </div>
  )
}

function PreviewStat({ label, value, tone }: { label: string; value: string; tone: 'default' | 'success' | 'warning' }) {
  const toneClass = tone === 'success'
    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
    : tone === 'warning'
      ? 'border-amber-500/30 bg-amber-500/10 text-amber-100'
      : 'border-[var(--border)] bg-[var(--bg-muted)] text-[var(--text)]'
  return <div className={`rounded-xl border p-4 ${toneClass}`}><p className="text-xs uppercase tracking-wide opacity-80">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>
}
