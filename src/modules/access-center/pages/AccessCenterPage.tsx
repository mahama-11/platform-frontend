import { useEffect, useMemo, useState } from 'react'
import { Plus, ShieldCheck, ShieldEllipsis } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useSessionStore } from '@/app/store/sessionStore'
import { useToastStore } from '@/app/store/toastStore'
import { platformClient } from '@/shared/api/platformClient'
import { PageHeader } from '@/shared/ui/PageHeader'
import { SectionCard } from '@/shared/ui/SectionCard'
import { EntityModal } from '@/shared/ui/EntityModal'
import type { PermissionRecord, RoleRecord } from '@/shared/types/auth'

const secondaryButtonClass = 'inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-sm font-medium text-[var(--text)] transition-colors hover:border-[var(--border-strong)]'
const primaryButtonClass = 'inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-950 transition-colors hover:bg-slate-200'

function groupPermissions(items: PermissionRecord[]) {
  const grouped = new Map<string, PermissionRecord[]>()
  for (const item of items) {
    const key = item.category || 'general'
    const existing = grouped.get(key) || []
    existing.push(item)
    grouped.set(key, existing)
  }
  return [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0]))
}

export function AccessCenterPage() {
  const { t } = useTranslation()
  const currentUser = useSessionStore(state => state.currentUser)
  const storePermissions = useSessionStore(state => state.permissions)
  const pushToast = useToastStore(state => state.push)
  const [permissions, setPermissions] = useState<PermissionRecord[]>([])
  const [roles, setRoles] = useState<RoleRecord[]>([])
  const [selectedRoleId, setSelectedRoleId] = useState('')
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [savingRolePermissions, setSavingRolePermissions] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [permissionModalOpen, setPermissionModalOpen] = useState(false)
  const [roleModalOpen, setRoleModalOpen] = useState(false)
  const [editingPermission, setEditingPermission] = useState<PermissionRecord | null>(null)
  const [editingRole, setEditingRole] = useState<RoleRecord | null>(null)
  const [permissionForm, setPermissionForm] = useState({ id: '', category: '', name: '', description: '' })
  const [roleForm, setRoleForm] = useState({ id: '', name: '', description: '', is_system: false })

  const effectivePermissions = useMemo(() => {
    const merged = new Set([...(currentUser?.permissions || []), ...storePermissions])
    return [...merged].sort()
  }, [currentUser?.permissions, storePermissions])

  const permissionGroups = useMemo(() => groupPermissions(permissions), [permissions])

  async function loadWorkspace(nextRoleId?: string) {
    setLoading(true)
    try {
      setError(null)
      const [permissionResult, roleResult] = await Promise.all([
        platformClient.accessPermissions({ limit: 1000, offset: 0 }),
        platformClient.accessRoles({ limit: 1000, offset: 0 }),
      ])
      setPermissions(permissionResult.items)
      setRoles(roleResult.items)
      const resolvedRoleId = nextRoleId || selectedRoleId || roleResult.items[0]?.id || ''
      setSelectedRoleId(resolvedRoleId)
      if (resolvedRoleId) {
        const rolePermissions = await platformClient.rolePermissions(resolvedRoleId)
        setSelectedPermissionIds(rolePermissions.permission_ids)
      } else {
        setSelectedPermissionIds([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load access governance')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadWorkspace()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function reloadRolePermissions(roleId: string) {
    setSelectedRoleId(roleId)
    try {
      const result = await platformClient.rolePermissions(roleId)
      setSelectedPermissionIds(result.permission_ids)
    } catch (err) {
      pushToast({ tone: 'error', title: '加载角色权限失败', description: err instanceof Error ? err.message : 'Failed to load role permissions' })
    }
  }

  async function handleMutation(action: () => Promise<void>, successTitle: string, nextRoleId?: string) {
    try {
      await action()
      pushToast({ tone: 'success', title: successTitle })
      setPermissionModalOpen(false)
      setRoleModalOpen(false)
      setEditingPermission(null)
      setEditingRole(null)
      setPermissionForm({ id: '', category: '', name: '', description: '' })
      setRoleForm({ id: '', name: '', description: '', is_system: false })
      await loadWorkspace(nextRoleId)
    } catch (err) {
      pushToast({ tone: 'error', title: successTitle.replace('成功', '失败'), description: err instanceof Error ? err.message : 'Operation failed' })
    }
  }

  function openPermissionModal(item?: PermissionRecord) {
    setEditingPermission(item || null)
    setPermissionForm(item ? { id: item.id, category: item.category, name: item.name, description: item.description } : { id: '', category: '', name: '', description: '' })
    setPermissionModalOpen(true)
  }

  function openRoleModal(item?: RoleRecord) {
    setEditingRole(item || null)
    setRoleForm(item ? { id: item.id, name: item.name, description: item.description, is_system: item.is_system } : { id: '', name: '', description: '', is_system: false })
    setRoleModalOpen(true)
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={t('accessCenter.title')}
        description="直接治理权限、角色与角色权限关系，不再停留在只读展示。"
        actions={(
          <>
            <button type="button" className={secondaryButtonClass} onClick={() => openPermissionModal()}>
              <Plus className="h-4 w-4" />
              新建权限
            </button>
            <button type="button" className={primaryButtonClass} onClick={() => openRoleModal()}>
              <Plus className="h-4 w-4" />
              新建角色
            </button>
          </>
        )}
      />

      {error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">{error}</div>
      ) : null}

      <SectionCard title="Current authority" description="当前登录操作员的有效平台权限与组织角色。">
        <div className="grid gap-4 md:grid-cols-4">
          {[
            ['Platform role', currentUser?.role || '-'],
            ['Organization role', currentUser?.org_role || '-'],
            ['Effective permissions', String(effectivePermissions.length)],
            ['Platform admin', currentUser?.permissions.includes('platform.admin') ? 'yes' : 'no'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-5">
              <p className="text-xs uppercase tracking-wider font-medium text-[var(--text-soft)]">{label}</p>
              <p className="mt-2 text-sm font-medium text-[var(--text)] break-all">{value}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Permissions" description="全量权限目录，支持增删改查。">
          <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--bg)]">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--bg-muted)]">
                <tr>
                  <th className="px-4 py-3 text-[var(--text-muted)]">ID</th>
                  <th className="px-4 py-3 text-[var(--text-muted)]">Category</th>
                  <th className="px-4 py-3 text-[var(--text-muted)]">Name</th>
                  <th className="px-4 py-3 text-[var(--text-muted)]">Description</th>
                  <th className="px-4 py-3 text-right text-[var(--text-muted)]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {permissions.map(item => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 font-mono text-[var(--text)]">{item.id}</td>
                    <td className="px-4 py-3 text-[var(--text-muted)]">{item.category || '-'}</td>
                    <td className="px-4 py-3 text-[var(--text)]">{item.name}</td>
                    <td className="px-4 py-3 text-[var(--text-muted)]">{item.description || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button type="button" className={secondaryButtonClass} onClick={() => openPermissionModal(item)}>编辑</button>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-300 transition-colors hover:bg-rose-500/20"
                          onClick={() => void handleMutation(() => platformClient.deleteAccessPermission(item.id).then(() => undefined), '权限删除成功')}
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!permissions.length ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-[var(--text-muted)]">
                      {loading ? 'Loading permissions...' : 'No permissions returned.'}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="Roles" description="全量角色目录，支持增删改查，并绑定角色权限。">
          <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--bg)]">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--bg-muted)]">
                <tr>
                  <th className="px-4 py-3 text-[var(--text-muted)]">Role</th>
                  <th className="px-4 py-3 text-[var(--text-muted)]">Description</th>
                  <th className="px-4 py-3 text-[var(--text-muted)]">System</th>
                  <th className="px-4 py-3 text-right text-[var(--text-muted)]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {roles.map(item => (
                  <tr key={item.id} className={selectedRoleId === item.id ? 'bg-white/5' : undefined}>
                    <td className="px-4 py-3 font-medium text-[var(--text)]">{item.name}</td>
                    <td className="px-4 py-3 text-[var(--text-muted)]">{item.description || '-'}</td>
                    <td className="px-4 py-3 text-[var(--text-muted)]">{item.is_system ? 'yes' : 'no'}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button type="button" className={secondaryButtonClass} onClick={() => void reloadRolePermissions(item.id)}>选择</button>
                        <button type="button" className={secondaryButtonClass} onClick={() => openRoleModal(item)}>编辑</button>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-300 transition-colors hover:bg-rose-500/20"
                          onClick={() => void handleMutation(() => platformClient.deleteAccessRole(item.id).then(() => undefined), '角色删除成功')}
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!roles.length ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-[var(--text-muted)]">
                      {loading ? 'Loading roles...' : 'No roles returned.'}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Role permission mapping" description="直接为选中的角色分配权限，不再只是展示当前会话权限。">
        {selectedRoleId ? (
          <div className="space-y-6">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-sky-500/10 p-2 text-sky-300">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--text)]">Selected role: {selectedRoleId}</p>
                  <p className="text-sm text-[var(--text-muted)]">当前已勾选 {selectedPermissionIds.length} 个权限。</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              {permissionGroups.map(([category, items]) => (
                <div key={category} className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-5">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="rounded-md bg-[var(--bg-muted)] p-2 text-[var(--text-muted)]">
                      <ShieldEllipsis className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--text)]">{category}</p>
                      <p className="text-sm text-[var(--text-muted)]">{items.length} permissions</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {items.map(item => {
                      const checked = selectedPermissionIds.includes(item.id)
                      return (
                        <label key={item.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-muted)] px-4 py-3">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={event => {
                              setSelectedPermissionIds(current => event.target.checked
                                ? [...current, item.id]
                                : current.filter(permissionId => permissionId !== item.id))
                            }}
                            className="mt-1 h-4 w-4 rounded border-[var(--border)] bg-[var(--bg)]"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[var(--text)] break-all">{item.id}</p>
                            <p className="mt-1 text-sm text-[var(--text-muted)]">{item.description || item.name}</p>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                disabled={savingRolePermissions}
                className={primaryButtonClass}
                onClick={async () => {
                  try {
                    setSavingRolePermissions(true)
                    await platformClient.setRolePermissions(selectedRoleId, selectedPermissionIds)
                    pushToast({ tone: 'success', title: '角色权限已更新' })
                  } catch (err) {
                    pushToast({ tone: 'error', title: '角色权限更新失败', description: err instanceof Error ? err.message : 'Failed to update role permissions' })
                  } finally {
                    setSavingRolePermissions(false)
                  }
                }}
              >
                保存角色权限
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--bg)] px-4 py-8 text-center text-sm text-[var(--text-muted)]">
            先在角色列表中选择一个角色，再配置它的权限关系。
          </div>
        )}
      </SectionCard>

      <EntityModal
        open={permissionModalOpen}
        onClose={() => setPermissionModalOpen(false)}
        title={editingPermission ? '编辑权限' : '新建权限'}
        description="治理权限字典，供角色授权关系复用。"
        footer={(
          <div className="flex justify-end gap-3">
            <button type="button" className={secondaryButtonClass} onClick={() => setPermissionModalOpen(false)}>取消</button>
            <button
              type="button"
              className={primaryButtonClass}
              onClick={() => void handleMutation(
                () => editingPermission
                  ? platformClient.updateAccessPermission(editingPermission.id, permissionForm).then(() => undefined)
                  : platformClient.createAccessPermission(permissionForm).then(() => undefined),
                editingPermission ? '权限更新成功' : '权限创建成功',
              )}
            >
              保存
            </button>
          </div>
        )}
      >
        <div className="grid gap-4">
          <FormField label="Permission ID">
            <input value={permissionForm.id} disabled={Boolean(editingPermission)} onChange={event => setPermissionForm(current => ({ ...current, id: event.target.value }))} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]" />
          </FormField>
          <FormField label="Category">
            <input value={permissionForm.category} onChange={event => setPermissionForm(current => ({ ...current, category: event.target.value }))} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]" />
          </FormField>
          <FormField label="Name">
            <input value={permissionForm.name} onChange={event => setPermissionForm(current => ({ ...current, name: event.target.value }))} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]" />
          </FormField>
          <FormField label="Description">
            <textarea value={permissionForm.description} onChange={event => setPermissionForm(current => ({ ...current, description: event.target.value }))} className="min-h-24 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]" />
          </FormField>
        </div>
      </EntityModal>

      <EntityModal
        open={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
        title={editingRole ? '编辑角色' : '新建角色'}
        description="治理角色目录，供组织成员与用户上下文复用。"
        footer={(
          <div className="flex justify-end gap-3">
            <button type="button" className={secondaryButtonClass} onClick={() => setRoleModalOpen(false)}>取消</button>
            <button
              type="button"
              className={primaryButtonClass}
              onClick={() => void handleMutation(
                () => editingRole
                  ? platformClient.updateAccessRole(editingRole.id, roleForm).then(() => undefined)
                  : platformClient.createAccessRole(roleForm).then(() => undefined),
                editingRole ? '角色更新成功' : '角色创建成功',
                editingRole?.id || roleForm.id,
              )}
            >
              保存
            </button>
          </div>
        )}
      >
        <div className="grid gap-4">
          <FormField label="Role ID">
            <input value={roleForm.id} disabled={Boolean(editingRole)} onChange={event => setRoleForm(current => ({ ...current, id: event.target.value }))} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]" />
          </FormField>
          <FormField label="Name">
            <input value={roleForm.name} onChange={event => setRoleForm(current => ({ ...current, name: event.target.value }))} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]" />
          </FormField>
          <FormField label="Description">
            <textarea value={roleForm.description} onChange={event => setRoleForm(current => ({ ...current, description: event.target.value }))} className="min-h-24 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]" />
          </FormField>
          <label className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm text-[var(--text)]">
            <input type="checkbox" checked={roleForm.is_system} onChange={event => setRoleForm(current => ({ ...current, is_system: event.target.checked }))} />
            System role
          </label>
        </div>
      </EntityModal>
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-[var(--text)]">{label}</span>
      {children}
    </label>
  )
}
