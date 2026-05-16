'use strict';

const { Router } = require('express');
const { calculateBudget } = require('../lib/budget');
const db = require('../lib/db');

const router = Router();

/**
 * GET /api/home-stats
 * 全部数据从 db.json 读取，无需前端传参
 */
router.get('/', (req, res) => {
  const profile = db.getProfile();

  // 计算每日预算（用 db 里存的 profile 字段）
  let plan;
  if (profile.monthlyIncome && profile.fixedExpense) {
    plan = calculateBudget({
      monthlyIncome:  profile.monthlyIncome,
      extraIncome:    profile.extraIncome  || 0,
      fixedExpense:   profile.fixedExpense,
      savingGoal:     profile.savingGoal   || 0,
      remainingDays:  profile.remainingDays || 15,
      style:          profile.style        || 'balanced',
    });
  } else {
    plan = { dailyBudget: 84, weeklyBudget: 588, monthlySpendable: 1200, feasibility: '基本可行' };
  }

  // 图表数据：取最近 9 条真实记录
  const raw = db.chartData(9) || [];
  const recentAmounts = raw.map(d => d.amount);
  const dailyAvg = recentAmounts.length > 0
    ? Math.round(recentAmounts.reduce((s, v) => s + v, 0) / recentAmounts.length)
    : plan.dailyBudget;

  // 追加 2 个预测点
  const last = recentAmounts.at(-1) ?? dailyAvg;
  const predicted = [];
  const today = new Date();
  for (let i = 1; i <= 2; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    predicted.push({
      label:  `${d.getMonth() + 1}/${d.getDate()}`,
      amount: Math.round((last + dailyAvg) / 2),
    });
  }

  const savingGoal    = profile.savingGoal    || 600;
  const savedAmount   = profile.savedAmount   || 0;
  const remainingDays = profile.remainingDays || 15;
  const streak        = profile.streak        || 0;

  // 本月已花 & 剩余（用于饼图）
  const thisMonth = new Date().toISOString().slice(0, 7);
  const allSpending = db.getSpending();
  const spentThisMonth = allSpending
    .filter(r => r.date.startsWith(thisMonth))
    .reduce((s, r) => s + r.total, 0);
  const monthlySpendable = plan.monthlySpendable || 0;
  const remainingThisMonth = Math.max(0, monthlySpendable - spentThisMonth);

  return res.json({
    dailyAvg,
    remainingDays,
    planProgress:    savingGoal > 0 ? Math.round((savedAmount / savingGoal) * 100) : 0,
    saved:           savedAmount,
    savingGoal,
    spendable:       plan.monthlySpendable,
    streak,
    spentThisMonth,
    remainingThisMonth,
    dailyBudget:     plan.dailyBudget,
    weeklyBudget:    plan.weeklyBudget,
    feasibility:     plan.feasibility,
    chartData:       [...raw, ...predicted],
    predictedCount:  2,
  });
});

module.exports = router;
