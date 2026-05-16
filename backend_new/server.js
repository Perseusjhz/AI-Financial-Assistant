'use strict';

require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const express  = require('express');
const cors     = require('cors');

const savingPlanRouter    = require('./routes/savingPlan');
const expenseReviewRouter = require('./routes/expenseReview');
const riskEducationRouter = require('./routes/riskEducation');
const chatRouter          = require('./routes/chat');
const homeStatsRouter     = require('./routes/homeStats');
const chartDataRouter     = require('./routes/chartData');
const profileRouter       = require('./routes/profile');
const spendingUpdateRouter = require('./routes/spendingUpdate');
const financeGuideRouter   = require('./routes/financeGuide');

const path = require('path');
const db   = require('./lib/db');
db.seed(); // 首次启动写入演示数据

const app  = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ───────────────────────────────────────────────────────

app.use(cors({
  origin: [
    'http://localhost:3000',  // Next.js frontend dev
    'http://localhost:5173',  // Vite dev
    'http://localhost:8080',
    /\.digitalocean\.app$/,   // DigitalOcean hosting
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.static(path.join(__dirname, 'public')));
// Serve original frontend_new JSX/CSS files so index.html can load them
app.use('/orig', express.static(path.join(__dirname, '../frontend_new/project')));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

// ─── Health & info ────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  const { isDemoMode } = require('./lib/llm');
  res.json({
    status: 'ok',
    product: '攒钱搭子 AI',
    version: '1.0.0',
    demoMode: isDemoMode(),
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api
 * Lists all available endpoints (useful for demos and onboarding).
 */
app.get('/api', (req, res) => {
  res.json({
    product: '攒钱搭子 AI — Backend API',
    endpoints: [
      { method: 'POST', path: '/api/saving-plan',    desc: '攒钱计划 Workflow — 输入收入/支出/目标，返回每日预算和可行性' },
      { method: 'POST', path: '/api/expense-review', desc: '消费复盘 Workflow — 输入自然语言消费记录，返回分类和建议' },
      { method: 'POST', path: '/api/risk-education', desc: '风险教育 Workflow — 输入理财问题，返回风险评级和解释' },
      { method: 'POST', path: '/api/chat',           desc: 'AI 搭子对话 — 自动识别意图并路由到对应 Workflow' },
      { method: 'GET',  path: '/api/home-stats',     desc: '首页数据 — 日均消费、计划进度、消费趋势图数据' },
      { method: 'GET',  path: '/api/profile/defaults',  desc: '用户档案默认值' },
      { method: 'POST', path: '/api/profile/validate',  desc: '校验用户档案并返回计算结果' },
      { method: 'GET',  path: '/api/profile/stats',     desc: '个人页统计数据' },
    ],
    notice: '本产品不推销任何金融产品，所有回答仅供理财教育参考。',
  });
});

// ─── Routes ───────────────────────────────────────────────────────────

app.use('/api/saving-plan',    savingPlanRouter);
app.use('/api/expense-review', expenseReviewRouter);
app.use('/api/risk-education', riskEducationRouter);
app.use('/api/chat',           chatRouter);
app.use('/api/home-stats',     homeStatsRouter);
app.use('/api/chart-data',    chartDataRouter);
app.use('/api/profile',        profileRouter);
app.use('/api/spending',       spendingUpdateRouter);
app.use('/api/finance-guide', financeGuideRouter);

// ─── Error handler ────────────────────────────────────────────────────

app.use((err, req, res, next) => {
  console.error('[unhandled]', err);
  res.status(500).json({ error: 'server_error', message: '服务异常，请稍后重试' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'not_found', message: `路由 ${req.method} ${req.path} 不存在` });
});

// ─── Start ────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  const { isDemoMode } = require('./lib/llm');
  console.log(`\n攒钱搭子 AI — Backend`);
  console.log(`  监听端口: http://localhost:${PORT}`);
  console.log(`  API 列表: http://localhost:${PORT}/api`);
  console.log(`  健康检查: http://localhost:${PORT}/health`);
  console.log(`  LLM 模式: ${isDemoMode() ? '演示模式（无需 API Key）' : '真实 LLM（已配置 API Key）'}`);
  console.log(`  提示: 在 .env.local 中设置 DEEPSEEK_API_KEY 或 OPENAI_API_KEY\n`);
});

module.exports = app;
