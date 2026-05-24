import type { Dispatch, SetStateAction } from 'react'

import { EntityModal } from '@/shared/ui/EntityModal'
import type { TemplateAssetBinding, TemplateOpsCatalogItem } from '@/shared/types/platform'
import { Field } from './TemplateOpsFormField'
import { readFileAsDataURL } from './templateOpsPageUtils'

type AssetFormState = {
  asset_role: string
  title: string
  description: string
  asset_ref: string
  storage_file_name: string
  file_name: string
  mime_type: string
  payload: string
}

type TemplateOpsAssetModalProps = {
  open: boolean
  setOpen: (open: boolean) => void
  selectedItem: TemplateOpsCatalogItem | null
  assetLoading: boolean
  assetBindings: TemplateAssetBinding[]
  assetForm: AssetFormState
  setAssetForm: Dispatch<SetStateAction<AssetFormState>>
  secondaryButtonClass: string
  primaryButtonClass: string
  saveTemplateAsset: () => void | Promise<void>
  unbindTemplateAsset: (assetRole: string) => void | Promise<void>
}

export function TemplateOpsAssetModal({
  open,
  setOpen,
  selectedItem,
  assetLoading,
  assetBindings,
  assetForm,
  setAssetForm,
  secondaryButtonClass,
  primaryButtonClass,
  saveTemplateAsset,
  unbindTemplateAsset,
}: TemplateOpsAssetModalProps) {
  return (
    <EntityModal
      open={open}
      onClose={() => setOpen(false)}
      title={selectedItem ? `${selectedItem.name} · 图片管理` : '模板图片管理'}
      description="单模板走单独关联和替换；批量导入则继续由 CSV 预检识别缺图，再按固定 source_ref 规则批量导入资源。"
      footer={(
        <div className="flex justify-end gap-3">
          <button type="button" className={secondaryButtonClass} onClick={() => setOpen(false)}>关闭</button>
          <button type="button" className={primaryButtonClass} disabled={!assetForm.payload} onClick={() => void saveTemplateAsset()}>
            上传并绑定
          </button>
        </div>
      )}
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4 text-sm text-[var(--text-muted)]">
            <p className="font-medium text-[var(--text)]">当前绑定</p>
            <p className="mt-1">批量场景下，平台按 `toolSlug + templateCode + exampleIndex` 自动生成 `source_ref`；单模板只需要选择槽位并上传图片。</p>
          </div>
          <div className="max-h-[420px] overflow-auto rounded-lg border border-[var(--border)]">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--bg-muted)]">
                <tr>
                  <th className="px-3 py-2 text-[var(--text-muted)]">槽位</th>
                  <th className="px-3 py-2 text-[var(--text-muted)]">source_ref</th>
                  <th className="px-3 py-2 text-[var(--text-muted)]">状态</th>
                  <th className="px-3 py-2 text-right text-[var(--text-muted)]">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {assetBindings.length ? assetBindings.map(binding => (
                  <tr key={binding.asset_role}>
                    <td className="px-3 py-2 text-[var(--text)]">{binding.asset_role}</td>
                    <td className="px-3 py-2 text-[var(--text-muted)]">
                      <div className="max-w-[320px] truncate">{binding.source_ref}</div>
                      {binding.storage_key ? <div className="mt-1 text-xs text-[var(--text-soft)]">{binding.storage_key}</div> : null}
                    </td>
                    <td className="px-3 py-2 text-[var(--text-muted)]">{binding.status}</td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className={secondaryButtonClass}
                          onClick={() => setAssetForm(current => ({
                            ...current,
                            asset_role: binding.asset_role,
                            title: binding.title || '',
                            description: binding.description || '',
                            asset_ref: binding.asset_ref || '',
                            storage_file_name: binding.file_name || '',
                            file_name: binding.file_name || '',
                            mime_type: binding.mime_type || '',
                          }))}
                        >
                          替换
                        </button>
                        <button type="button" className={secondaryButtonClass} onClick={() => void unbindTemplateAsset(binding.asset_role)}>
                          解绑
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-[var(--text-muted)]">
                      {assetLoading ? 'Loading assets...' : '当前模板还没有可识别的图片绑定。'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4">
          <p className="text-sm font-semibold text-[var(--text)]">单模板上传 / 替换</p>
          <Field label="图片槽位">
            <input value={assetForm.asset_role} onChange={event => setAssetForm(current => ({ ...current, asset_role: event.target.value }))} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]" />
          </Field>
          <Field label="标题">
            <input value={assetForm.title} onChange={event => setAssetForm(current => ({ ...current, title: event.target.value }))} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]" />
          </Field>
          <Field label="描述">
            <textarea value={assetForm.description} onChange={event => setAssetForm(current => ({ ...current, description: event.target.value }))} className="min-h-20 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]" />
          </Field>
          <Field label="Asset ref">
            <input value={assetForm.asset_ref} onChange={event => setAssetForm(current => ({ ...current, asset_ref: event.target.value }))} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]" />
          </Field>
          <input
            type="file"
            accept="image/*"
            className="block w-full text-sm text-[var(--text-muted)]"
            onChange={async event => {
              const file = event.target.files?.[0]
              if (!file) return
              const payload = await readFileAsDataURL(file)
              setAssetForm(current => ({
                ...current,
                payload,
                file_name: file.name,
                storage_file_name: file.name,
                mime_type: file.type || 'image/png',
              }))
            }}
          />
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-muted)] p-3 text-xs text-[var(--text-muted)]">
            <p>批量模式：CSV 先导入模板，平台自动推导 `source_ref`，再批量导入图片资源。</p>
            <p className="mt-1">单模板模式：这里直接上传单张图片并绑定到指定槽位，用于补图、替换和纠偏。</p>
          </div>
        </div>
      </div>
    </EntityModal>
  )
}
