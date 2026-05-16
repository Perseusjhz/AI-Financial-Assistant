'use strict';

const { Router } = require('express');
const { parseExpenses, buildReview } = require('../lib/expense');
const db = require('../lib/db');

const router = Router();

/**
 * POST /api/spending/update
 * Body: { date: "2026-05-14", text: "食堂18，奶茶20", dailyBudget: 84 }
 * Upserts spending for any past (or today) date.
 */
router.post('/update', (req, res) => {
  try {
    const { date, text, dailyBudget = 0 } = req.body;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'invalid_date', message: '日期格式应为 YYYY-MM-DD' });
    }
    if (!text || text.trim().length < 1) {
      return res.status(400).json({ error: 'missing_text', message: '请输入消费内容' });
    }
    if (date > new Date().toISOString().slice(0, 10)) {
      return res.status(400).json({ error: 'future_date', message: '不能修改未来日期' });
    }

    const items = parseExpenses(text.trim());
    if (items.length === 0) {
      return res.status(422).json({ error: 'parse_failed', message: '没能识别出消费项目和金额' });
    }

    const review = buildReview(items, Number(dailyBudget));

    db.upsertSpending({
      date,
      total:      review.total,
      items:      items.map(({ name, amount }) => `${name}¥${amount}`),
      catTotals:  review.catTotals,
      categories: review.categories,
      overBudget: review.overBudget,
      overAmount: review.overAmount,
    });

    return res.json({
      ok: true,
      date,
      total:      review.total,
      overBudget: review.overBudget,
      overAmount: review.overAmount,
      catTotals:  review.catTotals,
    });
  } catch (err) {
    console.error('[spending-update]', err);
    return res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

module.exports = router;
