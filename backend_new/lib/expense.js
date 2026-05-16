'use strict';

// Keyword → category mapping (checked in order; first match wins)
const CATEGORY_MAP = [
  {
    key: 'learning',
    keywords: ['教材', '书', '课程', '考试', '报名', '打印', '学习', '培训', '文具', '笔记本', '实习', '讲义'],
  },
  {
    key: 'impulsive',
    keywords: ['游戏', '充值', '盲盒', '彩票', '娱乐', '非计划', '网购', '饰品', '首饰', '化妆', '美甲', '潮玩'],
  },
  {
    key: 'optimizable',
    keywords: ['外卖', '奶茶', '咖啡', '打车', '滴滴', '嘀嗒', '零食', '饮料', '肯德基', 'KFC', '麦当劳', '星巴克', '瑞幸', '喜茶', '蜜雪', '甜点', '糕点', '下午茶'],
  },
  {
    key: 'necessary',
    keywords: ['食堂', '菜', '饭', '早餐', '午餐', '晚餐', '超市', '地铁', '公交', '话费', '水电', '房租', '水费', '电费', '米', '面', '药', '医院', '日用', '洗漱', '卫生'],
  },
];

/**
 * Classify a single item name into one of four categories.
 */
function classifyItem(name) {
  for (const { key, keywords } of CATEGORY_MAP) {
    if (keywords.some((kw) => name.includes(kw))) return key;
  }
  return 'necessary'; // conservative default
}

/**
 * Parse natural language expense text.
 * Handles formats like: "食堂18，奶茶16，外卖35" or "今天食堂 18 奶茶 16"
 */
function parseExpenses(text) {
  const items = [];
  // Match: non-digit-or-separator word(s) followed by an optional ¥/￥ and a number
  const re = /([^\d¥￥，,、。\s]+)\s*[¥￥]?\s*(\d+(?:\.\d+)?)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const name = m[1].trim().replace(/^[今天的是]+/, ''); // strip leading noise
    const amount = parseFloat(m[2]);
    if (name.length >= 1 && amount > 0 && amount < 10000) {
      items.push({ name, amount, category: classifyItem(name) });
    }
  }
  return items;
}

/**
 * Build the structured review result from parsed items.
 */
function buildReview(items, dailyBudget) {
  const total = items.reduce((s, i) => s + i.amount, 0);

  const categories = { necessary: [], optimizable: [], impulsive: [], learning: [] };
  for (const item of items) {
    categories[item.category].push({ name: item.name, amount: item.amount, label: `${item.name} ¥${item.amount}` });
  }

  const overBudget = dailyBudget > 0 && total > dailyBudget;
  const overAmount = overBudget ? Math.round(total - dailyBudget) : 0;

  // Find largest avoidable spend for main risk copy
  const avoidable = items
    .filter((i) => i.category === 'optimizable' || i.category === 'impulsive')
    .sort((a, b) => b.amount - a.amount);

  const mainRisk = avoidable.length > 0
    ? `${avoidable[0].name} ¥${avoidable[0].amount} 是今天最大的可优化支出`
    : '消费结构比较健康，必要支出为主';

  // Numeric summary per category for the stacked bar
  const catTotals = {
    necessary: categories.necessary.reduce((s, i) => s + i.amount, 0),
    optimizable: categories.optimizable.reduce((s, i) => s + i.amount, 0),
    impulsive: categories.impulsive.reduce((s, i) => s + i.amount, 0),
    learning: categories.learning.reduce((s, i) => s + i.amount, 0),
  };

  // Convert to string arrays for frontend label rendering
  const categoryLabels = {
    necessary: categories.necessary.map((i) => i.label),
    optimizable: categories.optimizable.map((i) => i.label),
    impulsive: categories.impulsive.map((i) => i.label),
    learning: categories.learning.map((i) => i.label),
  };

  return { total, dailyBudget, overBudget, overAmount, categories: categoryLabels, catTotals, mainRisk };
}

module.exports = { parseExpenses, buildReview, classifyItem };
