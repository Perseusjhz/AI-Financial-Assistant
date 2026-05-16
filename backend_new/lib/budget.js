'use strict';

// Style multipliers adjust the raw daily budget
const STYLE_FACTOR = { strict: 0.88, balanced: 1.0, relaxed: 1.12 };

/**
 * Core budget calculation — pure math, no LLM.
 * All money values are in yuan (CNY).
 */
function calculateBudget({ monthlyIncome, extraIncome = 0, fixedExpense, savingGoal, remainingDays, style = 'balanced' }) {
  const totalIncome = Number(monthlyIncome) + Number(extraIncome);
  const availableIncome = totalIncome - Number(fixedExpense);
  const monthlySpendable = availableIncome - Number(savingGoal);

  const factor = STYLE_FACTOR[style] ?? 1.0;
  const rawDaily = monthlySpendable / Number(remainingDays);
  const dailyBudget = Math.round(rawDaily * factor);
  const weeklyBudget = dailyBudget * 7;

  let feasibility;
  if (monthlySpendable <= 0) {
    feasibility = '不可行';
  } else if (dailyBudget < 30) {
    feasibility = '压力较大';
  } else if (dailyBudget <= 60) {
    feasibility = '基本可行';
  } else {
    feasibility = '较可行';
  }

  return {
    totalIncome,
    availableIncome,
    monthlySpendable: Math.max(0, monthlySpendable),
    dailyBudget,
    weeklyBudget,
    feasibility,
  };
}

/**
 * Identify likely "risk points" (spendable categories that tend to drain budgets).
 * Called after basic calculation to provide context for the LLM.
 */
function detectRiskPoints(dailyBudget) {
  const common = ['外卖', '奶茶', '打车', '咖啡', '游戏充值'];
  if (dailyBudget < 40) {
    return ['任何非必要消费', '外卖', '奶茶'];
  }
  if (dailyBudget < 70) {
    return common.slice(0, 3);
  }
  return common.slice(0, 2);
}

module.exports = { calculateBudget, detectRiskPoints };
