import type { NextApiRequest, NextApiResponse } from 'next';
import type { AppStateSnapshot } from '../../lib/types';
import { updateSessionSnapshot, getSessionSnapshot } from '../../lib/session-store';
import { runExpenseReviewWorkflow, buildExpenseReviewState } from '../../lib/workflows/expenseReview';
import { runRiskEducationWorkflow, buildRiskEducationState } from '../../lib/workflows/riskEducation';
import { runSavingPlanWorkflow, buildSavingPlanState } from '../../lib/workflows/savingPlan';

type FrontendAgentResponse = {
  reply: string;
  card: { label: string; value: string; unit?: string; badge?: string; sub?: string } | null;
  updates: Record<string, number> | null;
  action: { label: string; to: 'home' | 'plan' | 'review' | 'risk' | 'me' } | null;
  state?: AppStateSnapshot;
};

function pickLatestUserText(messages: Array<{ content?: string }> = []) {
  const content = messages[messages.length - 1]?.content || '';
  const match = content.match(/用户最新：([\s\S]*?)(?:\n\n请按 JSON|$)/);
  return (match?.[1] || content).trim();
}

function pickLiveData(system = '') {
  const match = system.match(/当前数据快照：({[\s\S]*?})/);
  if (!match) return {};
  try {
    return JSON.parse(match[1]) as Record<string, number>;
  } catch {
    return {};
  }
}

function hasAmount(text: string) {
  return /\d+(?:\.\d+)?\s*[元块¥]?/.test(text);
}

function detectIntent(text: string) {
  if (/[攒省]钱|生活费|固定支出|目标|预算|每日|每天|存\s*\d+/.test(text)) return 'saving';
  if (/复盘|今天|花了|消费|食堂|外卖|奶茶|打车|充值|\d+\s*[元块]/.test(text)) return 'review';
  if (/基金|股票|炒股|币|理财|投资|收益|风险|余额宝|借钱|杠杆/.test(text)) return 'risk';
  return 'general';
}

function numbers(text: string) {
  return Array.from(text.matchAll(/\d+(?:\.\d+)?/g)).map((m) => Number(m[0]));
}

function savingInputFromText(text: string, liveData: Record<string, number>) {
  const ns = numbers(text);
  const monthlyIncome = Number(text.match(/生活费\s*(\d+)/)?.[1]) || ns[0] || 3000;
  const fixedExpense = Number(text.match(/固定支出\s*(\d+)/)?.[1]) || ns[1] || 1200;
  const savingGoal =
    Number(text.match(/(?:攒|存|目标)\s*(\d+)/)?.[1]) ||
    Number(text.match(/(\d+)\s*(?:元)?(?:目标|难吗)/)?.[1]) ||
    liveData.monthlyGoal ||
    ns[2] ||
    600;
  const remainingDays = Math.max(1, new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate());

  return {
    monthlyIncome,
    fixedExpense,
    savingGoal,
    remainingDays,
    extraIncome: 0,
    style: 'balanced' as const,
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<FrontendAgentResponse | { error: string }>
) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const text = pickLatestUserText(req.body?.messages);
    const liveData = pickLiveData(req.body?.system || '');
    const sessionId = Array.isArray(req.headers['x-session-id'])
      ? req.headers['x-session-id'][0]
      : req.headers['x-session-id'] || 'design-demo';
    const session = getSessionSnapshot(sessionId);
    const intent = detectIntent(text);

    if (intent === 'saving') {
      const result = await runSavingPlanWorkflow(savingInputFromText(text, liveData));
      const state = updateSessionSnapshot(sessionId, buildSavingPlanState(result));
      return res.json({
        reply: result.reply,
        card: {
          label: '每日预算',
          value: String(result.dailyBudget),
          unit: '元/天',
          badge: result.feasibility,
          sub: `本周可花 ${result.weeklyBudget} 元`,
        },
        updates: {
          dailyBudget: result.dailyBudget,
          weeklyBudget: result.weeklyBudget,
          monthlySpendable: result.monthlySpendable,
          monthlyGoal: result.savingGoal,
        },
        action: { label: '看攒钱计划', to: 'plan' },
        state,
      });
    }

    if (intent === 'review') {
      if (!hasAmount(text)) {
        return res.json({
          reply: '可以，把今天每笔大概金额发我，比如“食堂18，奶茶16，外卖35”，我会帮你算总额和可优化项。',
          card: null,
          updates: null,
          action: { label: '去消费复盘', to: 'review' },
          state: session,
        });
      }
      const result = await runExpenseReviewWorkflow(text, liveData.dailyBudget);
      const state = updateSessionSnapshot(sessionId, buildExpenseReviewState(result));
      return res.json({
        reply: result.reply,
        card: {
          label: '今日支出',
          value: String(result.total),
          unit: '元',
          badge: result.overBudget ? `超 ${result.total - (liveData.dailyBudget || 0)}` : '在预算内',
          sub: result.mainRisk,
        },
        updates: { todayTotal: result.total },
        action: { label: '展开复盘', to: 'review' },
        state,
      });
    }

    if (intent === 'risk') {
      const result = await runRiskEducationWorkflow(text);
      const state = updateSessionSnapshot(sessionId, buildRiskEducationState(result) as AppStateSnapshot);
      return res.json({
        reply: result.reply,
        card: {
          label: '风险等级',
          value: result.riskLevel,
          unit: '',
          badge: result.studentSuitability,
          sub: result.conclusion,
        },
        updates: null,
        action: { label: '展开风险页', to: 'risk' },
        state,
      });
    }

    return res.json({
      reply: '我在。你可以直接说：帮我算每日预算、复盘今天消费，或者问一个理财风险问题。',
      card: null,
      updates: null,
      action: null,
      state: session,
    });
  } catch (error) {
    console.error('Claude compatibility API error:', error);
    return res.status(500).json({ error: '处理请求时出现问题，请重试。' });
  }
}
