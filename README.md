# v-platform-console-frontend

`v-platform-console-frontend` 是平台控制台前端，负责运营、平台管理员与内部支持角色使用的平台工作台界面。

## 功能范围

当前已覆盖的主要模块包括：

- `auth`: 登录入口与会话恢复
- `dashboard`: 平台总览页
- `organizations`: 组织视角切换与列表
- `access-center`: 访问控制与权限视图
- `audit`: 审计日志查询
- `billing`: charge session / settlement / discount 运营排障页
- `catalog`: product / sku / package / billable item / rate card / asset / policy 管理
- `runtime`: runtime job 与 attempt 追踪
- `template-ops`: 平台模板运营中心
- `menu-ops`: Menu 业务历史作业与资产库联调页

## 技术栈

- React 19
- TypeScript
- Vite
- React Router
- Framer Motion
- i18next

## 开发命令

```bash
npm install
npm run dev
npm run build
```

## 部署

Cloud dev / promote 的固定入口在 workspace 级 runbook：`../tools/dev/README.md`。

- Cloud dev 部署必须从 `/root/work/v` 使用 `tools/dev/deploy-cloud-dev-all.sh --apps ecom,platform`，不要直接运行本目录旧 `deploy/deploy.sh dev` 绕过 commit/prod guard/evidence。
- dev 验证后 promote prod 只能在审批后使用 `tools/dev/promote-cloud-dev-to-prod.sh --yes --src-tag dev`。
- `deploy/Dockerfile`: 生产镜像，多阶段构建并使用 Nginx 承载静态产物
- `deploy/Dockerfile.dev`: 使用本地已构建 `dist/` 的轻量开发镜像
- `deploy/platform-console-nginx.conf`: SPA 路由回退与静态缓存配置
- `deploy/entrypoint.sh`: 容器启动时注入 `VITE_*` 运行时环境变量
- `deploy/docker-compose.yml`: `dev/prod` 两套服务编排样例
- `deploy/deploy.sh`: legacy 单项目脚本；Cloud dev 默认被阻断，除非显式 `ALLOW_LEGACY_DEV_DEPLOY=1` 做本地实验。正常 Cloud dev/promote 使用 workspace 级 `tools/dev/*`。

## 当前约定

- 面向用户可见的商业状态、资产名、事件名、价格口径统一通过前端 i18n helper 映射，不直接裸露底层 code。
- 价格相关字段统一按最小货币单位存储与传输；界面展示会同时给出可读金额与原始最小单位说明。
- `dist/` 与 `node_modules/` 不纳入仓库。

## 可观测入口

审计诊断页 `/audit` 以 Platform 后端 `platform_audit_logs` 为业务事实入口，并支持跳转到外部日志/链路系统：

- `VITE_LOG_EXPLORER_URL`: vendor-neutral 日志查询入口，可指向 Grafana Explore(Loki)、ELK/Kibana、ClickHouse 查询页或商业日志平台。支持 `{request_id}` / `{trace_id}` 占位符；若不含占位符，会自动追加 `request_id` 与 `trace_id` query 参数。React 代码只负责模板替换，不写死 Loki/LogQL。
- `VITE_TRACE_EXPLORER_URL`: Trace 查询入口，建议指向 Grafana Tempo 或 Jaeger。支持 `{trace_id}` 占位符；若不含占位符，会自动追加 `trace_id` query 参数。

边界：业务 DB 只保存审计事实；高频 access/stdout 日志应进入日志平台，不应写入 `platform_audit_logs`。
