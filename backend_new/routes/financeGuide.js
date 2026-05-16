'use strict';

const { Router } = require('express');
const { chat, parseJSON, isDemoMode } = require('../lib/llm');
const db = require('../lib/db');

const router = Router();

// Server-side cache — survives within a process lifetime
let _cache = { dataVersion: null, result: null };

function computeDataVersion(profile, totalSpentSoFar, spendingCount) {
  return `${profile.monthlyIncome||0}-${profile.extraIncome||0}-${profile.fixedExpense||0}-${profile.savingGoal||0}-${spendingCount}-${totalSpentSoFar}`;
}

function computeChartPoints(profile, thisMonthSpending, dayOfMonth, lastDay) {
  const totalIncome = (Number(profile.monthlyIncome) || 0) + (Number(profile.extraIncome) || 0);
  const fixedExpense = Number(profile.fixedExpense) || 0;
  const savingGoal = Number(profile.savingGoal) || 0;
  const availableForMonth = Math.max(0, totalIncome - fixedExpense - savingGoal);

  const spendByDay = {};
  thisMonthSpending.forEach(s => {
    const d = parseInt(s.date.slice(8, 10));
    spendByDay[d] = s.total || 0;
  });

  const recordedTotal = thisMonthSpending.reduce((s, d) => s + (d.total || 0), 0);
  const recordedDays = thisMonthSpending.length;
  const avgDailySpent = recordedDays > 0 ? Math.round(recordedTotal / recordedDays) : 0;

  const points = [];
  let cumSpend = 0;

  for (let d = 1; d <= lastDay; d++) {
    const isProjected = d > dayOfMonth;
    if (!isProjected) {
      cumSpend += spendByDay[d] !== undefined ? spendByDay[d] : avgDailySpent;
    }
    const remaining = isProjected
      ? Math.max(0, availableForMonth - recordedTotal - avgDailySpent * (d - dayOfMonth))
      : Math.max(0, availableForMonth - cumSpend);
    points.push({ day: d, remaining: Math.round(remaining), isProjected });
  }

  const projectedEndBalance = points[points.length - 1]?.remaining || 0;
  return { points, projectedEndBalance, availableForMonth: Math.round(availableForMonth), avgDailySpent };
}

/**
 * GET /api/finance-guide
 * Returns: { dataVersion, chartPoints, projectedEndBalance, advice }
 */
router.get('/', async (req, res) => {
  try {
    const profile = db.getProfile() || {};
    const spending = db.getSpending() || [];

    const today = new Date();
    const dayOfMonth = today.getDate();
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

    const monthPrefix = today.toISOString().slice(0, 7);
    const thisMonthSpending = spending.filter(s => s.date.startsWith(monthPrefix));
    const totalSpentSoFar = thisMonthSpending.reduce((s, d) => s + (d.total || 0), 0);

    const dataVersion = computeDataVersion(profile, totalSpentSoFar, thisMonthSpending.length);

    // Serve cache if data hasn't changed
    if (_cache.dataVersion === dataVersion && _cache.result) {
      return res.json(_cache.result);
    }

    // Recompute chart data (deterministic, fast)
    const { points, projectedEndBalance, availableForMonth, avgDailySpent } =
      computeChartPoints(profile, thisMonthSpending, dayOfMonth, lastDay);

    const monthlyIncome = Number(profile.monthlyIncome) || 0;
    const extraIncome = Number(profile.extraIncome) || 0;
    const fixedExpense = Number(profile.fixedExpense) || 0;
    const savingGoal = Number(profile.savingGoal) || 0;
    const remainingDays = lastDay - dayOfMonth + 1;

    const catSums = { necessary: 0, optimizable: 0, impulsive: 0, learning: 0 };
    thisMonthSpending.forEach(d => {
      if (d.catTotals) Object.keys(catSums).forEach(k => { catSums[k] += d.catTotals[k] || 0; });
    });

    // Generate investment advice via LLM
    let advice = null;

    if (!isDemoMode()) {
      const totalIncome = monthlyIncome + extraIncome;
      const annualSaving = savingGoal * 12;
      const savingRate = totalIncome > 0 ? Math.round(savingGoal / totalIncome * 100) : 0;
      const emergencyTarget = Math.round(totalIncome * 3);

      const system = `你是一位 CFA 持证的独立理财顾问，擅长为中国年轻人做个人资产规划。
根据用户真实财务数据，给出 3 条专业、有深度的资产配置建议。

要求：
1. 每条建议必须针对用户的具体数字，禁止泛泛而谈
2. 遵循「应急储备 → 负债管理 → 保险保障 → 投资增值」的财务规划优先级
3. 投资方向只讲资产类别和配置逻辑，不提任何平台或具体产品名称
4. 给出可量化的行动目标（金额或比例）
5. 语气专业简洁，title ≤ 10 字，desc ≤ 55 字

返回 JSON：{ "advice": [{"title":"...","desc":"..."},...] }`;

      const user = `用户财务画像（基于真实记录）：
- 月可支配收入 ¥${totalIncome}（生活费 ¥${monthlyIncome}，兼职 ¥${extraIncome}）
- 固定刚性支出 ¥${fixedExpense}/月，储蓄率 ${savingRate}%（目标攒 ¥${savingGoal}/月，年化 ¥${annualSaving}）
- 本月实际日均消费 ¥${avgDailySpent}，按此节奏月底预计结余 ¥${projectedEndBalance}
- 消费结构：必要 ¥${catSums.necessary}，可优化 ¥${catSums.optimizable}，冲动 ¥${catSums.impulsive}，学习投资 ¥${catSums.learning}
- 3个月应急金目标 ¥${emergencyTarget}

请基于此给出 3 条资产配置建议，覆盖：①流动性管理 ②风险收益配置逻辑 ③长期复利方向。不提具体产品和平台名称。`;

      const raw = await chat(system, user, { json: true, maxTokens: 700, temperature: 0.5 });
      const parsed = parseJSON(raw);
      if (parsed?.advice?.length) advice = parsed.advice;
    }

    if (!advice) advice = buildFallbackAdvice(projectedEndBalance, monthlyIncome + extraIncome, savingGoal, catSums);

    const result = { dataVersion, chartPoints: points, projectedEndBalance, advice, dayOfMonth, lastDay };
    _cache = { dataVersion, result };

    return res.json(result);
  } catch (err) {
    console.error('[finance-guide]', err);
    return res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

function buildFallbackAdvice(projectedEnd, totalIncome, savingGoal, catSums) {
  const emergencyTarget = Math.round(totalIncome * 3);
  const savingRate = totalIncome > 0 ? Math.round(savingGoal / totalIncome * 100) : 0;
  const advice = [];

  if (projectedEnd < emergencyTarget) {
    const gap = emergencyTarget - projectedEnd;
    const months = Math.ceil(gap / Math.max(projectedEnd, 1));
    advice.push({
      title: '流动性储备优先',
      desc: `应急金目标 ¥${emergencyTarget.toLocaleString()}（3个月支出），当前缺口 ¥${gap.toLocaleString()}，需约 ${months} 个月补足后再考虑投资配置`,
    });
  } else {
    advice.push({
      title: '流动性分层管理',
      desc: `应急金（¥${emergencyTarget.toLocaleString()}）已达标，可将超额部分按"1-3-6-12月"期限分层配置，兼顾收益与灵活性`,
    });
  }

  if (savingRate < 10) {
    advice.push({
      title: '提升储蓄率为首务',
      desc: `当前储蓄率仅 ${savingRate}%，低于财务健康基准（15-20%）。建议先通过控制可优化消费将储蓄率提至 15%，投资效益才能显现`,
    });
  } else if (savingRate < 20) {
    advice.push({
      title: '稳健资产配比起步',
      desc: `储蓄率 ${savingRate}%，建议可投资部分按 60% 低风险固收 + 40% 权益类（宽基指数）配置，风险可控同时保持成长性`,
    });
  } else {
    advice.push({
      title: '核心-卫星配置策略',
      desc: `储蓄率 ${savingRate}% 表现良好。可采用 70% 核心（宽基指数定投）+ 20% 卫星（行业/主题）+ 10% 现金机动仓的配置框架`,
    });
  }

  const monthlyInvestable = Math.max(0, Math.round(projectedEnd * 0.6));
  advice.push({
    title: '定额复利的时间价值',
    desc: `每月固定投入 ¥${monthlyInvestable}，年化 7% 假设下，10年后约 ¥${Math.round(monthlyInvestable * 12 * ((Math.pow(1.07, 10) - 1) / 0.07)).toLocaleString()}；越早开始，复利效应越显著`,
  });

  return advice;
}

module.exports = router;
