import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, ShieldCheck, Users } from 'lucide-react'

import { ErrorBanner, EmptyState, StatusPill, toneForStatus } from '@/modules/operator-workbench/components/WorkbenchPrimitives'
import { useSessionStore } from '@/app/store/sessionStore'
import { platformClient } from '@/shared/api/platformClient'
import { PageHeader } from '@/shared/ui/PageHeader'
import { SectionCard } from '@/shared/ui/SectionCard'
import type { OrganizationMemberRecord, PermissionRecord, PlatformOrganizationRecord, PlatformUserDirectoryRecord, RoleRecord } from '@/shared/types/auth'

export function AccessInvestigatorPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const currentUser = useSessionStore(state => state.currentUser)
  const permissions = useSessionStore(state => state.permissions)
  const currentOrgId = useSessionStore(state => state.currentOrgId)
  const [queryInput, setQueryInput] = useState(searchParams.get('query') || '')
  const [users, setUsers] = useState<PlatformUserDirectoryRecord[]>([])
  const [orgs, setOrgs] = useState<PlatformOrganizationRecord[]>([])
  const [roles, setRoles] = useState<RoleRecord[]>([])
  const [permissionRows, setPermissionRows] = useState<PermissionRecord[]>([])
  const [rolePermissionMap, setRolePermissionMap] = useState<Record<string, string[]>>({})
  const [members, setMembers] = useState<OrganizationMemberRecord[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const query = searchParams.get('query') || ''
  const orgID = searchParams.get('org_id') || currentOrgId || ''
  const hasPlatformAdmin = useMemo(() => {
    const role = (currentUser?.role || '').toLowerCase()
    return permissions.includes('platform.admin') || currentUser?.permissions?.includes('platform.admin') || ['admin', 'platform_admin', 'super_admin', 'owner'].includes(role)
  }, [permissions, currentUser])

  useEffect(() => {
    setQueryInput(query)
  }, [query])

  useEffect(() => {
    if (!hasPlatformAdmin) {
      setUsers([])
      setOrgs([])
      setRoles([])
      setPermissionRows([])
      setRolePermissionMap({})
      setLoading(false)
      setError(null)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const [usersResult, orgsResult, rolesResult, permissionsResult] = await Promise.all([
          platformClient.opsUsers({ query, limit: 20, offset: 0 }),
          platformClient.opsOrganizations({ query, limit: 20, offset: 0 }),
          platformClient.accessRoles({ query, limit: 50, offset: 0 }),
          platformClient.accessPermissions({ query, limit: 50, offset: 0 }),
        ])
        if (cancelled) return
        setUsers(usersResult.items)
        setOrgs(orgsResult.items)
        setRoles(rolesResult.items)
        setPermissionRows(permissionsResult.items)
        const pairs = await Promise.all(rolesResult.items.slice(0, 12).map(async role => {
          try {
            const rolePermissions = await platformClient.rolePermissions(role.id)
            return [role.id, rolePermissions.permission_ids] as const
          } catch {
            return [role.id, []] as const
          }
        }))
        if (!cancelled) setRolePermissionMap(Object.fromEntries(pairs))
      } catch (err) {
        if (cancelled) return
        setUsers([])
        setOrgs([])
        setRoles([])
        setPermissionRows([])
        setRolePermissionMap({})
        setError(err instanceof Error ? err.message : 'Failed to load access data')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [query, hasPlatformAdmin])

  useEffect(() => {
    if (!orgID) return
    let cancelled = false
    ;(async () => {
      try {
        const result = await platformClient.organizationMembers(orgID)
        if (!cancelled) setMembers(result.items)
      } catch {
        if (!cancelled) setMembers([])
      }
    })()
    return () => { cancelled = true }
  }, [orgID])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const next: Record<string, string> = {}
    if (queryInput.trim()) next.query = queryInput.trim()
    if (orgID) next.org_id = orgID
    setSearchParams(next)
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Access & Org Investigator" description="只读解释当前 operator 权限、目标用户/组织、成员、角色和权限；写操作继续回到 Organizations / Access Center。" />
      <SectionCard title="Current operator permission envelope" description="前端只做 UX 与安全提示；后端仍是最终权限裁决。">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4"><ShieldCheck className="mb-2 h-4 w-4 text-[var(--primary)]" /><p className="text-sm font-semibold text-[var(--text)]">{currentUser?.full_name || currentUser?.email || 'Current operator'}</p><p className="mt-1 text-sm text-[var(--text-muted)]">role {currentUser?.role || '—'} · org role {currentUser?.org_role || '—'}</p></div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4"><p className="text-sm font-semibold text-[var(--text)]">Permission count</p><p className="mt-1 text-2xl font-semibold text-white">{permissions.length}</p></div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4"><p className="text-sm font-semibold text-[var(--text)]">Admin envelope</p><div className="mt-2"><StatusPill tone={hasPlatformAdmin ? 'good' : 'warn'}>{hasPlatformAdmin ? 'platform admin visible' : 'limited permissions'}</StatusPill></div></div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">{permissions.slice(0, 24).map(item => <StatusPill key={item}>{item}</StatusPill>)}</div>
      </SectionCard>
      <SectionCard title="Target lookup" description="检索用户、组织、角色、权限；如果输入 org_id，会额外加载成员列表。">
        <form onSubmit={submit} className="flex flex-col gap-3 md:flex-row md:items-center"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-soft)]" /><input value={queryInput} onChange={event => setQueryInput(event.target.value)} placeholder="email / user_id / org_id / role / permission" className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] py-2.5 pl-10 pr-4 text-sm text-[var(--text)] outline-none focus:border-[var(--primary-soft)]" /></div><button className="rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-black">Search</button></form>
      </SectionCard>
      <ErrorBanner message={error} />
      {!hasPlatformAdmin ? <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">Current operator is missing platform.admin; admin-only user/org/role lookups are intentionally disabled here. Use existing source-of-truth modules or request the required permission.</div> : null}
      {loading ? <EmptyState>Loading access facts...</EmptyState> : null}
      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Users" description="用户目录结果；编辑请跳 Organizations。">
          {!users.length ? <EmptyState>No users returned.</EmptyState> : <div className="space-y-2">{users.map(user => <div key={user.id} className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium text-[var(--text)]">{user.full_name || user.email}</p><StatusPill tone={toneForStatus(user.status)}>{user.status}</StatusPill></div><p className="mt-1 break-all font-mono text-xs text-[var(--text-muted)]">{user.id}</p><p className="mt-1 text-[var(--text-muted)]">{user.email} · orgs {user.organization_count} · platform_admin {String(user.is_platform_admin)}</p></div>)}</div>}
        </SectionCard>
        <SectionCard title="Organizations" description="组织目录结果；成员编辑仍在 Organization Center。">
          {!orgs.length ? <EmptyState>No organizations returned.</EmptyState> : <div className="space-y-2">{orgs.map(org => <div key={org.id} className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium text-[var(--text)]">{org.name}</p><StatusPill tone={toneForStatus(org.status)}>{org.status}</StatusPill></div><p className="mt-1 break-all font-mono text-xs text-[var(--text-muted)]">{org.id}</p><p className="mt-1 text-[var(--text-muted)]">owner {org.owner_email || org.owner_id} · members {org.member_count}</p></div>)}</div>}
        </SectionCard>
        <SectionCard title="Roles & permissions" description="解释角色/权限是否存在；权限变更回 Access Center，Phase 2 再加高风险 wrapper。">
          <div className="grid gap-3 md:grid-cols-2"><div>{roles.length ? roles.map(role => <div key={role.id} className="mb-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3 text-sm"><p className="font-medium text-[var(--text)]">{role.name}</p><p className="mt-1 text-xs text-[var(--text-muted)]">{role.description || role.id}</p><p className="mt-1 text-xs text-[var(--text-soft)]">permissions {rolePermissionMap[role.id]?.length ?? 0}</p></div>) : <EmptyState>No roles returned.</EmptyState>}</div><div>{permissionRows.length ? permissionRows.map(permission => <div key={permission.id} className="mb-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3 text-sm"><p className="font-medium text-[var(--text)]">{permission.id}</p><p className="mt-1 text-xs text-[var(--text-muted)]">{permission.category} · {permission.description}</p></div>) : <EmptyState>No permissions returned.</EmptyState>}</div></div>
          <Link to="/access-center" className="mt-3 inline-flex text-sm font-medium text-[var(--primary)] hover:underline">Open Access Center</Link>
        </SectionCard>
        <SectionCard title="Organization members" description={`Loaded for org ${orgID || '—'}.`}>
          <Users className="mb-2 h-4 w-4 text-[var(--primary)]" />
          {!members.length ? <EmptyState>No members loaded. Provide org_id or switch workspace.</EmptyState> : <div className="space-y-2">{members.map(member => <div key={`${member.organization_id}-${member.user_id}`} className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium text-[var(--text)]">{member.user_full_name || member.user_email}</p><StatusPill tone={toneForStatus(member.status)}>{member.role}/{member.status}</StatusPill></div><p className="mt-1 break-all font-mono text-xs text-[var(--text-muted)]">{member.user_id}</p></div>)}</div>}
          <Link to="/organizations" className="mt-3 inline-flex text-sm font-medium text-[var(--primary)] hover:underline">Open Organization Center</Link>
        </SectionCard>
      </div>
    </div>
  )
}
