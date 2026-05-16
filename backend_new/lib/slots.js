'use strict';

/**
 * Slot Parser — 从自然语言文本中提取攒钱规划所需的字段
 *
 * 支持两种模式：
 * 1. 绝对值：  "生活费3000" → monthlyIncome = 3000
 * 2. 增量值：  "多加500奖学金" → extraIncome += 500（返回 deltas）
 */

const PATTERNS = {
  monthlyIncome: [
    /(?:月生活费|生活费|月收入|每月收入|总收入|月入)[约是为]?\s*[¥￥]?\s*(\d+(?:\.\d+)?)[kK千]?/,
    /收入[约是]?\s*[¥￥]?\s*(\d+(?:\.\d+)?)[kK千]?/,
  ],
  extraIncome: [
    /(?:兼职|奖学金|额外收入|其他收入|副业)[约是]?\s*[¥￥]?\s*(\d+(?:\.\d+)?)/,
  ],
  fixedExpense: [
    /(?:固定支出|固定花销|固定费用|固支|每月固定)[约是]?\s*[¥￥]?\s*(\d+(?:\.\d+)?)/,
    /(?:房租|租金)[加+]?(?:话费|电话|通讯)?[约是]?\s*[¥￥]?\s*(\d+(?:\.\d+)?)/,
  ],
  savingGoal: [
    /(?:想攒|要攒|希望攒|目标|存下|存够|攒)[到下]?\s*[¥￥]?\s*(\d+(?:\.\d+)?)/,
    /(?:储蓄|存款)目标[约是]?\s*[¥￥]?\s*(\d+(?:\.\d+)?)/,
  ],
};

// 增量模式（"多加/增加/又多了" → delta）
const DELTA_PATTERNS = [
  // extraIncome += X（奖学金、兼职、补贴）
  {
    field: 'extraIncome',
    op: 'add',
    patterns: [
      /(?:得了|多得了|多了|获得了|有了|领了)\s*[¥￥]?\s*(\d+)\s*(?:元|块)?\s*(?:奖学金|兼职|补贴|外快|稿费|返现|红包)/,
      /(?:奖学金|兼职补贴|补贴|兼职)\s*(?:发了|来了|到了|有)?\s*[¥￥]?\s*(\d+)/,
      /(?:额外|多)收入\s*[¥￥]?\s*(\d+)/,
    ],
  },
  // monthlyIncome += X（生活费多加）
  {
    field: 'monthlyIncome',
    op: 'add',
    patterns: [
      /(?:生活费|月收入|收入)(?:再|多|给我)?加\s*[¥￥]?\s*(\d+)/,
      /(?:多加|增加)\s*[¥￥]?\s*(\d+)\s*(?:生活费|月收入|到生活费)/,
      /生活费.*?(?:多|增加|多加)\s*[¥￥]?\s*(\d+)/,
    ],
  },
  // monthlyIncome -= X（生活费减少）
  {
    field: 'monthlyIncome',
    op: 'sub',
    patterns: [
      /(?:生活费|月收入)(?:减少|少了|缩减)\s*[¥￥]?\s*(\d+)/,
    ],
  },
  // savingGoal set（修改攒钱目标）
  {
    field: 'savingGoal',
    op: 'set',
    patterns: [
      /(?:攒钱|存钱)?目标(?:改成|换成|调整到|定)\s*[¥￥]?\s*(\d+)/,
      /(?:改为|调整为|变成)\s*[¥￥]?\s*(\d+)\s*(?:的)?目标/,
    ],
  },
];

function normalizeAmount(str) {
  const n = parseFloat(str);
  if (/[kK千]/.test(str)) return Math.round(n * 1000);
  return Math.round(n);
}

/**
 * 从文本中提取 Slot，返回：
 * { slots: {field: value}, deltas: [{field, op, amount}] }
 */
function parseSavingSlots(text) {
  const slots  = {};
  const deltas = [];

  // 先尝试增量模式（优先级更高）
  for (const { field, op, patterns } of DELTA_PATTERNS) {
    for (const re of patterns) {
      const m = text.match(re);
      if (m) {
        deltas.push({ field, op, amount: normalizeAmount(m[1]) });
        break;
      }
    }
  }

  // 再解析绝对值（只在没被增量模式覆盖的字段上生效）
  const deltaFields = new Set(deltas.map(d => d.field));
  for (const [field, patterns] of Object.entries(PATTERNS)) {
    if (deltaFields.has(field)) continue; // 已有增量，不再覆盖
    for (const re of patterns) {
      const m = text.match(re);
      if (m) {
        slots[field] = normalizeAmount(m[1]);
        break;
      }
    }
  }

  return { slots, deltas };
}

/**
 * 应用 delta 到现有 profile，返回更新后的 profile
 */
function applyDeltas(profile, deltas) {
  const updated = { ...profile };
  for (const { field, op, amount } of deltas) {
    const current = Number(updated[field] || 0);
    if (op === 'add') updated[field] = current + amount;
    else if (op === 'sub') updated[field] = Math.max(0, current - amount);
    else if (op === 'set') updated[field] = amount;
  }
  return updated;
}

/**
 * 判断哪些必填 Slot 还缺失
 */
function missingSlots(profile) {
  const required = ['monthlyIncome', 'fixedExpense', 'savingGoal'];
  return required.filter(k => !profile[k] || Number(profile[k]) <= 0);
}

/**
 * 根据缺失字段生成精准追问语
 */
function buildAskMessage(missing) {
  const labelMap = {
    monthlyIncome: '月生活费（或总月收入）多少元',
    fixedExpense:  '固定支出（房租+话费+交通卡等）大概多少元',
    savingGoal:    '这个月想攒多少元',
  };

  if (missing.length >= 3) {
    return '我来帮你算！只需要知道 3 个数字就够了：\n\n① 月生活费（或总月收入）多少？\n② 固定支出（房租+话费等）多少？\n③ 这个月想攒多少？\n\n大概数字就行，不需要很精确。';
  }

  if (missing.length === 1) {
    return `还差一个数字就能帮你算了：${labelMap[missing[0]]}？`;
  }

  const questions = missing.map((k, i) => `${i + 1}. ${labelMap[k]}？`).join('\n');
  return `还差几个数字，填完我马上帮你算：\n\n${questions}\n\n大概数字就行。`;
}

module.exports = { parseSavingSlots, applyDeltas, missingSlots, buildAskMessage };
