# V-Platform Console Frontend - Agent Context

> 本仓库是平台运营 / 管理 / 支持控制台前端。进入本目录后先读本文件，再读 `README.md`、workspace 根目录 `../AGENTS.md`，以及与改动相关的前端代码和 Platform API 契约文档。

## 1. Purpose

`v-platform-console-frontend` 面向平台管理员、运营和内部支持角色，承载共享平台能力的控制台体验。

它应该承载：

- auth 登录入口、会话恢复与组织上下文选择
- dashboard 平台总览
- runtime job、provider attempt、charge session 追踪
- template-ops、menu-ops、merchants、catalog、billing、organizations、access-center、audit、settings 等平台运营页面
- 面向运维/支持的 request_id、trace_id、日志/链路查询入口

它不应该承载：

- Platform 后端业务真相或 API 实现逻辑
- 产品线专属业务状态机、定价活动规则或垂直产品工作流
- 共享钱包、订阅、计量、RBAC 等平台事实的重复定义

## 2. Key Documents

- [README](README.md): 模块范围、代码入口、部署入口和可观测约定。
- [Platform Console Function Support Blueprint](docs/PLATFORM_CONSOLE_FUNCTION_SUPPORT_BLUEPRINT.md): Platform 后端能力面、当前前端覆盖/缺口、Console 信息架构与 SelfCheck 门禁蓝图。
- [Workspace Agent Charter](../AGENTS.md): V workspace 总纲、平台/产品边界和 SelfCheck 规则。
- [Workspace Cloud Dev Deploy Runbook](../tools/dev/README.md): Cloud dev / promote 固定入口。
- [Agentic SelfCheck Integration](../docs/AGENTIC_SELFCHECK_INTEGRATION.md): 非 trivial 需求的 SelfCheck gate、consumer sweep 和证据要求。
- [Platform Backend Agent Context](../platform-backend/AGENTS.md): 平台共享能力边界。
- [Platform Backend Internal API Contract](../platform-backend/docs/INTERNAL_API_CONTRACT.md): Platform internal API envelope、auth header、idempotency 与错误约定。

## 3. Commands

```bash
cd /root/work/v/platform-frontend
npm install
npm run dev
npm run typecheck
npm run build
npm run lint
npm run preview
```

Cloud dev / promote 不要从本目录 legacy 脚本绕过 guard。默认从 `/root/work/v` 使用：

```bash
cd /root/work/v
tools/dev/deploy-cloud-dev-all.sh --apps ecom,platform
```

prod promote 只能在明确审批后使用 workspace 级 runbook 命令。

## 4. Contract and QA Rules

- Platform API/DTO/response projection 变化必须同步前端 service/types、真实页面 request graph 和 SelfCheck/contract smoke 证据。
- 前端 route、CTA、状态机或 service layer 变化不能只用静态类型检查结案；需要对应 runtime/browser/API evidence。
- 用户可见的商业状态、资产名、事件名和价格口径应通过 i18n/helper 映射，避免裸露底层 code。
- `src/shared/api/http.ts` 是 token、organization header 和 API error handling 的统一入口；不要在页面里复制 HTTP 处理。
- 审计/诊断页面只展示业务审计事实和外部日志/trace 跳转，不应把高频 access/stdout 日志写入业务表。

## 5. Documentation Rules

- 新增长期前端文档时，更新 `README.md` 或本文件的入口索引。
- 修改部署、端口、API 路径、日志/trace 查询方式时，同步 workspace 级 runbook 或相关 Platform 契约文档。
- 不要在文档中承诺未由代码、OpenAPI、verifier 或运行证据支撑的产品能力。
