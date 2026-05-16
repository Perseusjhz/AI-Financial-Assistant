import type { NextApiRequest, NextApiResponse } from 'next';
import {
  AgentRequest,
  AgentResponse,
  AppStateSnapshot,
  ResultCard,
  WorkflowMode,
} from '../../lib/types';
import { runSavingPlanWorkflow, buildSavingPlanState } from '../../lib/workflows/savingPlan';
import { runExpenseReviewWorkflow, buildExpenseReviewState } from '../../lib/workflows/expenseReview';
import { runRiskEducationWorkflow, buildRiskEducationState } from '../../lib/workflows/riskEducation';
import { callLLM, isDemoMode } from '../../lib/llm';
import { retrieveKnowledge } from '../../lib/rag';
import { getSessionSnapshot, updateSessionSnapshot } from '../../lib/session-store';

const GENERAL_SYSTEM = `你是"攒钱搭子 AI"，一名面向大学生的理财陪伴智能体。
不销售金融产品，只帮助大学生完成：攒钱规划、消费复盘、理财风险教育。
语气轻松、具体、学生化、不说教。给出一个具体的下一步行动。`;

function detectIntent(message: string): WorkflowMode {
  const msg = message;
  if (/[攒省]钱|月.*生活费|生活费.*月|固定支出|每月.*收入|目标.*攒|攒.*目标/.test(msg)) return 'saving_plan';
  if (/食堂|外卖|奶茶|打车|游戏充值|今天.*[元块¥]|\d+元.*\d+元|消费记录|花了.*[元块]|买.*元/.test(msg)) return 'expense_review';
  if (/基金|股票|炒股|[买购入]币|理财|投资|收益|风险|能不能买|适合.*投|余额宝|货币基金/.test(msg)) return 'risk_education';
  return 'follow_up';
}

function getSessionId(req: NextApiRequest, body: AgentRequest): string {
  const headerId = Array.isArray(req.headers['x-session-id'])
    ? req.headers['x-session-id'][0]
    : req.headers['x-session-id'];
  return body?.profile?.savingGoal ? 'default' : (headerId || 'default');
}

function latestMessage(body: AgentRequest): string {
  if (body.message?.trim()) return body.message.trim();
  const messages = body.messages || [];
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const item = messages[i];
    if (item?.role === 'user' && item.content?.trim()) return item.content.trim();
  }
  return '';
}

function buildSavingCards(result: Awaited<ReturnType<typeof runSavingPlanWorkflow>>): ResultCard[] {
  const colorMap: Record<string, ResultCard['type']> = {
    good: 'success', ok: 'primary', tight: 'warning', impossible: 'danger',
  };
  return [
    { title: '每日参考预算', value: `${result.dailyBudget} 元`, subtitle: `每周约 ${result.weeklyBudget} 元`, type: 'primary' },
    { title: '本月可消费', value: `${result.monthlySpendable} 元`, subtitle: '已扣除固定支出和攒钱目标', type: 'info' },
    { title: '目标可行性', value: result.feasibility, type: colorMap[result.feasibilityLevel] || 'warning' },
    { title: '本周一件事', value: result.nextAction, type: 'success' },
  ];
}

function buildExpenseCards(result: Awaited<ReturnType<typeof runExpenseReviewWorkflow>>): ResultCard[] {
  const overText = result.overBudget === true
    ? `超出预算 ${result.total - (result.dailyBudget || 0)} 元`
    : result.overBudget === false
      ? '在预算范围内 ✓'
      : '';
  return [
    { title: '今日总支出', value: `${result.total} 元`, subtitle: overText || undefined, type: result.overBudget ? 'danger' : 'success' },
    { title: '主要问题', value: result.mainRisk, type: 'warning' },
    { title: '明日行动', value: result.nextAction, type: 'success' },
  ];
}

function buildRiskCards(result: Awaited<ReturnType<typeof runRiskEducationWorkflow>>): ResultCard[] {
  const riskColor: Record<string, ResultCard['type']> = {
    '低': 'success', '中低': 'info', '中': 'warning', '高': 'danger', '极高': 'danger',
  };
  const suitColor: Record<string, ResultCard['type']> = {
    '适合了解': 'success', '可谨慎了解': 'info', '需要谨慎': 'warning',
    '不建议参与': 'danger', '强烈不建议': 'danger',
  };
  return [
    { title: '风险等级', value: result.riskLevel, type: riskColor[result.riskLevel] || 'warning' },
    { title: '大学生适配', value: result.studentSuitability, type: suitColor[result.studentSuitability] || 'warning' },
    { title: '结论', value: result.conclusion, type: 'info' },
    { title: '建议行动', value: result.nextAction, type: 'success' },
  ];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AgentResponse | { error: string }>
) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body: AgentRequest = req.body;
    const { mode: rawMode, profile, formData } = body;
    const message = latestMessage(body);
    const sessionId = getSessionId(req, body);
    const session = getSessionSnapshot(sessionId);

    const mode: WorkflowMode = rawMode === 'auto' || !rawMode
      ? detectIntent(message || '')
      : rawMode;

    // ── Saving Plan ──────────────────────────────────────────────────────────
    if (mode === 'saving_plan') {
      const incoming = formData as Parameters<typeof runSavingPlanWorkflow>[0] | undefined;
      const normalized = incoming || {
        monthlyIncome: Number((profile as { monthlyIncome?: number } | undefined)?.monthlyIncome || 0),
        extraIncome: Number((profile as { extraIncome?: number } | undefined)?.extraIncome || 0),
        fixedExpense: Number((profile as { fixedExpense?: number } | undefined)?.fixedExpense || 0),
        savingGoal: Number(profile?.savingGoal || 0),
        remainingDays: Number((profile as { remainingDays?: number } | undefined)?.remainingDays || 0),
        style: (profile as { style?: 'strict' | 'balanced' | 'relaxed' } | undefined)?.style || 'balanced',
      };

      const missingFields: string[] = [];
      if (!normalized.monthlyIncome) missingFields.push('monthlyIncome');
      if (!normalized.fixedExpense) missingFields.push('fixedExpense');
      if (!normalized.savingGoal) missingFields.push('savingGoal');
      if (!normalized.remainingDays) missingFields.push('remainingDays');

      if (missingFields.length > 0) {
        return res.json({
          mode: 'saving_plan',
          type: 'saving_plan_result',
          summary: '我还需要几个数字才能帮你算。',
          reply: '我还需要知道你的月生活费、固定支出、攒钱目标和剩余天数。你也可以直接发一句“我每月生活费3000，固定支出1200，想攒600”。',
          needMoreInfo: true,
          missingField: missingFields.join(','),
          state: session,
        });
      }

      const result = await runSavingPlanWorkflow(normalized);
      const statePatch = buildSavingPlanState(result);
      const nextState = updateSessionSnapshot(sessionId, statePatch as AppStateSnapshot);
      return res.json({
        mode: 'saving_plan',
        type: 'saving_plan_result',
        summary: result.reply,
        cards: buildSavingCards(result),
        result,
        reply: result.reply,
        state: nextState,
      });
    }

    // ── Expense Review ───────────────────────────────────────────────────────
    if (mode === 'expense_review') {
      const text = (formData as { text?: string })?.text || message;
      const dailyBudget = profile?.dailyBudget
        || (formData as { dailyBudget?: number })?.dailyBudget
        || session.dailyBudget;

      if (!text?.trim()) {
        return res.json({
          mode: 'expense_review',
          type: 'expense_review_result',
          summary: '我需要一段消费记录。',
          reply: '你可以直接发“今天食堂18，奶茶16，外卖35，打车22”这种格式，我会帮你拆分类别和总额。',
          needMoreInfo: true,
          missingField: 'text',
          state: session,
        });
      }

      const result = await runExpenseReviewWorkflow(text, dailyBudget);
      const statePatch = buildExpenseReviewState(result);
      const nextState = updateSessionSnapshot(sessionId, {
        ...statePatch,
        dailyBudget: dailyBudget || session.dailyBudget,
        weeklyBudget: session.weeklyBudget,
        savingGoal: session.savingGoal,
        monthlySpendable: session.monthlySpendable,
        totalIncome: session.totalIncome,
      } as AppStateSnapshot);
      return res.json({
        mode: 'expense_review',
        type: 'expense_review_result',
        summary: result.reply,
        cards: buildExpenseCards(result),
        result,
        reply: result.reply,
        state: nextState,
      });
    }

    // ── Risk Education ───────────────────────────────────────────────────────
    if (mode === 'risk_education') {
      const question = (formData as { question?: string })?.question || message;
      if (!question?.trim()) {
        return res.json({
          mode: 'risk_education',
          type: 'risk_education_result',
          summary: '我需要你的问题。',
          reply: '你可以直接问“我能不能拿生活费买基金？”或者“货币基金和股票基金有什么区别？”。',
          needMoreInfo: true,
          missingField: 'question',
          state: session,
        });
      }
      const result = await runRiskEducationWorkflow(question);
      const statePatch = buildRiskEducationState(result);
      const nextState = updateSessionSnapshot(sessionId, {
        ...statePatch,
        dailyBudget: session.dailyBudget,
        weeklyBudget: session.weeklyBudget,
        savingGoal: session.savingGoal,
        monthlySpendable: session.monthlySpendable,
        totalIncome: session.totalIncome,
      } as AppStateSnapshot);
      return res.json({
        mode: 'risk_education',
        type: 'risk_education_result',
        summary: result.reply,
        cards: buildRiskCards(result),
        result,
        reply: result.reply,
        state: nextState,
      });
    }

    // ── General / Follow-up ──────────────────────────────────────────────────
    if (mode === 'follow_up') {
      if (session.dailyBudget && /预算|每天能花|还能花|可花/.test(message)) {
        const reply = `你现在的每日预算大约是 ${session.dailyBudget} 元，每周约 ${session.weeklyBudget || session.dailyBudget * 7} 元。`;
        return res.json({
          mode: 'follow_up',
          type: 'general',
          summary: reply,
          reply,
          state: session,
        });
      }
      if (session.lastReview && /复盘|今天|消费/.test(message)) {
        const reply = `你上次复盘总支出是 ${session.lastReview.total} 元${session.lastReview.overBudget ? '，有超预算。' : '，在预算内。'}`;
        return res.json({
          mode: 'follow_up',
          type: 'general',
          summary: reply,
          reply,
          state: session,
        });
      }
    }

    if (isDemoMode()) {
      return res.json({
        mode: 'follow_up',
        type: 'general',
        summary: '你好！我是你的攒钱搭子，可以帮你做攒钱计划、复盘消费、解释理财风险。你想先做哪件事？',
        reply: '你好！我是你的攒钱搭子，可以帮你做攒钱计划、复盘消费、解释理财风险。你想先做哪件事？',
        state: session,
      });
    }

    const knowledge = retrieveKnowledge('general', message || '');
    const prompt = `${knowledge ? '参考知识：\n' + knowledge + '\n\n' : ''}当前状态：${JSON.stringify(session)}\n\n用户消息：${message}`;
    const reply = await callLLM(GENERAL_SYSTEM, prompt);
    const nextState = updateSessionSnapshot(sessionId, { updatedAt: new Date().toISOString() });

    return res.json({
      mode: mode as WorkflowMode,
      type: 'general',
      summary: reply,
      reply,
      state: nextState,
    });

  } catch (err) {
    console.error('Agent error:', err);
    return res.status(500).json({ error: '处理请求时出现问题，请重试。' });
  }
}
