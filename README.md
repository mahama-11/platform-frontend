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

## 当前约定

- 面向用户可见的商业状态、资产名、事件名、价格口径统一通过前端 i18n helper 映射，不直接裸露底层 code。
- 价格相关字段统一按最小货币单位存储与传输；界面展示会同时给出可读金额与原始最小单位说明。
- `dist/` 与 `node_modules/` 不纳入仓库。
