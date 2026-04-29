import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Plus, RefreshCcw, UserRound, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useSessionStore } from '@/app/store/sessionStore'
import { useShellStore } from '@/app/store/shellStore'
import { useToastStore } from '@/app/store/toastStore'
import { platformClient } from '@/shared/api/platformClient'
import { PageHeader } from '@/shared/ui/PageHeader'
import { SectionCard } from '@/shared/ui/SectionCard'
import { EntityModal } from '@/shared/ui/EntityModal'
import type { OrganizationLite, OrganizationMemberRecord, PlatformOrganizationRecord, PlatformUserDirectoryRecord } from '@/shared/types/auth'

const secondaryButtonClass = 'inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-sm font-medium text-[var(--text)] transition-colors hover:border-[var(--border-strong)]'
const primaryButtonClass = 'inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-950 transition-colors hover:bg-slate-200'

function tone(roleOrStatus: string) {
  const normalized = roleOrStatus.toLowerCase()
  if (normalized.includes('owner')) return 'border-sky-500/20 bg-sky-500/10 text-sky-300'
  if (normalized.includes('admin') || normalized.includes('active')) return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
  return 'border-[var(--border)] bg-[var(--bg-muted)] text-[var(--text-muted)]'
}

export function OrganizationsPage() {
  const { t } = useTranslation()
  const currentUser = useSessionStore(state => state.currentUser)
  const currentOrgId = useSessionStore(state => state.currentOrgId)
  const switchOrganization = useSessionStore(state => state.switchOrganization)
  const opsScope = useShellStore(state => state.opsScope)
  const pushToast = useToastStore(state => state.push)
  const [workspaceOrganizations, setWorkspaceOrganizations] = useState<OrganizationLite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [switchingOrgId, setSwitchingOrgId] = useState<string | null>(null)
  const [platformOrganizations, setPlatformOrganizations] = useState<PlatformOrganizationRecord[]>([])
  const [platformUsers, setPlatformUsers] = useState<PlatformUserDirectoryRecord[]>([])
  const [selectedOrgId, setSelectedOrgId] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [members, setMembers] = useState<OrganizationMemberRecord[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [globalLoading, setGlobalLoading] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [orgModalOpen, setOrgModalOpen] = useState(false)
  const [userModalOpen, setUserModalOpen] = useState(false)
  const [memberModalOpen, setMemberModalOpen] = useState(false)
  const [editingOrg, setEditingOrg] = useState<PlatformOrganizationRecord | null>(null)
  const [editingUser, setEditingUser] = useState<PlatformUserDirectoryRecord | null>(null)
  const [editingMember, setEditingMember] = useState<OrganizationMemberRecord | null>(null)
  const [orgForm, setOrgForm] = useState({ name: '', plan_id: '', billing_email: '', status: 'active', owner_id: '' })
  const [userForm, setUserForm] = useState({ email: '', full_name: '', password: '', avatar_url: '', role: 'user', status: 'active', current_org_id: '', last_active_org_id: '', is_platform_admin: false })
  const [memberForm, setMemberForm] = useState({ user_id: '', role: 'viewer', status: 'active' })

  const canManageGlobal = currentUser?.permissions.includes('platform.admin') ?? false

  const selectedOrganization = useMemo(
    () => platformOrganizations.find(item => item.id === selectedOrgId) || null,
    [platformOrganizations, selectedOrgId],
  )
  const selectedUser = useMemo(
    () => platformUsers.find(item => item.id === selectedUserId) || null,
    [platformUsers, selectedUserId],
  )
  const activeWorkspace = useMemo(
    () => workspaceOrganizations.find(item => item.id === currentOrgId) || currentUser?.orgs.find(item => item.id === currentOrgId) || null,
    [workspaceOrganizations, currentOrgId, currentUser?.orgs],
  )

  async function loadWorkspaceOrganizations() {
    const result = await platformClient.organizations()
    setWorkspaceOrganizations(result)
  }

  async function loadMembers(orgId: string) {
    if (!orgId) {
      setMembers([])
      return
    }
    try {
      setMembersLoading(true)
      const result = await platformClient.organizationMembers(orgId)
      setMembers(result.items)
    } catch (err) {
      pushToast({ tone: 'error', title: '加载组织成员失败', description: err instanceof Error ? err.message : 'Failed to load organization members' })
    } finally {
      setMembersLoading(false)
    }
  }

  async function loadGlobalGovernance(nextOrgId?: string, nextUserId?: string) {
    if (!canManageGlobal) return
    setGlobalLoading(true)
    try {
      setGlobalError(null)
      const [orgResult, userResult] = await Promise.all([
        platformClient.opsOrganizations({ limit: 1000, offset: 0 }),
        platformClient.opsUsers({ limit: 1000, offset: 0 }),
      ])
      setPlatformOrganizations(orgResult.items)
      setPlatformUsers(userResult.items)
      const resolvedOrgId = nextOrgId || selectedOrgId || orgResult.items[0]?.id || ''
      const resolvedUserId = nextUserId || selectedUserId || userResult.items[0]?.id || ''
      setSelectedOrgId(resolvedOrgId)
      setSelectedUserId(resolvedUserId)
      if (resolvedOrgId) {
        await loadMembers(resolvedOrgId)
      } else {
        setMembers([])
      }
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Failed to load organization governance')
    } finally {
      setGlobalLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        await loadWorkspaceOrganizations()
        if (!cancelled && opsScope === 'global' && canManageGlobal) {
          await loadGlobalGovernance()
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load organizations')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opsScope, canManageGlobal])

  async function handleMutation(action: () => Promise<void>, successTitle: string, nextOrgId?: string, nextUserId?: string) {
    try {
      await action()
      pushToast({ tone: 'success', title: successTitle })
      setOrgModalOpen(false)
      setUserModalOpen(false)
      setMemberModalOpen(false)
      setEditingOrg(null)
      setEditingUser(null)
      setEditingMember(null)
      setOrgForm({ name: '', plan_id: '', billing_email: '', status: 'active', owner_id: '' })
      setUserForm({ email: '', full_name: '', password: '', avatar_url: '', role: 'user', status: 'active', current_org_id: '', last_active_org_id: '', is_platform_admin: false })
      setMemberForm({ user_id: '', role: 'viewer', status: 'active' })
      await Promise.all([loadWorkspaceOrganizations(), loadGlobalGovernance(nextOrgId, nextUserId)])
    } catch (err) {
      pushToast({ tone: 'error', title: successTitle.replace('成功', '失败'), description: err instanceof Error ? err.message : 'Operation failed' })
    }
  }

  function openOrgModal(item?: PlatformOrganizationRecord) {
    setEditingOrg(item || null)
    setOrgForm(item ? {
      name: item.name,
      plan_id: item.plan_id || '',
      billing_email: item.billing_email || '',
      status: item.status,
      owner_id: item.owner_id || '',
    } : { name: '', plan_id: '', billing_email: '', status: 'active', owner_id: '' })
    setOrgModalOpen(true)
  }

  function openUserModal(item?: PlatformUserDirectoryRecord) {
    setEditingUser(item || null)
    setUserForm(item ? {
      email: item.email,
      full_name: item.full_name,
      password: '',
      avatar_url: item.avatar_url || '',
      role: item.role || 'user',
      status: item.status || 'active',
      current_org_id: item.current_org_id || '',
      last_active_org_id: item.last_active_org_id || '',
      is_platform_admin: item.is_platform_admin,
    } : { email: '', full_name: '', password: '', avatar_url: '', role: 'user', status: 'active', current_org_id: selectedOrgId || '', last_active_org_id: selectedOrgId || '', is_platform_admin: false })
    setUserModalOpen(true)
  }

  function openMemberModal(item?: OrganizationMemberRecord) {
    setEditingMember(item || null)
    setMemberForm(item ? { user_id: item.user_id, role: item.role, status: item.status } : { user_id: selectedUserId || '', role: 'viewer', status: 'active' })
    setMemberModalOpen(true)
  }

  const handleSwitchOrganization = async (organizationId: string) => {
    try {
      setSwitchingOrgId(organizationId)
      await switchOrganization(organizationId)
      pushToast({ tone: 'success', title: 'Workspace switched', description: 'Organization context updated.' })
    } catch (err) {
      pushToast({ tone: 'error', title: 'Workspace switch failed', description: err instanceof Error ? err.message : 'Failed to switch workspace' })
    } finally {
      setSwitchingOrgId(null)
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={t('organizations.title')}
        description="组织、用户和组织成员关系的一体化治理面。平台运营默认从组织图谱进入，再下钻成员与用户。"
        actions={opsScope === 'global' && canManageGlobal ? (
          <>
            <button type="button" className={secondaryButtonClass} onClick={() => openUserModal()}>
              <Plus className="h-4 w-4" />
              新建用户
            </button>
            <button type="button" className={primaryButtonClass} onClick={() => openOrgModal()}>
              <Plus className="h-4 w-4" />
              新建组织
            </button>
          </>
        ) : undefined}
      />

      {error ? <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">{error}</div> : null}

      <SectionCard title="Current operator" description="当前平台操作员和工作区状态。">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-muted)] text-[var(--text-muted)]">
                <UserRound className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-base font-semibold text-[var(--text)]">{currentUser?.full_name || 'Unknown operator'}</p>
                <p className="mt-1 text-sm text-[var(--text-muted)] break-all">{currentUser?.email || '-'}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium ${tone(currentUser?.org_role || '')}`}>
                {currentUser?.org_role || 'no org role'}
              </span>
              <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium ${tone(currentUser?.status || '')}`}>
                {currentUser?.status || 'unknown'}
              </span>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              ['Scope', opsScope],
              ['Current workspace', activeWorkspace?.name || currentOrgId || '-'],
              ['Accessible orgs', String(workspaceOrganizations.length)],
              ['Platform admin', canManageGlobal ? 'yes' : 'no'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-5">
                <p className="text-xs uppercase tracking-wider font-medium text-[var(--text-soft)]">{label}</p>
                <p className="mt-2 text-sm font-medium text-[var(--text)] break-all">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      {opsScope !== 'global' ? (
        <SectionCard title="Global governance required" description="全量、任意、非快照的治理操作放在平台全局作用域下。">
          <div className="rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--bg)] px-4 py-8 text-center text-sm text-[var(--text-muted)]">
            切换到顶栏 `全局` 作用域后，可执行组织、用户、成员关系的完整 CRUD。当前 `工作区` 只保留上下文切换与执行视图。
          </div>
        </SectionCard>
      ) : null}

      {opsScope === 'global' ? (
        <>
          {globalError ? <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">{globalError}</div> : null}

          <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
            <SectionCard title="Organization graph" description="以组织为主维度管理全量组织，并在右侧直接维护成员关系。">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="text-sm text-[var(--text-muted)]">当前组织数: {globalLoading ? '...' : platformOrganizations.length}</div>
                <button type="button" className={secondaryButtonClass} onClick={() => openOrgModal()}>
                  <Plus className="h-4 w-4" />
                  添加组织
                </button>
              </div>
              <DataTable
                columns={['组织', 'Owner', 'Plan / Members', 'Status']}
                rows={platformOrganizations.map(item => ({
                  key: item.id,
                  selected: selectedOrgId === item.id,
                  cells: [
                    <div key="org">
                      <div className="font-medium text-[var(--text)]">{item.name}</div>
                      <div className="mt-1 text-xs font-mono text-[var(--text-soft)]">{item.id}</div>
                    </div>,
                    item.owner_name || item.owner_email || '-',
                    `${item.plan_id || '-'} / ${item.member_count}`,
                    <span key="status" className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium ${tone(item.status)}`}>{item.status}</span>,
                  ],
                  onSelect: () => {
                    setSelectedOrgId(item.id)
                    void loadMembers(item.id)
                  },
                  onEdit: () => openOrgModal(item),
                  onDelete: () => void handleMutation(() => platformClient.deleteOpsOrganization(item.id).then(() => undefined), '组织删除成功'),
                }))}
                emptyMessage={globalLoading ? 'Loading organizations...' : 'No organizations returned.'}
              />
            </SectionCard>

            <SectionCard title="Organization members" description={selectedOrganization ? `维护 ${selectedOrganization.name} 的成员关系与角色。` : '先在左侧选择一个组织。'}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--text)]">{selectedOrganization?.name || 'No organization selected'}</p>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">成员关系是二级结构，不再把用户平铺在组织外部。</p>
                </div>
                <button type="button" className={secondaryButtonClass} disabled={!selectedOrgId} onClick={() => openMemberModal()}>
                  <Plus className="h-4 w-4" />
                  添加成员
                </button>
              </div>
              <DataTable
                columns={['用户', 'Role', 'Status', 'Owner']}
                rows={members.map(item => ({
                  key: item.user_id,
                  cells: [
                    <div key="user">
                      <div className="font-medium text-[var(--text)]">{item.user_full_name || item.user_email}</div>
                      <div className="mt-1 text-xs text-[var(--text-soft)]">{item.user_email}</div>
                    </div>,
                    item.role,
                    item.status,
                    item.is_current_owner ? 'owner' : '-',
                  ],
                  onSelect: () => setSelectedUserId(item.user_id),
                  onEdit: () => openMemberModal(item),
                  onDelete: () => void handleMutation(() => platformClient.deleteOrganizationMember(item.organization_id, item.user_id).then(() => undefined), '成员移除成功', item.organization_id, item.user_id),
                }))}
                emptyMessage={membersLoading ? 'Loading members...' : 'No members returned for selected organization.'}
              />
            </SectionCard>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
            <SectionCard title="User graph" description="全量用户目录支持直接增删改查，但关系展示通过右侧归属组织图谱展开。">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="text-sm text-[var(--text-muted)]">当前用户数: {globalLoading ? '...' : platformUsers.length}</div>
                <button type="button" className={secondaryButtonClass} onClick={() => openUserModal()}>
                  <Plus className="h-4 w-4" />
                  添加用户
                </button>
              </div>
              <DataTable
                columns={['用户', 'Current Org', 'Memberships', 'Status']}
                rows={platformUsers.map(item => ({
                  key: item.id,
                  selected: selectedUserId === item.id,
                  cells: [
                    <div key="user">
                      <div className="font-medium text-[var(--text)]">{item.full_name || item.email}</div>
                      <div className="mt-1 text-xs text-[var(--text-soft)]">{item.email}</div>
                    </div>,
                    item.current_org_name || item.current_org_id || '-',
                    String(item.organization_count),
                    item.is_platform_admin ? 'platform admin' : item.status,
                  ],
                  onSelect: () => setSelectedUserId(item.id),
                  onEdit: () => openUserModal(item),
                  onDelete: () => void handleMutation(() => platformClient.deleteOpsUser(item.id).then(() => undefined), '用户删除成功'),
                }))}
                emptyMessage={globalLoading ? 'Loading users...' : 'No users returned.'}
              />
            </SectionCard>

            <SectionCard title="Selected user relations" description="用户详情通过组织归属展开，避免把用户信息平铺成无关系列表。">
              {selectedUser ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-5">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full border border-[var(--border)] bg-[var(--bg-muted)] p-3 text-[var(--text-muted)]">
                        <Users className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[var(--text)]">{selectedUser.full_name || selectedUser.email}</p>
                        <p className="mt-1 text-sm text-[var(--text-muted)] break-all">{selectedUser.email}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium ${tone(selectedUser.status)}`}>{selectedUser.status}</span>
                      {selectedUser.is_platform_admin ? <span className="inline-flex items-center rounded-md border border-sky-500/20 bg-sky-500/10 px-2.5 py-1 text-xs font-medium text-sky-300">platform admin</span> : null}
                    </div>
                  </div>
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-5">
                    <p className="text-sm font-semibold text-[var(--text)]">Organization memberships</p>
                    <div className="mt-4 space-y-3">
                      {selectedUser.organizations.length ? selectedUser.organizations.map(item => (
                        <div key={`${selectedUser.id}-${item.id}`} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-muted)] px-4 py-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[var(--text)]">{item.name}</p>
                            <p className="mt-1 text-xs font-mono text-[var(--text-soft)]">{item.id}</p>
                          </div>
                          <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium ${tone(item.role)}`}>{item.role}</span>
                        </div>
                      )) : (
                        <p className="text-sm text-[var(--text-muted)]">No organization memberships returned.</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--bg)] px-4 py-8 text-center text-sm text-[var(--text-muted)]">
                  在左侧用户列表中选择一个用户，查看其组织归属和治理关系。
                </div>
              )}
            </SectionCard>
          </div>
        </>
      ) : null}

      <SectionCard title="Workspace switching" description="工作区切换仍保留在治理页内，方便从平台全局视角下钻到具体组织执行。">
        <div className="grid gap-3">
          {workspaceOrganizations.map(item => {
            const isActive = item.id === currentOrgId
            const isSwitching = switchingOrgId === item.id
            return (
              <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--text)]">{item.name}</p>
                  <p className="mt-1 text-xs font-mono text-[var(--text-soft)]">{item.id}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium ${tone(item.role)}`}>{item.role}</span>
                  {isActive ? (
                    <span className="inline-flex items-center rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300">active</span>
                  ) : (
                    <button type="button" disabled={isSwitching} className={secondaryButtonClass} onClick={() => void handleSwitchOrganization(item.id)}>
                      <RefreshCcw className={`h-4 w-4 ${isSwitching ? 'animate-spin' : ''}`} />
                      {isSwitching ? 'Switching...' : 'Switch workspace'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
          {!workspaceOrganizations.length ? (
            <div className="rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--bg)] px-4 py-8 text-center text-sm text-[var(--text-muted)]">
              {loading ? 'Loading workspaces...' : 'No accessible organizations returned.'}
            </div>
          ) : null}
        </div>
      </SectionCard>

      <EntityModal
        open={orgModalOpen}
        onClose={() => setOrgModalOpen(false)}
        title={editingOrg ? '编辑组织' : '新建组织'}
        description="直接治理组织实体，而不是只读查看。"
        footer={(
          <ModalFooter onCancel={() => setOrgModalOpen(false)} onSubmit={() => void handleMutation(
            () => editingOrg
              ? platformClient.updateOpsOrganization(editingOrg.id, orgForm).then(() => undefined)
              : platformClient.createOpsOrganization(orgForm).then(() => undefined),
            editingOrg ? '组织更新成功' : '组织创建成功',
          )} />
        )}
      >
        <div className="grid gap-4">
          <FormField label="Name"><input value={orgForm.name} onChange={event => setOrgForm(current => ({ ...current, name: event.target.value }))} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]" /></FormField>
          <FormField label="Plan ID"><input value={orgForm.plan_id} onChange={event => setOrgForm(current => ({ ...current, plan_id: event.target.value }))} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]" /></FormField>
          <FormField label="Billing email"><input value={orgForm.billing_email} onChange={event => setOrgForm(current => ({ ...current, billing_email: event.target.value }))} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]" /></FormField>
          <FormField label="Status"><input value={orgForm.status} onChange={event => setOrgForm(current => ({ ...current, status: event.target.value }))} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]" /></FormField>
          <FormField label="Owner user ID"><input value={orgForm.owner_id} onChange={event => setOrgForm(current => ({ ...current, owner_id: event.target.value }))} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]" /></FormField>
        </div>
      </EntityModal>

      <EntityModal
        open={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        title={editingUser ? '编辑用户' : '新建用户'}
        description="治理平台用户实体，组织归属关系在成员面板中继续维护。"
        footer={(
          <ModalFooter onCancel={() => setUserModalOpen(false)} onSubmit={() => void handleMutation(
            () => editingUser
              ? platformClient.updateOpsUser(editingUser.id, userForm).then(() => undefined)
              : platformClient.createOpsUser(userForm).then(() => undefined),
            editingUser ? '用户更新成功' : '用户创建成功',
            selectedOrgId,
          )} />
        )}
      >
        <div className="grid gap-4">
          <FormField label="Email"><input value={userForm.email} onChange={event => setUserForm(current => ({ ...current, email: event.target.value }))} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]" /></FormField>
          <FormField label="Full name"><input value={userForm.full_name} onChange={event => setUserForm(current => ({ ...current, full_name: event.target.value }))} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]" /></FormField>
          <FormField label="Password"><input type="password" value={userForm.password} onChange={event => setUserForm(current => ({ ...current, password: event.target.value }))} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]" /></FormField>
          <FormField label="Avatar URL"><input value={userForm.avatar_url} onChange={event => setUserForm(current => ({ ...current, avatar_url: event.target.value }))} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]" /></FormField>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Role"><input value={userForm.role} onChange={event => setUserForm(current => ({ ...current, role: event.target.value }))} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]" /></FormField>
            <FormField label="Status"><input value={userForm.status} onChange={event => setUserForm(current => ({ ...current, status: event.target.value }))} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]" /></FormField>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Current org ID"><input value={userForm.current_org_id} onChange={event => setUserForm(current => ({ ...current, current_org_id: event.target.value }))} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]" /></FormField>
            <FormField label="Last active org ID"><input value={userForm.last_active_org_id} onChange={event => setUserForm(current => ({ ...current, last_active_org_id: event.target.value }))} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]" /></FormField>
          </div>
          <label className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm text-[var(--text)]">
            <input type="checkbox" checked={userForm.is_platform_admin} onChange={event => setUserForm(current => ({ ...current, is_platform_admin: event.target.checked }))} />
            Platform admin
          </label>
        </div>
      </EntityModal>

      <EntityModal
        open={memberModalOpen}
        onClose={() => setMemberModalOpen(false)}
        title={editingMember ? '编辑组织成员' : '添加组织成员'}
        description="成员关系是组织与用户的二级关联，不在用户表中平铺处理。"
        footer={(
          <ModalFooter onCancel={() => setMemberModalOpen(false)} onSubmit={() => void handleMutation(
            () => editingMember
              ? platformClient.updateOrganizationMember(selectedOrgId, editingMember.user_id, memberForm).then(() => undefined)
              : platformClient.createOrganizationMember(selectedOrgId, memberForm).then(() => undefined),
            editingMember ? '成员更新成功' : '成员创建成功',
            selectedOrgId,
            memberForm.user_id || selectedUserId,
          )} />
        )}
      >
        <div className="grid gap-4">
          <FormField label="User">
            <select
              value={memberForm.user_id}
              disabled={Boolean(editingMember)}
              onChange={event => setMemberForm(current => ({ ...current, user_id: event.target.value }))}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]"
            >
              <option value="">选择用户</option>
              {platformUsers.map(item => (
                <option key={item.id} value={item.id}>{item.full_name || item.email} ({item.email})</option>
              ))}
            </select>
          </FormField>
          <FormField label="Role"><input value={memberForm.role} onChange={event => setMemberForm(current => ({ ...current, role: event.target.value }))} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]" /></FormField>
          <FormField label="Status"><input value={memberForm.status} onChange={event => setMemberForm(current => ({ ...current, status: event.target.value }))} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]" /></FormField>
        </div>
      </EntityModal>
    </div>
  )
}

function DataTable({
  columns,
  rows,
  emptyMessage,
}: {
  columns: string[]
  rows: Array<{
    key: string
    cells: ReactNode[]
    selected?: boolean
    onSelect?: () => void
    onEdit?: () => void
    onDelete?: () => void
  }>
  emptyMessage: string
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--bg)]">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="border-b border-[var(--border)] bg-[var(--bg-muted)]">
          <tr>
            {columns.map(column => (
              <th key={column} className="px-4 py-3 text-[var(--text-muted)]">{column}</th>
            ))}
            <th className="px-4 py-3 text-right text-[var(--text-muted)]">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {rows.length ? rows.map(row => (
            <tr key={row.key} className={row.selected ? 'bg-white/5' : undefined}>
              {row.cells.map((cell, index) => (
                <td key={`${row.key}-${index}`} className="px-4 py-3 text-[var(--text)]">{cell}</td>
              ))}
              <td className="px-4 py-3">
                <div className="flex justify-end gap-2">
                  {row.onSelect ? <button type="button" className={secondaryButtonClass} onClick={row.onSelect}>选择</button> : null}
                  {row.onEdit ? <button type="button" className={secondaryButtonClass} onClick={row.onEdit}>编辑</button> : null}
                  {row.onDelete ? <button type="button" className="inline-flex items-center justify-center rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-300 transition-colors hover:bg-rose-500/20" onClick={row.onDelete}>删除</button> : null}
                </div>
              </td>
            </tr>
          )) : (
            <tr>
              <td colSpan={columns.length + 1} className="px-4 py-8 text-center text-[var(--text-muted)]">{emptyMessage}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-[var(--text)]">{label}</span>
      {children}
    </label>
  )
}

function ModalFooter({ onCancel, onSubmit }: { onCancel: () => void; onSubmit: () => void }) {
  return (
    <div className="flex justify-end gap-3">
      <button type="button" className={secondaryButtonClass} onClick={onCancel}>取消</button>
      <button type="button" className={primaryButtonClass} onClick={onSubmit}>保存</button>
    </div>
  )
}
