# Platform Console 功能支撑蓝图

## 1. 结论先行

Platform 后端已经不是单一“后台 API”，而是共享平台底座：身份/组织/RBAC、商品商业化、计量结算、钱包与额度、Runtime/provider/callback、模板运营、资产注册、审计可观测、激励/渠道分润都已经有模型和路由。Platform Console 前端应该定位为**平台运营与支持控制台**，核心任务不是复制产品线业务流程，而是把这些共享能力变成可审查、可操作、可排障的工作台。

当前前端已经有模块化 shell、真实 `platformClient`、Runtime/Billing/Catalog/Template Ops/Audit 等页面，但支撑还不完整：部分页面仍是静态占位；部分后端能力没有前端入口；也存在“前端已声明/调用、后端未落地”的契约缺口。

最需要优先闭环的 P0 是：

1. **API 契约基线**：让 `platformClient` 的每个 endpoint 都能被后端 route 或明确 feature flag 支撑；当前 `GET /api/v1/audit/diagnostics/requests/:requestID` 真实请求返回 404。
2. **商业化与财务运营可视化**：把 commercial route / wallet ledger / quota grant / metering settlement / charge session 串成一个 operator 可理解的链路，而不是分散 CRUD。
3. **Runtime 闭环排障**：Runtime job、attempt、provider route snapshot、charge session、result asset、callback delivery、audit/request_id 应能在同一任务详情里穿透。
4. **SelfCheck 前端质量闭环**：重大 Platform Console 功能应走 `Design Quality Pack -> prototype/route-state matrix -> real API/browser evidence -> visual/runtime gate`，不能只靠 `typecheck`。

## 2. 本次梳理依据

已核对的事实来源：

- Backend context：`platform-backend/AGENTS.md`
- Backend route surface：`platform-backend/internal/router/router.go`
- Backend data models：`platform-backend/internal/models/*.go`
- Backend architecture docs：
  - `docs/architecture/COMMERCIALIZATION_FULL_VIEW_AND_PHASES.md`
  - `docs/architecture/COMMERCIALIZATION_BOUNDARY.md`
  - `docs/architecture/COMMERCIAL_CATALOG_MODEL.md`
  - `docs/architecture/COMMERCIAL_ROUTING_MODEL.md`
  - `docs/architecture/METERING_AND_USAGE_SSOT.md`
  - `docs/architecture/RUNTIME_AND_CHARGE_PLATFORMIZATION.md`
  - `docs/architecture/RUNTIME_PRODUCT_CALLBACK_ABSTRACTION.md`
  - `docs/architecture/ASSET_STORAGE_REGISTRY_AND_IMPORT.md`
  - `docs/architecture/OBSERVABILITY_AUDIT_DIAGNOSTICS.md`
  - `docs/architecture/OBSERVABILITY_EVENT_SPEC.md`
  - `docs/architecture/PLATFORM_STABILITY_CLOSED_LOOP_GATES.md`
  - `docs/architecture/PLATFORM_BUSINESS_CORRECTNESS_ORACLE.md`
- Frontend context：`platform-frontend/AGENTS.md`、`platform-frontend/README.md`
- Frontend implementation：`src/app/router/moduleRegistry.tsx`、`src/shared/api/platformClient.ts`、`src/modules/**`
- SelfCheck frontend planning：
  - `agentic-selfcheck/docs/frontend-quality-loop.md`
  - `agentic-selfcheck/docs/v-frontend-quality-loop.md`
  - `agentic-selfcheck/docs/plans/frontend-ai-quality-system-roadmap.md`
  - `agentic-selfcheck/features/frontend-design-quality-pack.yaml`
  - `agentic-selfcheck/features/platform-ops-visible-baseline.yaml`
  - `agentic-selfcheck/features/platform-stability-closed-loop-gates.yaml`

已跑过的关键验证：

```bash
cd /root/work/agentic-selfcheck
python3 scripts/frontend_design_quality_pack_gate.py --root . --format json
# status: PASS

python3 scripts/v_business_gate_selector.py --changed-file /root/work/v/platform-frontend/src/modules/audit/pages/AuditPage.tsx --format json
# selected: platform-core-engineering-baseline, platform-ops-visible-baseline

python3 scripts/platform_ops_visible_baseline_gate.py --report /tmp/platform-ops-visible-baseline-full.json
# status: PASS

cd /root/work/v
python3 tools/docs/formal-doc-gate.py --write-artifacts
# status=PASS markdown_files=174 errors=0 warnings=0
```

同时用真实 HTTP probe 验证：

```text
GET http://127.0.0.1:8195/api/v1/audit/diagnostics/requests/probe-request-id?limit=1
status: 404
body: 404 page not found
```

这说明 Audit diagnostics 前端类型和调用已经写了，但后端 route/handler 尚未落地；现有 `platform-ops-visible-baseline` 只校验前端入口和外部日志/trace 配置，没有真正调用该 diagnostics API。

## 3. Platform 后端能力面

### 3.1 核心域与边界

| 能力域 | 后端模块 / 模型 | 当前职责 | 前端应如何支撑 |
|---|---|---|---|
| 身份 / 组织 / RBAC | `identity`, `organization`, `access`; `User`, `Organization`, `OrganizationMember`, `Role`, `Permission` | 登录、会话、组织上下文、权限与角色 | 登录、组织切换、组织/成员/用户管理、角色权限矩阵、权限诊断 |
| 商品商业化目录 | `catalog`, `commercial`; `Product`, `SKU`, `CommercialPackage`, `BillableItem`, `RateCard` | 平台“卖什么/怎么计价”的 SSOT | Catalog 工作台、Offering 预览、价格/套餐变更审计、影响预览 |
| 商业主体与路由 | `commercial`; `CommercialEntity`, `MerchantAccount`, `SettlementAccount`, `BillingProfile`, `RoutingPolicy` | 钱归哪个主体、走哪个 merchant/settlement account | Commercial Routing Studio：主体、账号、billing profile、routing policy、route resolve preview |
| 额度 / 权益 / 控制 | `control`; `QuotaGrantPolicy`, `PackageCapabilityPolicy`, reservation APIs | package 激活、quota/capability grant、reserve/commit/release | Package/Policy 工作台、额度发放/回滚操作台、reservation 状态可视化 |
| 钱包 / 账本 | `wallet`; `WalletAccount`, `WalletBucket`, `WalletLedger`, `AssetDefinition`, `AllowancePolicy` | credits/allowance/reward 等资产定义、余额和流水 | Wallet Ledger Workspace：账户、bucket、ledger、cycle allowance、expire/lifecycle 运行证据 |
| 计量 / 结算 | `metering`; `MeterEvent`, `UsageRecord`, `UsageAgg`, `SettlementRecord`, `DiscountLedger` | usage truth source、settlement、reverse、discount | Usage/Settlement 排障页，按 request_id/event_id/charge_session/source 追踪 |
| Runtime / Provider | `runtime`; `RuntimeProviderDefinition`, `RuntimeProviderBinding`, `RuntimeJob`, `RuntimeAttempt`, `ChargeSession`, `RuntimeCallbackDelivery` | provider 路由、异步任务、attempt、callback、result asset、charge session | Runtime Mission Control：任务时间线、attempt、route snapshot、charge session、callback delivery、asset manifest |
| 资产注册 | `assetstorage`; `StorageAsset`, `StorageBinding` | 平台统一资产注册、导入、解析和受控访问 | Asset Registry：source ref、storage key、preview、绑定关系、导入/解析结果 |
| 模板运营 | `templateops`; `TemplateOpsCatalog`, assets/import/export | 跨产品模板 catalog、CSV、asset binding、publish | Template Ops 已有较强入口；需强化批量导入证据、asset missing/ready 状态 |
| 审计 / 可观测 | `audit`, `telemetry`, `middleware/access_log` | business audit facts、request_id/trace_id、structured stdout、trace seeds | Audit & Diagnostics：审计事实、request/trace 外部跳转、系统日志搜索；嵌入式 diagnostics 需要后端 API 实现 |
| 激励 / 渠道 | `incentive`; reward/referral/channel partner/policy/settlement/clawback | referral、reward、commission、channel partner settlement | Partner/Incentive Console：program/code/conversion/commission/batch/clawback 状态流 |

### 3.2 Public vs internal API 边界

- Public `/api/v1/*` 面向 Platform Console 和管理员操作，受 JWT 和权限控制。
- `/internal/v1/*` 面向产品服务调用，受 internal service secret 控制；前端不应直接调用。
- Product-specific workflow state 不应进 Platform Console；Console 只展示跨产品共享事实、路由、账务、审计和排障证据。
- Business DB 可以存 audit/usage/settlement/runtime job 事实，但不能把 stdout/access log 全量塞进业务表；低层日志应走外部日志平台。

## 4. 当前 Platform Console 覆盖情况

### 4.1 已有路由和真实支撑

| 前端模块 | 路由 | 当前支撑状态 |
|---|---|---|
| `auth` | `/login` | 真实 login/me/session 入口 |
| `dashboard` | `/overview` | 有 healthz、workspace wallet/settlement/discount 信号；global summary 仍是 placeholder/缺 aggregate API |
| `runtime` | `/runtime/jobs`, `/runtime/jobs/:runtimeJobID` | 真实 runtime jobs/detail/attempts；还未覆盖 provider definitions/capabilities/callback delivery 操作视图 |
| `template-ops` | `/template-ops` | 真实 catalog/sync/CSV/import/assets/publish，当前是较完整的运营页 |
| `menu-ops` | `/menu-ops` | 走 Menu ops API，用作产品侧桥接视图；要防止变成 Platform 承载 Menu 专属 workflow |
| `catalog` | `/catalog` | 真实 product/SKU/package/billable/rate-card/asset/quota/capability policy CRUD |
| `billing` | `/billing`, detail routes | 真实 charge session、settlement、discount；wallet accounts/buckets/ledger/control 操作未完整前端化 |
| `organizations` | `/organizations` | 真实 ops organizations/users/members |
| `access-center` | `/access-center` | 真实 permission/role/role-permission 管理 |
| `audit` | `/audit` | 真实 audit logs/detail；外部 log/trace URL 生成；嵌入式 diagnostics API 缺后端 |
| `settings` | `/settings` | 当前是静态卡片，不应被视为已落地系统设置能力 |
| `merchants` | `/merchants` | 当前是静态 rows；后端已有 commercial entity/billing profile/routing policy，但前端未接入 |

### 4.2 已确认的缺口

| 缺口 | 证据 | 风险 |
|---|---|---|
| Audit diagnostics endpoint 缺后端 | `platformClient.requestDiagnostics()` 调 `/audit/diagnostics/requests/:requestID`；后端 route 搜索为空；真实 HTTP 返回 404 | 页面可显示一个“Run diagnostics”动作，但点击会失败；SelfCheck 当前没有抓到这个 API 缺口 |
| `merchants` 静态数据 | `MerchantsPage.tsx` 内 hard-coded `rows` | 用户可能误以为 merchant/commercial routing 已接入 |
| `settings` 静态数据 | `SettingsPage.tsx` 内 hard-coded cards | 容易承诺未实现配置能力 |
| Dashboard global aggregate 缺 API | Overview 文案显示 global scope 的 pending settlement/wallet 还是 workspace-only | 全局运营总览无法作为值班大屏或发布验收证据 |
| Commercial APIs 未进入 `platformClient` | 后端有 `/commercial/entities`, `/billing-profiles`, `/routing-policies`, `/route/resolve`；client 未提供方法 | 无法构建商业主体/路由工作台 |
| Wallet ledger/account/bucket 未完整前端化 | 后端有 `/wallet/accounts`, `/wallet/buckets`, `/wallet/ledger`；client/page 只覆盖 summary/assets/allowance | 财务排障只能看摘要，不能闭环解释余额变化 |
| Control 操作面未完整前端化 | 后端有 quota/credits grant、package activation、reservation APIs；client 主要覆盖 policy CRUD | 运营补偿、套餐激活、reservation 失败排障缺操作证据 |
| Incentive/channel partner 无前端模块 | 后端 route 覆盖 reward/referral/channel commission/policy/settlement/clawback | 渠道分润和合作伙伴结算无法运营可视化 |
| 前端测试/视觉 harness 缺失 | 当前没有 `*.test.*`、没有 Storybook 文件 | 非 trivial UI 改动很难用证据证明未退化 |

## 5. 建议的信息架构

### 5.1 顶层分组

建议把现有 nav 从“模块平铺”逐步收敛为以下五个 operator 工作区：

1. **Command Center**
   - `/overview`
   - 平台健康、关键异常、待处理结算/Runtime/audit 信号、当前 scope、近期高风险操作。
   - 需要新增后端 aggregate/read-model，否则只能做 workspace 小摘要。

2. **Capability & Commercial Ops**
   - `/catalog`
   - `/commercial/routing` 或重构 `/merchants`
   - `/controls/packages`
   - 管 product / sku / package / billable item / rate card / offering / commercial entity / billing profile / routing policy / package activation。

3. **Runtime Mission Control**
   - `/runtime/jobs`
   - `/runtime/jobs/:runtimeJobID`
   - provider binding/capability read-only view、attempt timeline、callback delivery、charge session、result asset、route snapshot。

4. **Finance & Ledger**
   - `/billing`
   - `/wallet/accounts`, `/wallet/ledger`, `/metering/settlements`
   - wallet balance、bucket、ledger、allowance、discount、settlement、reverse、charge session reconciliation。

5. **Governance & Support**
   - `/organizations`
   - `/access-center`
   - `/audit`
   - `/settings`
   - 组织/用户/权限、审计、request_id/trace_id、外部 log/trace、系统默认配置。

后续可增：

6. **Partners & Incentives**
   - `/partners`, `/incentives`
   - reward/referral/channel program/policy/commission/settlement batch/clawback。

### 5.2 页面设计原则

- **从 operator job 出发，而非数据库表出发**：例如“解释一次扣费为什么发生”比“列 settlement 表”更重要。
- **每个高风险动作必须有影响预览、权限要求、审计结果和 rollback/repair 入口**。
- **列表页展示业务状态，详情页展示证据链**：request_id、trace_id、event_id、charge_session_id、runtime_job_id、settlement_id、asset_id。
- **不造假能力**：缺后端就用 internal `contract-needed` 文档标注，不在 UI 中展示可点击成功动作。
- **产品线边界清晰**：Ecom/Menu/KYC 业务 workflow 留在各产品；Platform Console 只看共享 runtime、billing、storage、audit、quota 等事实。

## 6. 重点功能支撑设计

### 6.1 Commercial Routing Studio

**目标**：把“钱走哪个主体/账号/路由策略”从后端模型变成运营可审查页面。

Backend 支撑：

- `GET/POST /api/v1/commercial/entities`
- `GET/POST /api/v1/commercial/billing-profiles`
- `GET/POST/PUT/DELETE /api/v1/commercial/routing-policies`
- `POST /api/v1/commercial/route/resolve`

Frontend 需要：

- `platformClient` 增加 commercial entities / billing profiles / routing policies / route resolve methods。
- 替换 `/merchants` 静态表，改为 commercial entity + billing profile + route policy 列表。
- 详情页显示：entity -> merchant account -> settlement account -> billing profile -> routing policy。
- Route preview：输入 product/org/region/currency/channel，返回 merchant/settlement/account snapshot。
- 状态：loading / empty / permission denied / conflict / inactive route / missing default profile。
- 审计：创建/更新/删除 routing policy 后必须在 `/audit` 可查。

### 6.2 Catalog & Offering Workbench

**目标**：把 product/SKU/package/billable/rate-card/asset/policy 形成一张“售卖能力图”。

已有支撑：`/catalog` 页面已接入 product、SKU、package、billable item、rate card、wallet assets、allowance policy、quota policy、capability policy。

需要加强：

- Offering preview：按 product_code 展示最终对产品/套餐可见的组合结果。
- 影响预览：修改 rate card/package/policy 前提示影响的 package、billable item、existing org grants。
- 版本/生效窗口：rate card 有 `effective_from/effective_to/version`，UI 应明确展示和筛选。
- 变更审计：每个高风险写操作后显示 audit link。
- 导入/导出 evidence：批量修改必须输出导入摘要、失败行、可回滚建议。

### 6.3 Runtime Mission Control

**目标**：从 Runtime job 详情直接解释 provider、fallback、charge、asset 和 callback。

已有支撑：

- `GET /api/v1/runtime/jobs`
- `GET /api/v1/runtime/jobs/:runtimeJobID`
- `GET /api/v1/runtime/charge-sessions`
- `GET /api/v1/runtime/charge-sessions/:chargeSessionID`

需要加强：

- Job detail 内联：attempt timeline、provider request/response 摘要、route snapshot diff、input/output manifest、asset preview、charge session、settlement link、audit/request_id。
- Provider/capability 管理先做 read-only：当前 provider definitions/capabilities 主要在 `/internal/v1/runtime/*`，若 Console 要配置，需要新增受 `platform.admin` 保护的 public admin API。
- Callback delivery：后端有 `RuntimeCallbackDelivery` 模型，但公开查询/重试入口需要确认或补齐。
- Fail-closed UX：unsupported provider/input-mode、callback secret mismatch、late callback、duplicate callback 应有明确 operator hint。

### 6.4 Finance & Ledger Workspace

**目标**：让运营能解释“余额为什么这样、一次消费怎么结算、哪里需要补偿”。

已有支撑：

- wallet summary / asset definitions / allowance policies
- charge sessions
- settlements / discounts

需要补齐：

- `wallet/accounts`、`wallet/buckets`、`wallet/ledger` client + UI。
- quota/credits grant、package activation、reservation reserve/commit/release 的 operator flows。
- settlement reverse 高风险动作：必须有确认、reason、影响预览、审计 link。
- Reconciliation detail：charge session -> reservation -> metering event -> settlement -> wallet ledger 的一屏证据链。
- 多 scope：global 列表与 workspace/org detail 分离，避免 global 下展示 workspace-only 假指标。

### 6.5 Audit & Diagnostics

**目标**：让支持从任意 request_id / trace_id 进入业务事实、外部日志和 trace。

已有支撑：

- `GET /api/v1/audit/logs`
- `GET /api/v1/audit/logs/:auditID`
- `VITE_LOG_EXPLORER_URL`
- `VITE_TRACE_EXPLORER_URL`
- `VITE_TRACE_BACKEND_ENABLED`

必须修复：

- 二选一：
  1. 实现后端 `GET /api/v1/audit/diagnostics/requests/:requestID`，按 `OBSERVABILITY_EVENT_SPEC.md` 先查外部日志或 provider seam，再生成 sanitized operator summary；或
  2. 前端移除/feature flag 嵌入式 diagnostics，只保留 external log/trace search。
- SelfCheck `platform-ops-visible-baseline` 必须真实调用 diagnostics API 或明确检查该功能关闭，否则当前 PASS 会掩盖 404。
- UI 内部可以展示 request_id/trace_id；但不得展示 raw token、provider secret、raw prompt、大 payload、signed URL。

### 6.6 Partners & Incentives Console

**目标**：把后端已经存在的 incentive/channel partner 能力变成可运营、可对账、可审计的页面。

Backend 支撑已存在：

- rewards / commissions / redeem
- referral programs / referral codes / conversions
- channel partners / programs / bindings
- channel policies / policy versions / assignments / resolution preview
- channel commissions / clawbacks / settlement batches / settlement items
- channel charge/refund events

Frontend 建议：

- P1 先做 read-only + settlement batch 操作：partner/program/policy/commission/batch/clawback 列表与状态机。
- P2 再开放创建/编辑 policy 和 settlement batch transitions。
- 所有金额和状态走 i18n helper，不裸露底层 code 给非技术运营。

## 7. SelfCheck / 前端质量门禁设计

SelfCheck 已有的关键原则：

- C/D-risk 前端工作不能直接进生产 React；要先有 Design Quality Pack、现状审计、API/backend feasibility map。
- Serious prototype 目标应一次性瞄准 Stage 4：业务上下文、交互闭环、主要功能映射到后端/API/数据可行性。
- Final verification 不能只看 build/typecheck；必须看 visual evidence、browser/runtime evidence、real API 或明确 `contract-needed`。

建议新增或收敛为一个 Platform Console 专用 gate：

```text
feature: v-platform-console-function-support
static:
  - platform-client-endpoint-vs-router scan
  - no-static-fake-rows on production modules
  - route/state matrix exists for changed module
  - i18n/helper mapping for status/money/code labels
api:
  - login + me + route-specific API smoke
  - for audit diagnostics: call endpoint or assert feature flag off
  - for commercial/finance/runtime: targeted real API read smoke
browser:
  - route smoke for changed modules
  - console/network error check
  - key interactions: filter, detail open, external log link, modal open/close
visual/evidence:
  - screenshots desktop + narrow width
  - Design Quality Pack / API feasibility map
  - accepted deviations / known contract-needed list
```

同时补一个通用 scanner：

```text
scripts/platform_console_contract_gap_scan.py
```

它至少检查：

- `src/shared/api/platformClient.ts` 中 endpoint 是否存在于 backend router。
- 页面是否包含 hard-coded production rows 且没有 API call。
- 文档声明的 route/API 是否有真实 route 或 feature flag。
- `platformClient` 新增方法是否有页面使用或契约说明。

## 8. 分阶段落地建议

### P0：契约和假能力清理

1. 修复 Audit diagnostics：实现 backend API 或前端 feature flag/remove 嵌入式调用。
2. 建立 endpoint-vs-router scanner，并接入 `platform-ops-visible-baseline` 或新的 Platform Console gate。
3. `/merchants` 去静态化：先接 commercial read-only；没有 contract 就明确隐藏/标注为未启用。
4. `/settings` 去静态化：没有配置 API 就降级为文档/只读能力索引，不显示可操作承诺。
5. 为 `/overview` 明确 global vs workspace 数据边界，缺 aggregate API 就不要展示 global 数字。

### P1：运营闭环

1. Commercial Routing Studio：entity/profile/policy/resolve preview。
2. Wallet Ledger Workspace：accounts/buckets/ledger + charge/settlement/ledger 关联。
3. Runtime Detail 证据链：attempt -> charge -> settlement -> asset -> audit。
4. Control high-risk operations：grant、package activation、reservation 操作加影响预览和审计。
5. Incentive/Partner read-only + settlement batch 状态机。

### P2：质量系统化

1. 给 Platform Console 增加 Playwright route smoke 和 screenshot evidence。
2. 补 Storybook 或轻量 component workshop，用于 Catalog/Billing/Runtime/Audit 的主要状态卡片。
3. 接入 SelfCheck frontend Design Quality Pack 项目 adapter：tokens、components、routes、commands、screenshots。
4. 把重大功能从 `requirement -> React code` 改成 `context pack -> prototype/route-state matrix -> acceptance -> implementation parity -> browser/API gate`。

## 9. 当前不可忽略的风险

- **Gate blindspot**：`platform-ops-visible-baseline` 当前能 PASS，但没有抓到 diagnostics API 404。需要把真实 API smoke 加进去。
- **静态页面误导**：`/merchants`、`/settings` 的静态卡片/rows 会让人误以为能力已落地。
- **后端能力远多于前端入口**：incentive/channel、wallet ledger、commercial routing、control operations 都已有较多后端 surface，但前端还没有完整工作台。
- **前端质量证据不足**：当前没有 test/storybook；重大页面改动若只跑 typecheck/build，不足以证明运营体验和真实 API 闭环。
- **Platform/Product 边界容易滑坡**：Menu/Ecom/KYC 的专属业务流程不能被 Platform Console 吸收；Console 应展示共享事实和排障证据。

## 10. 推荐的下一步执行切片

如果马上进入实现，建议第一刀不要做大而全 redesign，而是做一个可验证的闭环：

```text
Slice A: Platform Console Contract Baseline
1. 写 endpoint-vs-router scanner。
2. 修复/feature flag Audit diagnostics 404。
3. 去掉或接实 /merchants 静态 rows。
4. 为 selector/gate 增加 Platform Console API smoke。
5. 跑 typecheck/build + targeted browser route smoke。
```

这个切片完成后，再进入：

```text
Slice B: Commercial Routing Studio read-only + route resolve preview
Slice C: Wallet/Ledger/Charge reconciliation workspace
Slice D: Runtime Mission Control detail evidence chain
```
