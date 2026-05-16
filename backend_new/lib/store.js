'use strict';

const fs   = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '../data/spending.json');

function load() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); }
  catch { return []; }
}

function save(records) {
  fs.writeFileSync(FILE, JSON.stringify(records, null, 2));
}

/**
 * Record today's total spending.
 * Overwrites the same date if called multiple times in one day.
 */
function recordDay(total, items = []) {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const records = load();
  const idx = records.findIndex(r => r.date === today);
  const entry = { date: today, total, items };
  if (idx >= 0) records[idx] = entry;
  else records.push(entry);
  // Keep last 60 days sorted
  records.sort((a, b) => a.date.localeCompare(b.date));
  save(records.slice(-60));
}

/**
 * Return the last N days of records as chart-ready objects.
 * Gaps (days with no data) are filled with null so the chart can skip them.
 */
function recentChartData(days = 9) {
  const records = load();
  if (records.length === 0) return null; // no data yet → caller uses demo

  // Take last `days` records
  const slice = records.slice(-days);
  return slice.map(r => {
    const d = new Date(r.date + 'T00:00:00');
    const now = new Date();
    const isToday = r.date === now.toISOString().slice(0, 10);
    const label = isToday ? '今天' : `${d.getMonth() + 1}/${d.getDate()}`;
    return { label, amount: r.total, date: r.date };
  });
}

module.exports = { recordDay, recentChartData };
