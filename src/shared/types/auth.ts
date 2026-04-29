export interface OrganizationLite {
  id: string
  name: string
  role: string
}

export interface UserProfile {
  id: string
  email: string
  full_name: string
  avatar_url: string
  role: string
  org_role: string
  org_id: string
  last_active_org_id: string
  plan_id: string
  status: string
  permissions: string[]
  orgs: OrganizationLite[]
}

export interface AuthResult {
  access_token: string
  user: UserProfile
}

export interface MePermissionsResult {
  org_role: string
  permissions: string[]
}

export interface SwitchOrgResult {
  current_org_id: string
  access_token: string
  permissions: string[]
  org_role: string
  organization: {
    id: string
    name: string
  }
  user?: UserProfile
}

export interface PlatformOrganizationRecord {
  id: string
  name: string
  plan_id: string
  billing_email: string
  status: string
  owner_id: string
  owner_name: string
  owner_email: string
  member_count: number
  created_at: string
  updated_at: string
}

export interface PlatformOrganizationsResult {
  items: PlatformOrganizationRecord[]
  total: number
  limit: number
  offset: number
}

export interface PlatformUserDirectoryRecord {
  id: string
  email: string
  full_name: string
  avatar_url: string
  role: string
  status: string
  current_org_id: string
  last_active_org_id: string
  is_platform_admin: boolean
  last_login_at?: string
  created_at: string
  updated_at: string
  current_org_name: string
  organizations: OrganizationLite[]
  organization_count: number
}

export interface PlatformUsersResult {
  items: PlatformUserDirectoryRecord[]
  total: number
  limit: number
  offset: number
}

export interface PermissionRecord {
  id: string
  category: string
  name: string
  description: string
  created_at: string
}

export interface PermissionsResult {
  items: PermissionRecord[]
  total: number
  limit: number
  offset: number
}

export interface RoleRecord {
  id: string
  name: string
  description: string
  is_system: boolean
  created_at: string
  updated_at: string
}

export interface RolesResult {
  items: RoleRecord[]
  total: number
  limit: number
  offset: number
}

export interface RolePermissionsResult {
  role_id: string
  permission_ids: string[]
}

export interface OrganizationMemberRecord {
  id: string
  organization_id: string
  user_id: string
  user_email: string
  user_full_name: string
  user_status: string
  user_avatar_url: string
  role: string
  status: string
  is_current_owner: boolean
  created_at: string
  updated_at: string
}

export interface OrganizationMembersResult {
  items: OrganizationMemberRecord[]
  total: number
}
