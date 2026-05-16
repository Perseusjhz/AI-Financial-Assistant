'use strict';

const { Router } = require('express');
const { calculateBudget, detectRiskPoints } = require('../lib/budget');
const { retrieve } = require('../lib/rag');
const { chat, parseJSON, isDemoMode } = require('../lib/llm');
const { savingPlanPrompt } = require('../lib/prompts');
const db = require('../lib/db');

const router = Router();

/**
 * POST /api/saving-plan
 *
 * Aligns with PlanScreen:
 *  - Inputs:  FormRow fields (月生活费, 固定支出, 本月目标, 剩余天数, 风格)
 *  - Outputs: 每日预算, 每周, 本月可花, 目标可行性, AI commentary, nextAction
 *
 * Body params:
 *   monthlyIncome  number  required
 *   extraIncome    number  optional (兼职/奖学金)
 *   fixedExpense   number  required
 *   savingGoal     number  required
 *   remainingDays  number  required
 *   style          string  "strict" | "balanced" | "relaxed"  default "balanced"
 */
router.post('/', async (req, res) => {
  try {
    const { monthlyIncome, extraIncome = 0, fixedExpense, savingGoal, style = 'balanced' } = req.body;

    // Validate required fields
    if (!monthlyIncome || !fixedExpense || savingGoal === undefined) {
      return res.status(400).json({
        error: 'missing_fields',
        message: '需要提供：月生活费、固定支出、攒钱目标',
        missingFields: ['monthlyIncome', 'fixedExpense', 'savingGoal'].filter(
          (k) => req.body[k] === undefined || req.body[k] === null || req.body[k] === '',
        ),
      });
    }

    // 自然月剩余天数（含今天）
    const todayDate = new Date();
    const lastDayOfMonth = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0).getDate();
    const remainingDays = Math.max(1, lastDayOfMonth - todayDate.getDate() + 1);

    // 1. Deterministic budget calculation
    const calc = calculateBudget({ monthlyIncome, extraIncome, fixedExpense, savingGoal, remainingDays, style });
    const riskPoints = detectRiskPoints(calc.dailyBudget);

    // 2. RAG retrieval
    const knowledge = retrieve('saving_plan', `${monthlyIncome} ${savingGoal} ${style}`);

    // 3. LLM commentary (falls back to deterministic copy in demo mode)
    let reply, nextAction;

    if (!isDemoMode()) {
      const prompt = savingPlanPrompt(calc, knowledge);
      const raw = await chat(prompt.system, prompt.user, { json: true });
      const parsed = parseJSON(raw);
      if (parsed) {
        reply = parsed.reply;
        nextAction = parsed.nextAction;
        if (parsed.riskPoints?.length) Object.assign(riskPoints, parsed.riskPoints);
      }
    }

    if (!reply)      reply      = buildFallbackReply(calc);
    if (!nextAction) nextAction = buildFallbackAction(calc, riskPoints);

    // 持久化 profile 到 db.json
    db.saveProfile({
      monthlyIncome:    Number(monthlyIncome),
      extraIncome:      Number(extraIncome) || 0,
      fixedExpense:     Number(fixedExpense),
      savingGoal:       Number(savingGoal),
      style,
      dailyBudget:      calc.dailyBudget,
      weeklyBudget:     calc.weeklyBudget,
      monthlySpendable: calc.monthlySpendable,
      feasibility:      calc.feasibility,
    });

    return res.json({
      type: 'saving_plan_result',
      feasibility: calc.feasibility,
      totalIncome: calc.totalIncome,
      fixedExpense: Number(fixedExpense),
      savingGoal: Number(savingGoal),
      monthlySpendable: calc.monthlySpendable,
      dailyBudget: calc.dailyBudget,
      weeklyBudget: calc.weeklyBudget,
      riskPoints,
      nextAction,
      reply,
      demo: isDemoMode(),
    });
  } catch (err) {
    console.error('[saving-plan]', err);
    return res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

// ─── Fallback helpers (used in demo mode or when LLM fails) ──────────

function buildFallbackReply(calc) {
  const { feasibility, dailyBudget, monthlySpendable } = calc;
  if (feasibility === '不可行') {
    return `目标暂时不可行 —— 收入扣掉固定支出后已不够覆盖目标。建议降低本月目标或减少固定支出，先把每日预算算出来再说。`;
  }
  if (feasibility === '压力较大') {
    return `目标有点紧，每天只有 ¥${dailyBudget}，基本够吃饭，但弹性很小。建议先坚持一周看看，实在难受可以小幅下调目标。`;
  }
  if (feasibility === '基本可行') {
    return `目标基本可行，每天 ¥${dailyBudget} 正常生活没问题。重点盯住外卖和奶茶，这两项最容易超支。`;
  }
  return `目标很轻松，每天 ¥${dailyBudget} 相当宽裕。除了攒钱目标，建议同时备一笔应急金（约 1 个月生活费）。`;
}

function buildFallbackAction(calc, riskPoints) {
  const top = riskPoints[0] ?? '高频小额消费';
  if (calc.dailyBudget < 30) return `这周先专注把每日支出控制在 ¥${calc.dailyBudget} 以内`;
  return `这周 ${top} 累计不超过 ¥${Math.round(calc.weeklyBudget * 0.3)}`;
}

module.exports = router;
