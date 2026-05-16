'use strict';

const { Router } = require('express');
const db = require('../lib/db');

const router = Router();

/**
 * GET /api/chart-data?period=week|month|year
 *
 * 返回指定时间维度的消费数据，供首页折线图使用。
 */
router.get('/', (req, res) => {
  const { period = 'week' } = req.query;
  const spending  = db.getSpending();
  const profile   = db.getProfile();
  const today     = new Date();
  const todayStr  = today.toISOString().slice(0, 10);
  const budget    = profile.dailyBudget || 84;

  let chartData, predictedCount, subtitle;

  // ── 周视图：最近 7 天 + 2 预测 ─────────────────────────────────
  if (period === 'week') {
    const days = spending.slice(-7);
    chartData = buildDayData(days, todayStr);

    // 用最近实际值预测后 2 天
    const last = chartData.at(-1)?.amount ?? budget;
    const avg  = chartData.reduce((s, d) => s + d.amount, 0) / Math.max(1, chartData.length);
    for (let i = 1; i <= 2; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      chartData.push({
        label:     `${d.getMonth() + 1}/${d.getDate()}`,
        amount:    Math.round((last + avg) / 2),
        date:      d.toISOString().slice(0, 10),
        predicted: true,
      });
    }
    predictedCount = 2;
    subtitle = `近 ${spending.slice(-7).length} 天 · 预测 2 天`;
  }

  // ── 月视图：本月每一天 ─────────────────────────────────────────
  else if (period === 'month') {
    const monthStr  = todayStr.slice(0, 7);
    const monthData = spending.filter(r => r.date.startsWith(monthStr));
    chartData       = buildDayData(monthData, todayStr);
    predictedCount  = 0;
    subtitle        = `${today.getMonth() + 1} 月 · ${monthData.length} 天有记录`;
  }

  // ── 年视图：按月合计 ────────────────────────────────────────────
  else {
    const year = today.getFullYear();
    chartData  = buildMonthData(spending, year);
    predictedCount = 0;
    subtitle   = `${year} 年 · 月均消费`;
  }

  return res.json({ period, chartData, predictedCount, subtitle, budget });
});

// ── helpers ───────────────────────────────────────────────────────

function buildDayData(records, todayStr) {
  return records.map(r => {
    const d = new Date(r.date + 'T00:00:00');
    return {
      label:  r.date === todayStr ? '今天' : `${d.getMonth() + 1}/${d.getDate()}`,
      amount: r.total,
      date:   r.date,
      overBudget: r.overBudget,
      items:  r.items || [],
    };
  });
}

function buildMonthData(records, year) {
  const map = {};
  for (const r of records) {
    if (!r.date.startsWith(String(year))) continue;
    const month = r.date.slice(0, 7); // "2026-05"
    map[month] = (map[month] || 0) + r.total;
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, total]) => {
      const m = Number(month.slice(5));
      return { label: `${m}月`, amount: total, date: month };
    });
}

module.exports = router;
