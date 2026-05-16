'use strict';

// Rules ordered from highest to lowest risk — first match wins
const RISK_RULES = [
  {
    keywords: ['借钱', '借贷', '贷款', '配资', '杠杆', '融资', '网贷', '消费贷', '信用卡套现'],
    level: 'extreme',
    score: 5,
    levelLabel: '极高',
    suitability: '绝对不建议',
  },
  {
    keywords: ['虚拟货币', '数字货币', '比特币', 'BTC', 'ETH', '以太坊', 'NFT', '元宇宙', '加密货币', 'Crypto', 'Web3', '山寨币', '狗狗币', '买币', '炒币', '数字币', '虚拟币'],
    level: 'extreme',
    score: 5,
    levelLabel: '极高',
    suitability: '学生不适合',
  },
  {
    keywords: ['股票', '炒股', 'A股', '港股', '美股', '期货', '期权', '黄金', '原油', '外汇', '大宗商品'],
    level: 'high',
    score: 4,
    levelLabel: '高',
    suitability: '不建议用生活费',
  },
  {
    keywords: ['基金', '指数基金', '混合基金', '股票型', 'ETF', '债券基金', '基金定投'],
    level: 'medium',
    score: 3,
    levelLabel: '中',
    suitability: '需要谨慎',
  },
  {
    keywords: ['货币基金', '余额宝', '零钱通', '活期理财', '国债逆回购', '定期存款', '银行存款'],
    level: 'medium_low',
    score: 2,
    levelLabel: '中低',
    suitability: '可以了解',
  },
  {
    keywords: ['储蓄', '存钱', '应急金', '预算', '记账', '攒钱', '理财规划'],
    level: 'low',
    score: 1,
    levelLabel: '低',
    suitability: '建议优先做',
  },
];

/**
 * Assess risk level from a question string.
 * Returns structured risk assessment (deterministic — no LLM).
 */
function assessRisk(question) {
  const q = question.toLowerCase();
  for (const rule of RISK_RULES) {
    if (rule.keywords.some((kw) => q.includes(kw.toLowerCase()))) {
      return {
        level: rule.level,
        riskLevel: rule.levelLabel,
        score: rule.score,
        suitability: rule.suitability,
      };
    }
  }
  // Default to medium when we can't classify
  return { level: 'medium', riskLevel: '中', score: 3, suitability: '需要谨慎' };
}

/**
 * Map risk level to the RAG tags that are most relevant for retrieval.
 */
function riskTagsFor(level) {
  const map = {
    extreme: ['risk', 'guardrail', 'crypto', 'loan', 'extreme'],
    high: ['risk', 'investment', 'guardrail'],
    medium: ['risk', 'fund', 'education'],
    medium_low: ['risk', 'money_market', 'safe'],
    low: ['saving', 'budget', 'student'],
  };
  return map[level] ?? map.medium;
}

module.exports = { assessRisk, riskTagsFor };
