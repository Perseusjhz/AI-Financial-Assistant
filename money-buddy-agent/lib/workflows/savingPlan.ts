import { SavingPlanInput, SavingPlanResult, FeasibilityLevel } from '../types';
import { callLLM, isDemoMode } from '../llm';
import { retrieveKnowledge } from '../rag';

const SYSTEM_PROMPT = `你是"攒钱搭子 AI"，帮助大学生制定攒钱和预算计划。
语气轻松、具体、像同学一样，不说教。必须用 JSON 格式输出。`;

function assessFeasibility(dailyBudget: number, monthlySpendable: number): { text: string; level: FeasibilityLevel } {
  if (monthlySpendable < 0) return { text: '目标不可行', level: 'impossible' };
  if (dailyBudget < 30) return { text: '压力较大', level: 'tight' };
  if (dailyBudget <= 60) return { text: '基本可行', level: 'ok' };
  return { text: '比较轻松', level: 'good' };
}

export function calculateBudget(input: SavingPlanInput) {
  const totalIncome = input.monthlyIncome + (input.extraIncome || 0);
  const disposable = totalIncome - input.fixedExpense;
  const monthlySpendable = disposable - input.savingGoal;
  const dailyBudget = Math.max(0, Math.round(monthlySpendable / input.remainingDays));
  const weeklyBudget = dailyBudget * 7;
  const { text: feasibility, level: feasibilityLevel } = assessFeasibility(dailyBudget, monthlySpendable);

  return { totalIncome, disposable, monthlySpendable, dailyBudget, weeklyBudget, feasibility, feasibilityLevel };
}

const DEMO_RISK_POINTS: Record<string, string[]> = {
  strict:   ['外卖', '奶茶', '零食', '打车'],
  balanced: ['外卖', '奶茶', '打车'],
  relaxed:  ['外卖', '冲动消费'],
};

export async function runSavingPlanWorkflow(input: SavingPlanInput): Promise<SavingPlanResult> {
  const calc = calculateBudget(input);
  const style = input.style || 'balanced';

  if (isDemoMode()) {
    const riskPoints = DEMO_RISK_POINTS[style] || DEMO_RISK_POINTS.balanced;
    const feasText = calc.feasibility;
    let reply = '';
    if (calc.feasibilityLevel === 'impossible') {
      reply = `你的目标暂时不可行，生活费减去固定支出后不够覆盖攒钱目标。建议先调低目标，或者找找能增加收入的途径。`;
    } else if (calc.feasibilityLevel === 'tight') {
      reply = `目标有点紧，每天只有 ${calc.dailyBudget} 元可以花。挑战大但不是不可能，关键要减少外卖和奶茶，每天记一下花了多少。`;
    } else {
      reply = `你的目标${feasText}！每天控制在 ${calc.dailyBudget} 元以内，重点少点外卖和奶茶。坚持下去就能攒到！`;
    }
    return {
      type: 'saving_plan_result',
      feasibility: calc.feasibility,
      feasibilityLevel: calc.feasibilityLevel,
      totalIncome: calc.totalIncome,
      fixedExpense: input.fixedExpense,
      savingGoal: input.savingGoal,
      monthlySpendable: calc.monthlySpendable,
      dailyBudget: calc.dailyBudget,
      weeklyBudget: calc.weeklyBudget,
      riskPoints,
      nextAction: `本周外卖控制在 3 次以内，可节省约 ${Math.round(calc.dailyBudget * 0.4)} 元`,
      reply,
    };
  }

  const knowledge = retrieveKnowledge('saving_plan', JSON.stringify(input));

  const prompt = `用户攒钱计划数据：
总收入：${calc.totalIncome}元，固定支出：${input.fixedExpense}元
攒钱目标：${input.savingGoal}元，剩余天数：${input.remainingDays}天
本月可消费：${calc.monthlySpendable}元，每日预算：${calc.dailyBudget}元，每周预算：${calc.weeklyBudget}元
可行性：${calc.feasibility}，风格偏好：${style}

参考知识：
${knowledge}

请输出 JSON（字段名用英文）：
{
  "riskPoints": ["最多3个需要控制的消费类别"],
  "nextAction": "本周一个具体行动，20字以内",
  "reply": "给用户的整体回复，60-90字，学生化语气，不说教，给具体建议"
}`;

  const raw = await callLLM(SYSTEM_PROMPT, prompt, true);
  let parsed: { riskPoints?: string[]; nextAction?: string; reply?: string } = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = {};
  }

  return {
    type: 'saving_plan_result',
    feasibility: calc.feasibility,
    feasibilityLevel: calc.feasibilityLevel,
    totalIncome: calc.totalIncome,
    fixedExpense: input.fixedExpense,
    savingGoal: input.savingGoal,
    monthlySpendable: calc.monthlySpendable,
    dailyBudget: calc.dailyBudget,
    weeklyBudget: calc.weeklyBudget,
    riskPoints: parsed.riskPoints || ['外卖', '奶茶', '打车'],
    nextAction: parsed.nextAction || `本周外卖控制在 3 次以内`,
    reply: parsed.reply || `你的目标${calc.feasibility}，每日预算 ${calc.dailyBudget} 元，重点减少外卖和奶茶。`,
  };
}

export function buildSavingPlanState(result: SavingPlanResult) {
  return {
    dailyBudget: result.dailyBudget,
    weeklyBudget: result.weeklyBudget,
    savingGoal: result.savingGoal,
    monthlySpendable: result.monthlySpendable,
    totalIncome: result.totalIncome,
    lastPlan: {
      savingGoal: result.savingGoal,
      dailyBudget: result.dailyBudget,
      weeklyBudget: result.weeklyBudget,
      monthlySpendable: result.monthlySpendable,
      feasibility: result.feasibility,
      updatedAt: new Date().toISOString(),
      riskPoints: result.riskPoints,
    },
  };
}
