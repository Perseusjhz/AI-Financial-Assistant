---
name: project-money-buddy-agent
description: 招商训练营竞赛项目——攒钱搭子 AI，大学生理财陪伴智能体，已完成 MVP 开发
metadata:
  type: project
---

攒钱搭子 AI 项目，有两套后端：
1. money-buddy-agent/（老版 Next.js，端口 3001）
2. backend_new/（新版 Express，默认端口 3001，测试用 4001）

**Why:** 招商银行训练营 AI 产品经理赛道参赛作品

**How to apply:** 优先使用 backend_new + frontend_new 组合部署

## backend_new（新后端，推荐）

路径：/Users/hihi/Desktop/招商训练营/backend_new/
启动：cd backend_new && node server.js（默认端口 3001）
技术栈：Express.js + OpenAI SDK（兼容 DeepSeek/OpenAI）
无 API Key 时自动进入 demo 模式（deterministic 回退）

API 端点（完全对齐 frontend_new 六屏）：
- POST /api/saving-plan      → PlanScreen（每日预算计算 + AI 说明）
- POST /api/expense-review   → ReviewScreen（自然语言消费分类 + 超支判断）
- POST /api/risk-education   → RiskScreen（5 级风险规则 + 学生适配判断）
- POST /api/chat             → ChatScreen（意图自动识别，路由到对应 workflow）
- GET  /api/home-stats       → HomeScreen（趋势图数据 + KPI）
- GET/POST /api/profile/*    → ProfileScreen（统计数据 + 档案校验）

核心库：
- lib/budget.js  — 预算公式（totalIncome-fixedExpense-savingGoal)/remainingDays
- lib/expense.js — 自然语言解析 + 4类消费分类（必要/可优化/冲动/学习）
- lib/risk.js    — 5 级风险规则（借贷>币>股票>基金>货币基金>储蓄）
- lib/rag.js     — 标签+关键词轻量检索，知识库 14 条
- lib/llm.js     — OpenAI 兼容调用（DEEPSEEK_API_KEY 或 OPENAI_API_KEY）
- lib/prompts.js — 系统 Prompt + 各 workflow 的结构化 JSON 提示词

## frontend_new（前端设计稿）

路径：/Users/hihi/Desktop/招商训练营/frontend_new/project/
六屏 JSX：HomeScreen, PlanScreen, ReviewScreen, RiskScreen, ChatScreen, ProfileScreen
静态 HTML 打开即可预览，无需构建

待完成：
- 用户提供 DeepSeek/OpenAI API Key → 写入 backend_new/.env.local
- 部署到 DigitalOcean/Vercel 生成可扫码二维码
- 将 frontend_new 接入 backend_new API（或用 Next.js 重新集成）
- PPT 制作（12页以内）
- 3分钟演示视频录制
