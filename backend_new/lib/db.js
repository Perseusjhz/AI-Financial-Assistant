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

  // 生成过去 14 天的消费记录（每天 5-7 条，金额真实细碎）
  const templates = [
    { items:['早餐包子¥5','食堂午饭¥13','地铁¥4','奶茶¥18','食堂晚饭¥10','零食薯片¥8','洗衣¥6'],       catTotals:{necessary:38,optimizable:26,impulsive:0,learning:0} },
    { items:['早餐煎饼¥7','食堂午饭¥12','地铁¥4','瑞幸咖啡¥15','外卖晚饭¥32','教材¥45','水果¥8'],      catTotals:{necessary:31,optimizable:47,impulsive:0,learning:45} },
    { items:['早餐豆浆¥6','食堂午饭¥14','奶茶¥20','打车¥18','食堂晚饭¥11','零食¥9','地铁¥4'],          catTotals:{necessary:35,optimizable:47,impulsive:0,learning:0} },
    { items:['早餐¥6','食堂午饭¥12','地铁¥4','食堂晚饭¥10','超市日用品¥28','水果¥8','公交¥3'],         catTotals:{necessary:71,optimizable:0,impulsive:0,learning:0} },
    { items:['早餐¥5','外卖午饭¥28','奶茶¥19','外卖晚饭¥32','游戏充值¥30','零食¥7'],                  catTotals:{necessary:5,optimizable:79,impulsive:30,learning:0} },
    { items:['早餐包子¥5','食堂午饭¥13','地铁¥4','食堂晚饭¥11','打印资料¥8','公交¥3','洗衣¥6'],        catTotals:{necessary:42,optimizable:0,impulsive:0,learning:8} },
    { items:['早餐¥6','食堂午饭¥13','咖啡¥18','外卖晚饭¥28','打车¥22','零食¥8','地铁¥4'],             catTotals:{necessary:23,optimizable:66,impulsive:0,learning:0} },
    { items:['早餐煎饼¥7','食堂午饭¥12','地铁¥4','奶茶¥16','食堂晚饭¥10','超市¥24','水果¥8'],         catTotals:{necessary:57,optimizable:20,impulsive:0,learning:0} },
    { items:['早餐¥5','食堂午饭¥14','奶茶¥20','外卖晚饭¥35','地铁¥4','零食¥12','纸巾¥8'],             catTotals:{necessary:31,optimizable:67,impulsive:0,learning:0} },
    { items:['早餐¥6','食堂午饭¥13','地铁¥4','网课报名¥99','食堂晚饭¥11','咖啡¥15','公交¥3'],          catTotals:{necessary:37,optimizable:15,impulsive:0,learning:99} },
    { items:['早餐豆浆¥6','食堂午饭¥12','地铁¥4','外卖晚饭¥28','奶茶¥18','零食¥8','洗衣¥6'],          catTotals:{necessary:28,optimizable:46,impulsive:0,learning:0} },
    { items:['早餐¥5','食堂午饭¥13','打车¥22','零食¥8','游戏充值¥50','食堂晚饭¥10','奶茶¥18'],         catTotals:{necessary:28,optimizable:48,impulsive:50,learning:0} },
    { items:['早餐包子¥5','食堂午饭¥14','地铁¥4','食堂晚饭¥12','奶茶¥18','卫生纸¥8','水果¥7'],         catTotals:{necessary:50,optimizable:18,impulsive:0,learning:0} },
    { items:['早餐煎饼¥7','食堂午饭¥13','地铁¥4','咖啡¥15','外卖晚饭¥35','奶茶¥18','洗衣¥6'],         catTotals:{necessary:30,optimizable:68,impulsive:0,learning:0} },
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
