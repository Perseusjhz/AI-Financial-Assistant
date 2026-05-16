'use strict';

const { Router } = require('express');
const { calculateBudget } = require('../lib/budget');
const db = require('../lib/db');

const router = Router();

/** GET /api/profile — 返回当前完整档案 */
router.get('/', (req, res) => {
  res.json(db.getProfile());
});

/** PATCH /api/profile — 局部更新档案字段 */
router.patch('/', (req, res) => {
  const updated = db.saveProfile(req.body);
  res.json(updated);
});

/** GET /api/profile/defaults */
router.get('/defaults', (req, res) => {
  res.json({
    monthlyIncome: null, extraIncome: 0, fixedExpense: null,
    savingGoal: null, remainingDays: null, style: 'balanced',
    streak: 0, savedAmount: 0,
  });
});

/** POST /api/profile/validate */
router.post('/validate', (req, res) => {
  const { monthlyIncome, extraIncome = 0, fixedExpense, savingGoal, remainingDays, style = 'balanced' } = req.body;
  const errors = {};
  if (!monthlyIncome || Number(monthlyIncome) <= 0) errors.monthlyIncome = '月生活费必须 > 0';
  if (fixedExpense === undefined || Number(fixedExpense) < 0) errors.fixedExpense = '固定支出不能为负';
  if (savingGoal === undefined || Number(savingGoal) < 0) errors.savingGoal = '攒钱目标不能为负';
  if (!remainingDays || Number(remainingDays) < 1) errors.remainingDays = '剩余天数必须 >= 1';
  if (Object.keys(errors).length > 0) return res.status(422).json({ valid: false, errors });
  const calc = calculateBudget({ monthlyIncome, extraIncome, fixedExpense, savingGoal, remainingDays, style });
  res.json({ valid: true, computed: calc });
});

/** GET /api/profile/stats */
router.get('/stats', (req, res) => {
  const p = db.getProfile();
  const spending = db.getSpending();
  const streak = p.streak || 0;
  const dailyAvg = spending.length > 0
    ? Math.round(spending.slice(-7).reduce((s, r) => s + r.total, 0) / Math.min(7, spending.length))
    : p.dailyBudget || 84;

  res.json({
    topStats: [
      { value: String(streak),       label: '攒钱天数', sub: `连击 ${streak}` },
      { value: String(spending.length), label: '复盘次数', sub: `共 ${spending.length} 天` },
      { value: String(dailyAvg),     label: '日均消费', sub: '元 / 天' },
    ],
    financialProfile: [
      { value: p.monthlyIncome ? '¥' + p.monthlyIncome : '--', label: '月生活费' },
      { value: p.monthlySpendable ? '¥' + p.monthlySpendable : '--', label: '可支配' },
      { value: p.savingGoal ? '¥' + p.savingGoal : '--', label: '攒钱目标' },
      { value: p.style === 'strict' ? '严格' : p.style === 'relaxed' ? '宽松' : '平衡', label: '风格' },
    ],
  });
});

module.exports = router;
