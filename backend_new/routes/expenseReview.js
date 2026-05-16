'use strict';

const { Router } = require('express');
const { parseExpenses, buildReview } = require('../lib/expense');
const { retrieve } = require('../lib/rag');
const { chat, parseJSON, isDemoMode } = require('../lib/llm');
const { expenseReviewPrompt } = require('../lib/prompts');
const db = require('../lib/db');

const router = Router();

/**
 * POST /api/expense-review
 *
 * Aligns with ReviewScreen:
 *  - Input:  natural language expense text + optional dailyBudget
 *  - Output: total, overBudget, stacked bar categories, AI insight, nextAction
 *
 * Body params:
 *   text        string  required  "今天食堂18，奶茶16，外卖35，打车22"
 *   dailyBudget number  optional  (from saved plan, used for over-budget check)
 */
router.post('/', async (req, res) => {
  try {
    const { text, dailyBudget = 0 } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length < 2) {
      return res.status(400).json({
        error: 'missing_text',
        message: '请输入今日消费记录，例如：食堂18，奶茶16，外卖35',
      });
    }

    // 1. Parse natural language → items
    const items = parseExpenses(text.trim());

    if (items.length === 0) {
      return res.status(422).json({
        error: 'parse_failed',
        message: '没能识别出消费项目和金额，请检查格式，例如：食堂18，奶茶16',
      });
    }

    // 2. Build structured review (deterministic)
    const review = buildReview(items, Number(dailyBudget));

    // 3. RAG retrieval
    const knowledge = retrieve('expense_review', text);

    // 4. LLM commentary
    let reply, nextAction;

    if (!isDemoMode()) {
      const prompt = expenseReviewPrompt(review, knowledge);
      const raw = await chat(prompt.system, prompt.user, { json: true });
      const parsed = parseJSON(raw);
      if (parsed) {
        reply = parsed.reply;
        nextAction = parsed.nextAction;
      }
    }

    if (!reply)       reply       = buildFallbackReply(review);
    if (!nextAction)  nextAction  = buildFallbackAction(review);

    // 5. 持久化到 db.json（今天只保留最后一次复盘结果）
    db.upsertSpending({
      date:       new Date().toISOString().slice(0, 10),
      total:      review.total,
      items:      items.map(({ name, amount }) => `${name}¥${amount}`),
      catTotals:  review.catTotals,
      overBudget: review.overBudget,
      overAmount: review.overAmount,
    });

    return res.json({
      type: 'expense_review_result',
      total: review.total,
      dailyBudget: review.dailyBudget,
      overBudget: review.overBudget,
      overAmount: review.overAmount,
      categories: review.categories,        // string arrays for frontend labels
      catTotals: review.catTotals,          // numeric per category for stacked bar
      mainRisk: review.mainRisk,
      items: items.map(({ name, amount, category }) => ({ name, amount, category })),
      nextAction,
      reply,
      demo: isDemoMode(),
    });
  } catch (err) {
    console.error('[expense-review]', err);
    return res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

// ─── Fallback helpers ─────────────────────────────────────────────────

function buildFallbackReply(review) {
  const { total, overBudget, overAmount, mainRisk } = review;
  if (!overBudget) {
    return `今天花了 ¥${total}，没超预算，不错 👍 ${mainRisk}，明天保持就行。`;
  }
  return `今天花了 ¥${total}，超支了 ¥${overAmount}。${mainRisk}。`;
}

function buildFallbackAction(review) {
  const { categories, overBudget } = review;
  if (categories.impulsive?.length > 0) {
    const item = categories.impulsive[0].split(' ')[0];
    return `明天避开 ${item}，把这笔钱攒下来`;
  }
  if (categories.optimizable?.length > 0) {
    const item = categories.optimizable[0].split(' ')[0];
    return `明天把 ${item} 换成更便宜的替代`;
  }
  if (overBudget) {
    return `明天目标：总支出控制在预算内`;
  }
  return `保持今天的消费结构就好`;
}

module.exports = router;
