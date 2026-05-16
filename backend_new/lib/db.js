'use strict';

/**
 * 轻量 JSON 数据库
 * 文件位置：data/db.json  — 可直接用编辑器修改
 *
 * 结构：
 * {
 *   profile  : 用户财务档案（月收入、固定支出、攒钱目标等）
 *   spending : 每日消费记录数组（消费复盘时自动写入）
 * }
 */

const fs   = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '../data/db.json');

// ─── 读写 ────────────────────────────────────────────────────────

function read() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); }
  catch { return null; }
}

function write(db) {
  fs.writeFileSync(FILE, JSON.stringify(db, null, 2), 'utf8');
}

// ─── 初始化（首次启动时写入演示数据） ───────────────────────────

function seed() {
  if (read()) return; // 已有数据，不覆盖

  const today    = new Date();
  const spending = [];

  // 生成过去 14 天的随机消费记录
  const templates = [
    { items:['食堂¥20','外卖¥38','奶茶¥16'],               catTotals:{necessary:20,optimizable:54,impulsive:0,learning:0} },
    { items:['食堂¥18','地铁¥6','咖啡¥22','教材¥45'],      catTotals:{necessary:24,optimizable:22,impulsive:0,learning:45} },
    { items:['食堂¥22','外卖¥32','打车¥18','零食¥12'],      catTotals:{necessary:22,optimizable:62,impulsive:0,learning:0} },
    { items:['食堂¥20','超市¥35','地铁¥6'],                catTotals:{necessary:61,optimizable:0,impulsive:0,learning:0} },
    { items:['外卖¥42','奶茶¥19','游戏充值¥30'],            catTotals:{necessary:0,optimizable:61,impulsive:30,learning:0} },
    { items:['食堂¥18','食堂¥16','打印资料¥8','地铁¥6'],    catTotals:{necessary:40,optimizable:0,impulsive:0,learning:8} },
    { items:['食堂¥22','外卖¥28','咖啡¥18','打车¥22'],      catTotals:{necessary:22,optimizable:68,impulsive:0,learning:0} },
    { items:['超市¥48','地铁¥6','奶茶¥16'],                catTotals:{necessary:54,optimizable:16,impulsive:0,learning:0} },
    { items:['食堂¥20','外卖¥45','零食¥15','打车¥15'],      catTotals:{necessary:20,optimizable:75,impulsive:0,learning:0} },
    { items:['食堂¥18','课程¥99','地铁¥6'],                catTotals:{necessary:24,optimizable:0,impulsive:0,learning:99} },
    { items:['食堂¥22','外卖¥35','奶茶¥18'],               catTotals:{necessary:22,optimizable:53,impulsive:0,learning:0} },
    { items:['食堂¥20','打车¥25','零食¥18','游戏充值¥50'],  catTotals:{necessary:20,optimizable:43,impulsive:50,learning:0} },
    { items:['食堂¥18','超市¥32','地铁¥8'],                catTotals:{necessary:58,optimizable:0,impulsive:0,learning:0} },
    { items:['外卖¥38','咖啡¥22','打印资料¥12'],            catTotals:{necessary:0,optimizable:60,impulsive:0,learning:12} },
  ];

  for (let i = 13; i >= 0; i--) {
    const d    = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const tpl  = templates[13 - i];
    const total = Object.values(tpl.catTotals).reduce((s, v) => s + v, 0);

    spending.push({
      date:      dateStr,
      total,
      items:     tpl.items,
      catTotals: tpl.catTotals,
      overBudget: total > 84,
      overAmount: Math.max(0, total - 84),
    });
  }

  const db = {
    profile: {
      // ── 财务档案（可手动修改这些数值）──
      monthlyIncome:    3000,   // 月生活费（元）
      extraIncome:      0,      // 兼职/奖学金（元）
      fixedExpense:     1200,   // 固定支出：房租+话费+交通（元）
      savingGoal:       600,    // 本月攒钱目标（元）
      remainingDays:    15,     // 本月剩余天数
      style:            'balanced', // strict / balanced / relaxed
      // ── 以下由系统计算，不建议手改 ──
      dailyBudget:      80,
      weeklyBudget:     560,
      monthlySpendable: 1200,
      feasibility:      '基本可行',
      savedAmount:      320,    // 本月已攒金额（元，可手动更新）
      streak:           3,      // 连续未超支天数（可手动更新）
    },
    spending,  // 每日消费记录，可直接增删改
  };

  write(db);
  console.log('[db] 已生成演示数据 →', FILE);
}

// ─── Profile ─────────────────────────────────────────────────────

function getProfile() {
  return (read() || {}).profile || {};
}

function saveProfile(updates) {
  const db = read() || { spending: [] };
  db.profile = { ...(db.profile || {}), ...updates };
  write(db);
  return db.profile;
}

// ─── Spending ────────────────────────────────────────────────────

function getSpending() {
  return (read() || {}).spending || [];
}

/**
 * 添加或更新当天消费记录（每天只保留最后一次复盘结果）
 */
function upsertSpending(entry) {
  const db = read() || { profile: {}, spending: [] };
  db.spending = db.spending || [];
  const idx = db.spending.findIndex(r => r.date === entry.date);
  if (idx >= 0) db.spending[idx] = entry;
  else db.spending.push(entry);
  db.spending.sort((a, b) => a.date.localeCompare(b.date));
  write(db);
}

/**
 * 最近 N 天消费记录，转成图表格式 [{label, amount, date}]
 */
function chartData(days = 9) {
  const records = getSpending().slice(-days);
  if (records.length === 0) return null;
  const todayStr = new Date().toISOString().slice(0, 10);
  return records.map(r => {
    const d = new Date(r.date + 'T00:00:00');
    return {
      label:  r.date === todayStr ? '今天' : `${d.getMonth() + 1}/${d.getDate()}`,
      amount: r.total,
      date:   r.date,
    };
  });
}

module.exports = { seed, getProfile, saveProfile, getSpending, upsertSpending, chartData };
