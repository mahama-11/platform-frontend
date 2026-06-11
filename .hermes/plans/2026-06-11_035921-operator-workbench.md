# Platform Operator Workbench Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Turn Platform Console from module/table navigation into an operator-facing workbench that starts from real admin/support jobs: diagnose runtime failures, explain billing/charge outcomes, investigate access/org issues, and navigate to the existing source-of-truth modules with permission-aware, auditable actions.

**Architecture:** Build a thin Operator Workbench layer on top of existing Platform Console modules and `platformClient`, not a parallel backend. Phase 1 ships read-first workbenches and cross-links using existing APIs; Phase 2 adds route/action permission metadata and high-risk operation wrappers; Phase 3 adds backend aggregate/read-model APIs only where existing endpoint composition is insufficient. Keep product-specific workflows out of Platform Console.

**Tech Stack:** React 19, TypeScript, Vite, React Router, Zustand, i18next, existing Platform Go APIs, existing Cloud DEV deploy/release gates.

---

## 0. Current context / constraints

### Existing frontend capability

- `src/app/router/moduleRegistry.tsx` currently exposes flat module routes:
  - `/overview`
  - `/runtime/jobs`, `/runtime/jobs/:runtimeJobID`
  - `/template-ops`
  - `/menu-ops`
  - `/merchants`
  - `/catalog`
  - `/billing`, `/billing/charge-sessions/:chargeSessionID`, `/billing/settlements/:eventID`
  - `/organizations`
  - `/access-center`
  - `/audit`
  - `/settings`
- `src/widgets/topbar/TopBar.tsx` already has global/workspace scope and search that routes to `/runtime/jobs?query=...`.
- `src/app/store/sessionStore.ts` already stores current user, current org, and permission list.
- `src/modules/runtime/pages/RuntimeJobDetailPage.tsx` already links runtime job -> charge session.
- `src/modules/billing/pages/ChargeSessionDetailPage.tsx` already links charge session -> settlement.
- `/merchants` and `/settings` have recently moved from static placeholders to real read-only surfaces.

### Existing backend/API support

From `platform-backend/internal/router/router.go`:

- Access/RBAC: `/api/v1/access/*`, protected by `platform.admin` for role/permission CRUD.
- Commercial: `/api/v1/commercial/entities`, `/billing-profiles`, `/routing-policies`, `/route/resolve`, protected by `platform.admin`.
- Wallet: `/api/v1/wallet/assets`, `/summary`, `/accounts`, `/buckets`, `/ledger`, lifecycle/grant endpoints, protected by `platform.admin`.
- Metering: `/api/v1/metering/settlements`, `/discounts`, reversal endpoint, admin-protected.
- Runtime: `/api/v1/runtime/jobs`, `/jobs/:id`, `/charge-sessions`, `/charge-sessions/:id`, admin-protected.
- Audit diagnostics: `/api/v1/audit/logs`, `/logs/:id`, `/diagnostics/requests/:requestID`, admin-protected.
- Ops: `/api/v1/ops/organizations`, `/users`, members CRUD, admin-protected.

### Product boundary

Operator Workbench must compose shared Platform facts only:

- runtime jobs
- provider attempts
- charge sessions
- settlement / discount / wallet records
- commercial route snapshots
- audit logs and diagnostics
- users/orgs/roles/permissions

It must not absorb Ecom/Menu/KYC business workflows or implement product-specific state machines.

---

## 1. Target product shape

### Operator Workbench = job-first console

The top-level mental model should become:

1. **Command Center** — “what needs attention now?”
2. **Runtime Investigator** — “why did this AI/runtime job fail or behave this way?”
3. **Finance & Charge Investigator** — “why was this charged/settled/discounted?”
4. **Access & Org Investigator** — “why can/can’t this user/org do something?”
5. **Commercial Route Studio** — “which entity/profile/route will handle this product/org/region/channel?”
6. **Audit & Request Explorer** — “what happened for this request_id/trace_id?”

Existing modules remain the source-of-truth editors; Workbench pages orchestrate them.

### Phase 1 status target

`PASS_WITH_NOTES` is acceptable for Phase 1 if:

- job-first route exists;
- at least 3 critical diagnostics paths are real browser/API verified;
- existing modules still work;
- no fake write capability is introduced;
- high-risk writes are inventoried and marked for wrapper work.

Full `PASS` requires Phase 2 high-risk action wrappers and route/action permission matrix.

---

## 2. Phase plan

## Phase 1 — Read-first Operator Workbench shell and diagnostics paths

**Status target:** first deployable vertical slice.

### Slice 1.1: Add Operator Workbench navigation group and landing route

**Type:** AFK  
**Blocked by:** none  
**User stories covered:**

- As an internal operator, I start from “what job am I doing?” instead of a database/module list.
- As a support/SRE/admin user, I can choose Runtime, Finance, Access, Commercial, or Audit investigation from one landing page.

**Acceptance criteria:**

- New route `/workbench` renders inside authenticated console shell.
- Side nav has a new top-level group label such as `Workbench` above existing module groups.
- `/overview` may remain but `/workbench` becomes the primary landing candidate; do not auto-redirect until product direction is accepted.
- Landing cards link to existing real modules and new investigator routes.

**Files:**

- Modify: `src/shared/types/module.ts`
- Modify: `src/widgets/side-nav/SideNav.tsx`
- Modify: `src/shared/i18n/locales/en.ts`
- Modify: `src/shared/i18n/locales/zh.ts`
- Create: `src/modules/operator-workbench/index.tsx`
- Create: `src/modules/operator-workbench/pages/OperatorWorkbenchPage.tsx`
- Modify: `src/app/router/moduleRegistry.tsx`

**Implementation notes:**

- Extend nav group type:

```ts
export type ConsoleNavGroup = 'workbench' | 'overview' | 'operations' | 'governance'
```

- Update group order:

```ts
const groupOrder: ConsoleNavGroup[] = ['workbench', 'overview', 'operations', 'governance']
```

- Add module manifest:

```tsx
export const operatorWorkbenchModule: PlatformModuleManifest = {
  id: 'operator-workbench',
  navItems: [
    { key: 'nav.operatorWorkbench', path: '/workbench', icon: Radar, group: 'workbench' },
  ],
  routes: [{ path: 'workbench', element: <OperatorWorkbenchPage /> }],
}
```

**Verifier command:**

```bash
cd /root/work/v/platform-frontend
npm run typecheck
npm run build
```

**Browser evidence:**

- Login to Cloud/local preview.
- Visit `/workbench`.
- Assert page title and all job cards visible.
- Click each card and verify route transitions.

**Evidence path:**

- `artifacts/cloud-dev/evidence/platform-operator-workbench-phase1-*.json`
- `artifacts/cloud-dev/evidence/platform-operator-workbench-phase1-*.md`

---

### Slice 1.2: Build shared investigation search model

**Type:** AFK  
**Blocked by:** Slice 1.1  
**User stories covered:**

- An operator can paste a `runtime_job_id`, `charge_session_id`, `event_id`, `request_id`, `trace_id`, `organization_id`, `user_id`, or `source_id` and get guided next steps.

**Acceptance criteria:**

- Workbench landing has a “Universal investigation search” input.
- Parser classifies obvious IDs/prefixes and routes to existing destination when deterministic.
- Ambiguous searches open a result panel with recommended modules.
- Search does not call unsupported backend endpoints.

**Files:**

- Create: `src/modules/operator-workbench/support/investigationSearch.ts`
- Create: `src/modules/operator-workbench/support/investigationSearch.test.ts` if Vitest exists; if no test framework exists, add static verifier script under `scripts/` or include this in future test harness plan.
- Modify: `src/modules/operator-workbench/pages/OperatorWorkbenchPage.tsx`
- Modify: `src/widgets/topbar/TopBar.tsx` only if replacing global topbar search is accepted; otherwise leave topbar unchanged in Phase 1.

**Classification rules:**

```ts
runtime_job_id -> /runtime/jobs/:id
charge_session_id -> /billing/charge-sessions/:id
settlement event_id -> /billing/settlements/:id
request_id or trace_id -> /audit?request_id=... or /audit?trace_id=...
org/user/source_id -> show recommended searches, do not guess destructively
unknown -> /runtime/jobs?query=...
```

**Verifier command:**

```bash
npm run typecheck
npm run build
```

**Browser evidence:**

- Search a known runtime job ID if present in DEV.
- Search a known request ID from recent API response.
- Verify navigation and no console errors.

---

### Slice 1.3: Runtime Investigator view

**Type:** AFK  
**Blocked by:** Slice 1.1  
**User stories covered:**

- “Why did this runtime job fail / what provider ran / what charge session was attached?”

**Acceptance criteria:**

- New route `/workbench/runtime` renders a job-first runtime investigator.
- Uses existing `platformClient.runtimeJobs()` and `runtimeJobDetail()` only.
- Shows a compact workflow:
  1. Find job.
  2. Inspect status/stage/provider/source/attempts.
  3. Open charge session when present.
  4. Open linked asset metadata/content when output manifest has storage keys.
  5. Open Audit & Request Explorer for request/trace fields when available.
- No provider secret/raw internal secret displayed.

**Files:**

- Create: `src/modules/operator-workbench/pages/RuntimeInvestigatorPage.tsx`
- Modify: `src/modules/operator-workbench/index.tsx`
- Refactor optional shared helpers from `RuntimeJobDetailPage.tsx`:
  - Create: `src/modules/runtime/support/runtimeManifest.ts`
  - Modify: `src/modules/runtime/pages/RuntimeJobDetailPage.tsx`

**Acceptance test / browser matrix:**

- Empty state when no query.
- Query with no jobs.
- Query with jobs.
- Open first result detail.
- Link to `/billing/charge-sessions/:id` if charge session exists.
- Console errors = 0.

**Verifier command:**

```bash
npm run typecheck
npm run build
```

---

### Slice 1.4: Finance & Charge Investigator view

**Type:** AFK  
**Blocked by:** Slice 1.1  
**User stories covered:**

- “Why was this user/org charged, reserved, settled, discounted, or not settled?”

**Acceptance criteria:**

- New route `/workbench/finance` renders a finance investigator.
- Uses existing:
  - `platformClient.chargeSessions()`
  - `platformClient.chargeSessionDetail()`
  - `platformClient.settlements()` / `settlementDetail()` when subject data is available
  - `platformClient.discounts()` when subject data is available
  - `platformClient.walletSummary()` for workspace/org context
- Shows route snapshot and metadata as evidence, not as final business explanation.
- If workspace scope is required, page states that explicitly and suggests switching scope.

**Files:**

- Create: `src/modules/operator-workbench/pages/FinanceInvestigatorPage.tsx`
- Modify: `src/modules/operator-workbench/index.tsx`
- Optional shared components:
  - Create: `src/modules/operator-workbench/components/EvidenceLinkCard.tsx`
  - Create: `src/modules/operator-workbench/components/InvestigationTimeline.tsx`

**Acceptance criteria details:**

- Global scope can search charge sessions.
- Workspace scope can show wallet summary / settlements / discounts for current org where backend requires billing subject.
- Links to existing `/billing/charge-sessions/:id` and `/billing/settlements/:eventID` remain intact.

**Verifier command:**

```bash
npm run typecheck
npm run build
```

---

### Slice 1.5: Access & Org Investigator view

**Type:** AFK  
**Blocked by:** Slice 1.1  
**User stories covered:**

- “Why can this user do or not do something?”
- “Which org/member/role/permission state explains the issue?”

**Acceptance criteria:**

- New route `/workbench/access` renders a read-first investigator.
- Uses existing:
  - `platformClient.myPermissions()`
  - `platformClient.opsUsers()` when `platform.admin`
  - `platformClient.opsOrganizations()` when `platform.admin`
  - `platformClient.organizationMembers(orgId)`
  - `platformClient.accessRoles()` / `accessPermissions()` / `rolePermissions()`
- Shows current operator permissions and target user/org lookup.
- For mutation, links out to `/organizations` or `/access-center`; no new write form in Phase 1.

**Files:**

- Create: `src/modules/operator-workbench/pages/AccessInvestigatorPage.tsx`
- Modify: `src/modules/operator-workbench/index.tsx`

**Important guardrail:**

Do not create new user/role/member mutation flows in this page. This page explains and deep-links; `/organizations` and `/access-center` remain the source-of-truth editors until high-risk wrappers exist.

**Verifier command:**

```bash
npm run typecheck
npm run build
```

---

### Slice 1.6: Commercial Route Studio read/preview view

**Type:** AFK  
**Blocked by:** Slice 1.1  
**User stories covered:**

- “If product/org/region/currency/channel is X, which billing profile/entity/route will Platform choose?”

**Acceptance criteria:**

- New route `/workbench/commercial-route` renders commercial route preview.
- Uses existing:
  - `commercialEntities()`
  - `billingProfiles()`
  - `routingPolicies()`
  - `resolveCommercialRoute(payload)`
- Preview form is read-only in effect: it calls route resolve but does not mutate route policies.
- Shows result snapshot and links to `/merchants` and `/catalog`.

**Files:**

- Create: `src/modules/operator-workbench/pages/CommercialRouteStudioPage.tsx`
- Modify: `src/modules/operator-workbench/index.tsx`

**Verifier command:**

```bash
npm run typecheck
npm run build
```

**Browser evidence:**

- Load current DEV data.
- Execute route preview with a valid product/currency/region fixture if available.
- If backend returns no route, display clear no-route state, not generic failure.

---

### Slice 1.7: Audit & Request Explorer integration

**Type:** AFK  
**Blocked by:** Slice 1.1  
**User stories covered:**

- “Given request_id or trace_id, where do I look?”

**Acceptance criteria:**

- New route `/workbench/audit` or embedded panel in `/workbench` accepts request/trace IDs.
- Uses existing `platformClient.requestDiagnostics()` and `auditLogs()`.
- Renders:
  - log query string
  - trace/log external link if configured
  - audit facts if present
  - no-audit-fact explanation if only raw request exists
- Does not store raw stdout logs in frontend/business tables.

**Files:**

- Create: `src/modules/operator-workbench/pages/AuditRequestExplorerPage.tsx`
- Modify: `src/modules/operator-workbench/index.tsx`
- Optional shared extraction from `src/modules/audit/components/RequestDiagnosticsPanel.tsx`.

**Verifier command:**

```bash
npm run typecheck
npm run build
```

---

## Phase 2 — Permission/action governance and high-risk wrappers

**Status target:** turn “many admin powers” into controlled internal operations.

### Slice 2.1: Add route/action permission metadata

**Type:** AFK  
**Blocked by:** Phase 1 merged  
**User stories covered:**

- User sees only pages/actions they are allowed to use or sees a clear permission-missing state.
- Engineers can audit which permissions each route/action requires.

**Acceptance criteria:**

- `ConsoleNavItem` supports `requiredPermissions?: string[]` and `riskLevel?: 'read' | 'write' | 'high'`.
- `PlatformModuleManifest.routes` or an adjacent registry supports route permission metadata.
- SideNav hides or disables disallowed nav items based on `sessionStore.permissions`.
- Route wrapper shows permission-required page if a user deep-links without permission.
- Backend remains final authority; frontend gating is only UX/safety.

**Files:**

- Modify: `src/shared/types/module.ts`
- Create: `src/app/guards/RequirePermission.tsx`
- Modify: `src/widgets/side-nav/SideNav.tsx`
- Modify: `src/app/router/index.tsx`
- Modify: all module `index.tsx` files to annotate permission metadata.

**Initial permission mapping:**

- `/workbench/**`: `platform.admin` or specific read permissions as backend allows.
- `/runtime/**`: `platform.admin` in current backend.
- `/billing/**`: `platform.admin` in current backend for settlement/discount details; read split later if backend adds finance read permissions.
- `/access-center`: `platform.admin`.
- `/organizations` global: `platform.admin`; workspace organization list may be broader.
- `/catalog`: `platform.admin` for write operations; read split later.
- `/audit`: `platform.admin`.

**Verifier command:**

```bash
npm run typecheck
npm run build
```

**Negative browser test:**

- Inject/remove `platform.admin` in a controlled mock/session harness or add a unit-level route metadata test.
- Verify disallowed route shows permission state.

---

### Slice 2.2: Create high-risk action wrapper component

**Type:** AFK  
**Blocked by:** Slice 2.1  
**User stories covered:**

- Before dangerous admin changes, operator sees impact, required permission, reason field, and audit expectation.

**Acceptance criteria:**

- Shared component supports:
  - risk title
  - target object
  - required permissions
  - impact bullets
  - confirmation phrase for destructive actions
  - reason textarea
  - submit disabled until valid
  - success state with request ID/audit hint when available
- Does not bypass existing API client.

**Files:**

- Create: `src/shared/ui/HighRiskActionDialog.tsx`
- Create: `src/shared/types/operations.ts`
- Add stories/tests if project adopts Storybook/test framework later.

**Initial adoption targets:**

- Role permission changes in `/access-center`.
- Permission delete / role delete.
- Organization/user/member delete in `/organizations`.
- Catalog delete/update for product/SKU/package/rate-card/quota/capability in `/catalog`.
- Settlement reverse if UI exposes it later.

**Verifier command:**

```bash
npm run typecheck
npm run build
```

---

### Slice 2.3: Instrument high-risk operations with audit/request evidence

**Type:** HITL for exact product copy and required reason policy  
**Blocked by:** Slice 2.2  
**Needs郭凯决策:** true — whether DEV/production requires mandatory reason for all admin writes or only destructive/high-risk writes.

**Acceptance criteria:**

- Wrapped operations show request ID if available from error/success responses.
- Success toast links or suggests `/audit?request_id=...` when response exposes request ID.
- Mutation reports include operation category and target.

**Files:**

- Modify: `src/shared/api/http.ts` to preserve response request ID when available.
- Modify: `src/app/store/toastStore.ts` if toast needs link/action support.
- Modify: relevant pages gradually.

**Verifier command:**

```bash
npm run typecheck
npm run build
```

---

## Phase 3 — Backend aggregate/read-model APIs where frontend composition is insufficient

**Status target:** reduce N+1 frontend orchestration and support true command-center signals.

### Candidate backend read models

Do not build these until Phase 1 proves the page needs them:

1. `GET /api/v1/ops/workbench/summary`
   - runtime failures in last N hours
   - unsettled / failed charge sessions
   - recent high-risk audit actions
   - org/user support signals

2. `GET /api/v1/ops/investigations/runtime/:runtimeJobID`
   - runtime job + attempts + charge session + settlement + asset links + audit diagnostics in one envelope

3. `GET /api/v1/ops/investigations/charge-session/:chargeSessionID`
   - charge session + settlement + discounts + wallet ledger references + runtime/source link

4. `GET /api/v1/ops/investigations/access`
   - target user/org effective permissions, role chain, membership state

**Backend files likely to change if Phase 3 is approved:**

- `platform-backend/internal/router/router.go`
- `platform-backend/internal/modules/opsworkbench/handler.go` or equivalent new shared module
- `platform-backend/internal/modules/opsworkbench/service.go`
- `platform-backend/internal/modules/opsworkbench/types.go`
- tests under `platform-backend/internal/modules/opsworkbench/*_test.go`

**Backend gate:**

```bash
cd /root/work/v/platform-backend
go test ./... -count=1
```

**Frontend consumer gate:**

```bash
cd /root/work/v/platform-frontend
npm run typecheck
npm run build
```

---

## 3. Files likely to change in Phase 1

### New files

- `src/modules/operator-workbench/index.tsx`
- `src/modules/operator-workbench/pages/OperatorWorkbenchPage.tsx`
- `src/modules/operator-workbench/pages/RuntimeInvestigatorPage.tsx`
- `src/modules/operator-workbench/pages/FinanceInvestigatorPage.tsx`
- `src/modules/operator-workbench/pages/AccessInvestigatorPage.tsx`
- `src/modules/operator-workbench/pages/CommercialRouteStudioPage.tsx`
- `src/modules/operator-workbench/pages/AuditRequestExplorerPage.tsx`
- `src/modules/operator-workbench/support/investigationSearch.ts`
- Optional: `src/modules/operator-workbench/components/EvidenceLinkCard.tsx`
- Optional: `src/modules/operator-workbench/components/InvestigationTimeline.tsx`

### Modified files

- `src/shared/types/module.ts`
- `src/widgets/side-nav/SideNav.tsx`
- `src/app/router/moduleRegistry.tsx`
- `src/shared/i18n/locales/en.ts`
- `src/shared/i18n/locales/zh.ts`
- Optional: `src/widgets/topbar/TopBar.tsx`
- Optional: `src/modules/runtime/pages/RuntimeJobDetailPage.tsx` if helpers are extracted
- Optional: `src/modules/audit/components/RequestDiagnosticsPanel.tsx` if explorer shares code

### Docs/evidence

- Add/update `docs/PLATFORM_CONSOLE_FUNCTION_SUPPORT_BLUEPRINT.md` after implementation, not before, so docs reflect code.
- Evidence reports under workspace artifact path after DEV deploy/browser QA.

---

## 4. Design / UX rules

1. **Job-first labels**
   - Use “Investigate runtime job”, “Explain charge session”, “Diagnose access”, “Preview commercial route”.
   - Avoid generic “Management”, “Data”, or “Settings” language for workbench cards.

2. **Evidence chain layout**
   - Each investigator should show a simple chain:
     - input/query
     - matching entity
     - status / explanation
     - linked evidence
     - next action

3. **No fake capabilities**
   - If backend lacks aggregate API, compose existing endpoints or show “not available yet”.
   - Do not expose write buttons until wrappers exist.

4. **Permission clarity**
   - Page should show current operator role/permission summary.
   - Missing permission should be a first-class state, not a silent empty list.

5. **Scope clarity**
   - Always show `global` vs `workspace` meaning.
   - If endpoint requires organization/billing subject, say so and guide scope switch.

6. **No secret leakage**
   - Never render tokens, internal secrets, provider credentials, raw private configs.
   - For JSON manifests, preserve current behavior but consider redaction helper before broadening display.

---

## 5. Verification matrix

### Local frontend gates

```bash
cd /root/work/v/platform-frontend
npm run typecheck
npm run build
```

If lint is stable in this repo:

```bash
npm run lint
```

### Cloud DEV deploy gate

```bash
cd /root/work/v
PLATFORM_FRONTEND_PM=npm tools/dev/deploy-cloud-dev-all.sh --apps platform --services frontend --verify-release
```

### Browser QA checklist

Run authenticated browser verification against Cloud DEV tunnel/public dev route:

- `/login` sign-in succeeds.
- `/workbench` renders job cards.
- `/workbench/runtime` query/list/detail path works.
- `/workbench/finance` charge session path works.
- `/workbench/access` current operator permissions render.
- `/workbench/commercial-route` loads commercial data and route preview state.
- `/workbench/audit` request diagnostics returns success or clear empty state.
- Existing module routes still render:
  - `/runtime/jobs`
  - `/billing`
  - `/organizations`
  - `/access-center`
  - `/audit`
  - `/merchants`
  - `/settings`
- Console errors = 0 on workbench routes.
- Network failures are either 0 or explicitly mapped to unsupported/empty state.

### Evidence report shape

```json
{
  "status": "PASS_WITH_NOTES",
  "routes": [
    {"path":"/workbench", "status":"PASS"},
    {"path":"/workbench/runtime", "status":"PASS"},
    {"path":"/workbench/finance", "status":"PASS"},
    {"path":"/workbench/access", "status":"PASS"},
    {"path":"/workbench/commercial-route", "status":"PASS_WITH_NOTES"},
    {"path":"/workbench/audit", "status":"PASS"}
  ],
  "console_errors": 0,
  "api_failures": [],
  "unverified": [
    "No high-risk writes in Phase 1 by design"
  ]
}
```

---

## 6. Risks and tradeoffs

### Risk 1: Workbench becomes another pile of cards

**Mitigation:** each card must map to a real operator job and either a new investigator route or an existing module route. Require browser click evidence for every card.

### Risk 2: Frontend over-orchestrates too many endpoints

**Mitigation:** Phase 1 composes only existing endpoints; Phase 3 introduces backend read models only after pain is demonstrated.

### Risk 3: Admin writes become too easy

**Mitigation:** Phase 1 workbench is read-first. Phase 2 adds route/action permission metadata and high-risk wrappers before new write actions are added.

### Risk 4: Platform Console absorbs product-specific workflows

**Mitigation:** all workbench pages must show shared Platform facts only. Product-specific next steps link out to product consoles/docs, not into Platform state machines.

### Risk 5: Permission model remains `platform.admin` too coarse

**Mitigation:** document current backend limitation, add frontend metadata now, then split backend permissions later into read/write/admin roles such as `runtime.read`, `billing.read`, `finance.write`, `access.admin`, `commercial.write`.

---

## 7. Open decisions for 郭凯

1. Should `/workbench` become the post-login default route immediately, or remain a new nav item until accepted after Phase 1 browser review?
2. For Phase 2 high-risk operations, should “reason” be mandatory for:
   - all writes, or
   - only deletes / role permission / pricing / quota / wallet / settlement actions?
3. Do we want role naming aligned to product teams now?
   - Platform Super Admin
   - Ops Admin
   - Support
   - Finance
   - Runtime SRE
   - Auditor
4. Should Phase 1 include a visual redesign/prototype gate, or can we land with existing Console visual language and focus on IA/flow?

Recommended default:

- Do not auto-default login to `/workbench` until Phase 1 browser review passes.
- Mandatory reason only for high-risk writes in Phase 2.
- Keep role labels as UX copy first; backend permission split can be Phase 3/4.
- Use existing Console visual language for Phase 1 to reduce scope; redesign later if workflow proves useful.

---

## 8. Suggested execution order

1. Slice 1.1 — route/nav/landing shell.
2. Slice 1.2 — investigation search parser.
3. Slice 1.3 — Runtime Investigator.
4. Slice 1.4 — Finance Investigator.
5. Slice 1.7 — Audit Explorer, because it supports all other investigation paths.
6. Slice 1.5 — Access Investigator.
7. Slice 1.6 — Commercial Route Studio.
8. Run local typecheck/build.
9. Deploy frontend to Cloud DEV.
10. Run authenticated browser QA and evidence report.
11. Decide whether to make `/workbench` default landing.
12. Start Phase 2 permission/action governance.

---

## 9. Done definition for Phase 1

Phase 1 is done when:

- `/workbench` exists and is linked from nav.
- At least Runtime, Finance, Access, Commercial, Audit job cards are visible.
- At least Runtime, Finance, and Audit investigator routes are functionally verified with real Cloud DEV APIs.
- Access and Commercial routes either PASS or PASS_WITH_NOTES with exact missing data/fixture reasons.
- Typecheck/build pass.
- Cloud DEV deploy/release gate passes or PASS_WITH_NOTES with unrelated notes.
- Browser QA report is written under `artifacts/cloud-dev/evidence/`.
- No new write capability is added outside existing source-of-truth modules.
