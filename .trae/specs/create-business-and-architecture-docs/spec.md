# CookTrace 业务场景说明与技术架构文档 Spec

## Why
CookTrace 是一个自托管的菜谱 / 食材库 / 烹饪记录应用，有 Web PWA、Android、Wear OS 三个客户端，服务端用 Docker 部署。现有文档都是英文，内容分散，缺少一份中文的业务说明和架构说明，能把"为谁、解决什么问题、怎么实现"讲成一个前后自洽的整体。

## What Changes
- 新增 `docs/analysis/业务场景说明.md`（聚焦核心场景，篇幅精简）
- 新增 `docs/analysis/技术架构文档.md`（聚焦核心架构，篇幅精简）
- 只写文档，不改任何代码和现有文档

## Impact
- Affected code: 无
- 分析依据：`README.md`、`ARCHITECTURE.md`、`server/index.js`、`server/db.js`、`server/routes/*`、`server/lib/*`、`src/App.svelte`、`src/lib/api*.js`、`src/lib/sync.js`、`Dockerfile`

## ADDED Requirements

### Requirement: 业务场景说明（精简版）
文档 SHALL 用中文写成，内容如下：
1. **产品定位**：自托管、隐私优先、单容器部署；目标用户（个人 / 家庭）
2. **角色**：管理员、家庭成员、公开链接访客、外部 AI Agent
3. **核心业务对象**：菜谱、食材库、烹饪日记、购物清单、菜谱集、厨房，配一张关系图（Mermaid）
4. **核心场景（4 个）**：每个场景写清触发者、主流程、结果
   - 菜谱收集：从 URL、文件或其他应用导入，然后去重
   - 从食材库到餐桌的主线：食材库 → 周计划 → 购物清单 → 烹饪模式 → 烹饪日记
   - 家庭共享：厨房 / 菜谱集共享，加上过敏原提醒
   - AI 辅助：Trace AI 对话，以及通过 MCP 让外部 Agent 接入
5. **业务闭环与关键规则**：上面 4 个场景怎么串成一个循环；列 3~5 条关键业务规则

#### Scenario: 读者理解业务
- **WHEN** 一个新读者读完这份文档
- **THEN** 能说清产品价值、核心对象和主线流程，且每处描述都能在代码里找到依据

### Requirement: 技术架构文档（精简版）
文档 SHALL 用中文写成，内容如下：
1. **技术栈**：前端 Svelte + Vite + PWA；移动端 Capacitor Android + Wear OS；后端 Node + Express + SQLite
2. **整体架构图**（Mermaid）：各客户端、单容器服务端、SQLite / uploads 存储、主要外部服务
3. **服务端**：请求处理管线的主要环节；按业务域划分路由的概览表
4. **数据层**：核心表的 ER 图，以及软删除和版本机制
5. **前端与离线同步**：api.js 怎么在 HTTP / 本地 / 缓存三种实现之间分派；同步机制（先拉后推、按字段合并），配一张时序图
6. **安全要点**：认证方式（JWT Cookie + CSRF、OIDC、API Token），列几项关键防护
7. **部署**：Docker 部署方式、关键环境变量
8. **关键设计取舍**

#### Scenario: 读者理解架构
- **WHEN** 一位新开发者读完这份文档
- **THEN** 能知道主要模块在哪、数据怎么流动、怎么部署；引用的路径都真实存在

## MODIFIED Requirements
无

## REMOVED Requirements
无
