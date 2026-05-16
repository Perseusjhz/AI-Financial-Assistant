'use strict';

const { Router } = require('express');
const { assessRisk, riskTagsFor } = require('../lib/risk');
const { retrieve, retrieveWithTags } = require('../lib/rag');
const { chat, parseJSON, isDemoMode } = require('../lib/llm');
const { riskEducationPrompt } = require('../lib/prompts');

const router = Router();

/**
 * POST /api/risk-education
 *
 * Aligns with RiskScreen:
 *  - Input:  question string
 *  - Output: riskLevel (0-5 gauge), suitability badge, AI explanation,
 *            reason cards, suggestion banner, disclaimer
 *
 * Body params:
 *   question  string  required
 */
router.post('/', async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || typeof question !== 'string' || question.trim().length < 3) {
      return res.status(400).json({
        error: 'missing_question',
        message: '请输入你的理财问题，例如：我能不能拿生活费买基金？',
      });
    }

    const q = question.trim();

    // 1. Deterministic risk assessment
    const risk = assessRisk(q);

    // 2. RAG retrieval — combine mode tags with risk-level tags
    const riskTags = riskTagsFor(risk.level);
    const knowledge = retrieveWithTags([...riskTags, 'risk', 'education'], q);

    // 3. LLM explanation
    let conclusion, reply, reasons, nextAction;
    const disclaimer = '本回答仅供理财教育参考，不构成任何投资建议。';

    if (!isDemoMode()) {
      const prompt = riskEducationPrompt(q, risk, knowledge);
      const raw = await chat(prompt.system, prompt.user, { json: true });
      const parsed = parseJSON(raw);
      if (parsed) {
        conclusion  = parsed.conclusion;
        reply       = parsed.reply;
        reasons     = parsed.reasons;
        nextAction  = parsed.nextAction;
      }
    }

    // Deterministic fallbacks
    if (!conclusion) conclusion = buildFallbackConclusion(risk);
    if (!reply)      reply      = buildFallbackReply(risk, knowledge);
    if (!reasons)    reasons    = buildFallbackReasons(risk);
    if (!nextAction) nextAction = buildFallbackAction(risk);

    // Risk level labels for the 5-segment gauge (matches frontend levels array)
    const GAUGE_LEVELS = ['低', '中低', '中', '高', '极高'];
    const gaugeIndex = risk.score - 1; // score 1-5 → index 0-4

    return res.json({
      type: 'risk_education_result',
      question: q,
      riskLevel: risk.riskLevel,
      riskScore: risk.score,
      gaugeIndex,            // 0-4, used by frontend gauge bar
      gaugeLabels: GAUGE_LEVELS,
      studentSuitability: risk.suitability,
      conclusion,
      reply,
      reasons,
      nextAction,
      disclaimer,
      demo: isDemoMode(),
    });
  } catch (err) {
    console.error('[risk-education]', err);
    return res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

// ─── Fallback helpers ─────────────────────────────────────────────────

function buildFallbackConclusion(risk) {
  const map = {
    extreme: '不建议用生活费参与，风险极高',
    high: '不建议直接用生活费参与',
    medium: '可以先学习，但不建议生活费重仓',
    medium_low: '可以了解，风险相对较低',
    low: '优先级高，建议先做这个',
  };
  return map[risk.level] ?? '需要谨慎对待';
}

function buildFallbackReply(risk, knowledge) {
  if (risk.level === 'extreme') {
    return `直接说结论：不能。不是道德判断，是数学问题——日内波动30-50%是常态，生活费是不可承受损失的钱，亏了就影响下个月吃饭。`;
  }
  if (risk.level === 'high') {
    return `股票等高风险资产波动大，本金可能亏损。大学生应优先建立预算和应急金，不建议用生活费直接参与。`;
  }
  if (risk.level === 'medium') {
    return `基金存在净值波动风险，可能亏损本金。建议先学习基础知识，用生活费结余（而非全部生活费）小额了解。`;
  }
  if (risk.level === 'medium_low') {
    return `货币基金风险较低，流动性好，适合短期闲置资金管理。但不是银行存款，极端情况下也有损失风险。`;
  }
  return `这个方向风险较低，是大学生理财的好起点。建议先建立预算和应急金再开始。`;
}

function buildFallbackReasons(risk) {
  const reasonMap = {
    extreme: [
      '价格波动极大，可在短期内涨跌 50% 以上',
      '生活费是不可承受损失的钱，没有冗余',
      '高风险资产应 ≤ 总余钱的 5%，不是 100%',
    ],
    high: [
      '单只股票波动风险远高于指数',
      '生活费需要保证流动性，随时可用',
      '大学生应优先建立预算和应急金',
    ],
    medium: [
      '基金净值会随市场波动，可能亏损本金',
      '生活费需要保证流动性，基金赎回有时间成本',
      '大学生应优先建立应急金再考虑投资',
    ],
    medium_low: [
      '货币基金不是银行存款，不受存款保险保护',
      '收益较低（2-3%），但流动性好',
      '适合存放短期闲置资金，不建议全部生活费存入',
    ],
    low: [
      '预算和应急金是财务安全的基础',
      '先管好钱，再考虑让钱生钱',
      '良好的消费习惯比高收益投资更重要',
    ],
  };
  return reasonMap[risk.level] ?? reasonMap.medium;
}

function buildFallbackAction(risk) {
  const actionMap = {
    extreme: '先存够 3 个月生活费作为应急金，再考虑投资',
    high: '先建立每日预算和应急金，股票知识可以学但不用生活费',
    medium: '先了解货币基金和定存，等有结余再考虑其他基金',
    medium_low: '可以把短期闲置资金存入货币基金，但别超过生活费的 20%',
    low: '今天就开始记录今日预算，养成消费复盘习惯',
  };
  return actionMap[risk.level] ?? '先建立应急金再考虑其他理财行动';
}

module.exports = router;
