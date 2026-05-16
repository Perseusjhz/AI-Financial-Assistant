'use strict';

/**
 * POST /api/chat  —  攒钱搭子 AI 对话主入口
 *
 * Pipeline（每条消息都走完整 5 步）：
 *
 *   Step 1  Intent Detection   规则匹配 → 确定意图
 *   Step 2  RAG Retrieval      按意图 + query 检索知识库
 *   Step 3  Workflow           确定性计算（预算/消费分类/风险规则）
 *   Step 4  Prompt Build       组装 System + DB + RAG + Workflow → prompt
 *   Step 5  LLM API            基模只做最后语言生成，返回 JSON
 *
 *   Fallback：LLM 失败时用规则直接生成答案（不影响卡片数据）
 */

const { Router }              = require('express');
const { parseExpenses, buildReview } = require('../lib/expense');
const { calculateBudget, detectRiskPoints } = require('../lib/budget');
const { assessRisk, riskTagsFor } = require('../lib/risk');
const { retrieve, retrieveWithTags } = require('../lib/rag');
const { chat: llmChat, parseJSON, isDemoMode } = require('../lib/llm');
const { buildAgentPrompt }    = require('../lib/prompts');
const db                      = require('../lib/db');

const router = Router();

/* ════════════════════════════════════════════════════════════════
   主入口
   ════════════════════════════════════════════════════════════════ */
router.post('/', async (req, res) => {
  try {
    const { message, mode = 'auto', profile: clientProfile = {} } = req.body;
    if (!message?.trim()) {
      return res.status(400).json({ error: 'missing_message', message: '请输入消息' });
    }
    const msg = message.trim();

    // ── 从数据库拉取用户完整数据 ──────────────────────────────────
    const dbProfile  = db.getProfile();
    const dbSpending = db.getSpending();
    const profile    = { ...dbProfile, ...(clientProfile || {}) };

    // ── Step 1: Intent Detection ──────────────────────────────────
    const intent = mode !== 'auto' ? mode : step1_detectIntent(msg);

    // ── Step 2: RAG Retrieval ─────────────────────────────────────
    const ragChunks = step2_rag(intent, msg);

    // ── Step 3: Workflow (deterministic) ──────────────────────────
    const workflowData = step3_workflow(intent, msg, profile);

    // 如果 workflow 要求追问（信息缺失），直接返回，跳过 LLM
    if (workflowData.needsMoreInfo) {
      return res.json({
        intent,
        reply: workflowData.askMessage,
        card:  null,
        needsMoreInfo: true,
      });
    }

    // ── Step 4: Prompt Build ──────────────────────────────────────
    const dbContext = buildDbContext(dbProfile, dbSpending);
    const prompt    = buildAgentPrompt(intent, workflowData, ragChunks, dbContext, msg);

    // ── Step 5: LLM API ───────────────────────────────────────────
    let llmResult = null;
    if (!isDemoMode()) {
      const raw = await llmChat(prompt.system, prompt.user, { json: true, maxTokens: 600 });
      llmResult = parseJSON(raw);
    }

    // ── 组装响应（LLM 失败时 fallback）────────────────────────────
    const response = buildResponse(intent, workflowData, llmResult);
    return res.json({ ...response, demo: isDemoMode() });

  } catch (err) {
    console.error('[chat pipeline]', err);
    return res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

/* ════════════════════════════════════════════════════════════════
   Step 1: Intent Detection
   规则优先，快速且稳定；follow_up 作兜底
   ════════════════════════════════════════════════════════════════ */
const EXPENSE_RE = /[\d]\s*元|食堂|奶茶|外卖|打车|咖啡|充值|超市|早餐|午餐|晚餐|买了|花了|消费|今天花|记一笔/;
const SAVING_RE  = /生活费|攒钱|预算|目标|每天能花|每月|剩余天数|收入|固定支出|计划|攒多少/;
const RISK_RE    = /基金|股票|虚拟|比特|数字货币|买币|炒币|理财|风险|能不能买|应该买|安全吗|适合投/;

function step1_detectIntent(msg) {
  if (EXPENSE_RE.test(msg)) return 'expense_review';
  if (SAVING_RE.test(msg))  return 'saving_plan';
  if (RISK_RE.test(msg))    return 'risk_education';
  return 'follow_up';
}

/* ════════════════════════════════════════════════════════════════
   Step 2: RAG Retrieval
   按意图选候选 tag 集合，再按关键词打分，取 top-3
   ════════════════════════════════════════════════════════════════ */
function step2_rag(intent, msg) {
  if (intent === 'risk_education') {
    // 风险意图：先用规则拿到风险级别对应的 tag，再检索
    const risk    = assessRisk(msg);
    const tags    = riskTagsFor(risk.level);
    return retrieveWithTags([...tags, 'risk', 'education'], msg, 3);
  }
  // 其他意图用 mode 映射
  const modeMap = {
    expense_review: 'expense_review',
    saving_plan:    'saving_plan',
    follow_up:      'chat',
  };
  return retrieve(modeMap[intent] ?? 'chat', msg, 3);
}

/* ════════════════════════════════════════════════════════════════
   Step 3: Workflow（确定性计算，不调 LLM）
   返回结构化数据供 Step 4 注入 prompt，以及 Step 6 组装卡片
   ════════════════════════════════════════════════════════════════ */
function step3_workflow(intent, msg, profile) {

  /* ── 消费复盘 ── */
  if (intent === 'expense_review') {
    const items = parseExpenses(msg);
    if (items.length === 0) {
      return {
        needsMoreInfo: true,
        askMessage: '我能识别出你提到了一些消费，但金额不太完整。可以补充一下每项大概花了多少吗？比如：食堂18，奶茶16',
      };
    }
    const review = buildReview(items, Number(profile?.dailyBudget ?? 0));
    return { intent: 'expense_review', items, review };
  }

  /* ── 攒钱规划 ── */
  if (intent === 'saving_plan') {
    const { monthlyIncome, fixedExpense, savingGoal, remainingDays } = profile;
    if (!monthlyIncome || !fixedExpense) {
      return {
        needsMoreInfo: true,
        askMessage: '我来帮你算攒钱计划！先告诉我：月生活费是多少？固定支出（房租、话费等）大概多少？',
      };
    }
    const calc       = calculateBudget({ ...profile, extraIncome: profile.extraIncome || 0 });
    const riskPoints = detectRiskPoints(calc.dailyBudget);
    return { intent: 'saving_plan', calc, riskPoints };
  }

  /* ── 风险教育 ── */
  if (intent === 'risk_education') {
    const risk      = assessRisk(msg);
    const assetType = detectAssetType(msg);
    return { intent: 'risk_education', risk, assetType };
  }

  /* ── 追问 / 闲聊 ── */
  return { intent: 'follow_up' };
}

/* ════════════════════════════════════════════════════════════════
   Step 6: 组装最终响应
   reply 来自 LLM（优先）或 fallback 规则；card 来自 workflow
   ════════════════════════════════════════════════════════════════ */
function buildResponse(intent, workflowData, llm) {

  /* ── 消费复盘 ── */
  if (intent === 'expense_review') {
    const { review } = workflowData;
    const reply = llm?.reply
      ?? (review.overBudget
        ? `今天花了 ¥${review.total}，超了 ¥${review.overAmount}。${review.mainRisk}。`
        : `今天花了 ¥${review.total}，在预算内 👍`);
    return {
      intent,
      reply,
      card: {
        type:        'expense_review_card',
        total:       review.total,
        overBudget:  review.overBudget,
        overAmount:  review.overAmount,
        dailyBudget: review.dailyBudget,
        catTotals:   review.catTotals,
        categories:  review.categories,
      },
    };
  }

  /* ── 攒钱规划 ── */
  if (intent === 'saving_plan') {
    const { calc, riskPoints } = workflowData;
    const reply = llm?.reply
      ?? `按你的计划，每天 ¥${calc.dailyBudget}，目标评估：${calc.feasibility}。`;
    return {
      intent,
      reply,
      card: {
        type:             'saving_plan_card',
        dailyBudget:      calc.dailyBudget,
        weeklyBudget:     calc.weeklyBudget,
        monthlySpendable: calc.monthlySpendable,
        feasibility:      calc.feasibility,
        riskPoints:       llm?.riskPoints ?? riskPoints,
        nextAction:       llm?.nextAction,
      },
    };
  }

  /* ── 风险教育 ── */
  if (intent === 'risk_education') {
    const { risk } = workflowData;
    const disclaimer = '本回答仅供理财教育参考，不构成任何投资建议。';
    const reply    = llm?.reply    ?? fallbackRiskReply(risk);
    const reasons  = llm?.reasons  ?? ['本金存在损失风险', '生活费需要保证流动性', '优先建立应急金'];
    const nextAction = llm?.nextAction ?? fallbackRiskAction(risk);
    return {
      intent,
      reply,
      card: {
        type:               'risk_education_card',
        riskLevel:          risk.riskLevel,
        riskScore:          risk.score,
        studentSuitability: risk.suitability,
        reasons,
        nextAction,
        disclaimer,
      },
    };
  }

  /* ── 追问 / 闲聊 ── */
  return {
    intent: 'follow_up',
    reply: llm?.reply ?? '有什么想聊的？可以发消费记录、问攒钱计划，或者问理财风险。',
    card: null,
  };
}

/* ════════════════════════════════════════════════════════════════
   DB Context Builder
   把数据库用户数据转成文字注入 prompt
   ════════════════════════════════════════════════════════════════ */
function buildDbContext(profile, spending) {
  const p        = profile;
  const todayStr = new Date().toISOString().slice(0, 10);
  const thisMonth = todayStr.slice(0, 7);
  const monthRec = spending.filter(r => r.date.startsWith(thisMonth));
  const totalSpent = monthRec.reduce((s, r) => s + r.total, 0);
  const avg      = monthRec.length ? Math.round(totalSpent / monthRec.length) : null;
  const todayRec = spending.find(r => r.date === todayStr);

  const lines = ['【用户财务档案（来自数据库）】'];
  if (p.monthlyIncome)
    lines.push(`月生活费¥${p.monthlyIncome} 固定支出¥${p.fixedExpense||0} 攒钱目标¥${p.savingGoal||0}`);
  if (p.dailyBudget)
    lines.push(`每日预算¥${p.dailyBudget} 剩余${p.remainingDays||'?'}天 已攒¥${p.savedAmount||0} 连击${p.streak||0}天`);
  if (p.monthlySpendable)
    lines.push(`本月可花¥${p.monthlySpendable} 已花¥${totalSpent} 剩余¥${Math.max(0,p.monthlySpendable-totalSpent)}`);
  if (avg)
    lines.push(`本月日均消费¥${avg}（${monthRec.length}天记录）`);
  if (todayRec)
    lines.push(`今天¥${todayRec.total}：${todayRec.items?.join('、')||''}`);

  if (spending.length > 0) {
    lines.push('\n【近期全部消费记录】');
    spending.slice(-14).forEach(r => {
      lines.push(`${r.date} ¥${r.total}(${r.overBudget?`超支¥${r.overAmount}`:'正常'}) ${r.items?.join(' ')||''}`);
    });
  }

  return lines.join('\n');
}

/* ════════════════════════════════════════════════════════════════
   工具函数
   ════════════════════════════════════════════════════════════════ */
function detectAssetType(msg) {
  if (/虚拟|数字货币|比特|ETH|BTC|买币|炒币/i.test(msg)) return '虚拟资产';
  if (/股票|炒股|A股|港股/i.test(msg)) return '股票';
  if (/基金|指数|ETF/i.test(msg)) return '基金';
  if (/货币基金|余额宝|零钱通/i.test(msg)) return '货币基金';
  if (/借钱|贷款|网贷|杠杆/i.test(msg)) return '借贷投资';
  return '未知类型';
}

function fallbackRiskReply(risk) {
  if (risk.level === 'extreme') return '不建议用生活费参与，风险极高，短期可能亏损50%以上，生活费是不可承受损失的钱。';
  if (risk.level === 'high')    return '高风险资产不建议用生活费直接参与，先建立预算和应急金再考虑。';
  if (risk.level === 'medium')  return '可以先学习了解，但不建议用生活费重仓，建议先建立应急金。';
  return '风险相对较低，可以了解学习，但仍要保证生活费流动性。';
}

function fallbackRiskAction(risk) {
  if (risk.level === 'extreme' || risk.level === 'high') return '先存够1个月生活费的应急金';
  if (risk.level === 'medium')  return '先了解基础知识，等有结余再考虑';
  return '可以把短期闲置资金存入货币基金';
}

module.exports = router;
