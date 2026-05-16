import { RiskEducationResult, RiskLevel, StudentSuitability } from '../types';
import { callLLM, isDemoMode } from '../llm';
import { retrieveKnowledge } from '../rag';

const SYSTEM_PROMPT = `你是"攒钱搭子 AI"，为大学生提供理财风险教育。
绝不推荐具体产品，不承诺收益，不鼓励借贷投资。
用通俗学生化语言解释风险。必须用 JSON 格式输出。`;

interface RiskProfile {
  level: RiskLevel;
  suitability: StudentSuitability;
  defaultConclusion: string;
  defaultReasons: string[];
  defaultNextAction: string;
}

const RISK_RULES: Array<{ pattern: RegExp; profile: RiskProfile }> = [
  {
    pattern: /借钱|贷款|网贷|花呗|借呗|杠杆|配资|借.*投资/,
    profile: {
      level: '极高',
      suitability: '强烈不建议',
      defaultConclusion: '强烈不建议借贷投资，可能造成债务危机。',
      defaultReasons: ['借贷投资亏损后仍需还款，可能陷入债务困境', '大学生无稳定收入，还款压力大', '任何借钱投资的建议都需要极度警惕'],
      defaultNextAction: '拒绝任何要求你借钱投资的建议',
    },
  },
  {
    pattern: /[虚拟货币比特以太]|币|crypto|nft|web3/i,
    profile: {
      level: '高',
      suitability: '不建议参与',
      defaultConclusion: '不建议用生活费参与虚拟资产投资，风险极大。',
      defaultReasons: ['价格可在短期内剧烈波动，曾有资产腰斩案例', '缺乏监管保护，交易平台风险难以评估', '大学生生活费是基本保障，不适合高风险配置'],
      defaultNextAction: '先学习基础金融知识，不用生活费参与',
    },
  },
  {
    pattern: /股票|炒股|A股|港股|美股/,
    profile: {
      level: '高',
      suitability: '不建议参与',
      defaultConclusion: '不建议用生活费直接买股票，风险较高。',
      defaultReasons: ['股票短期波动大，可能亏损本金', '需要大量专业知识和时间研究', '大学期间更重要的是学习积累和建立基础储蓄'],
      defaultNextAction: '先建立应急金和预算习惯，再学股票知识',
    },
  },
  {
    pattern: /基金(?!.*货币)/,
    profile: {
      level: '中',
      suitability: '需要谨慎',
      defaultConclusion: '可以先学习基金知识，但不建议用生活费直接投入。',
      defaultReasons: ['基金存在净值波动，可能亏损本金', '生活费需要保证随时可用（流动性）', '建议先建立应急金，有结余再考虑'],
      defaultNextAction: '先准备 1 个月基础生活费作为应急金',
    },
  },
  {
    pattern: /货币基金|余额宝|零钱通|活期理财/,
    profile: {
      level: '中低',
      suitability: '可谨慎了解',
      defaultConclusion: '货币基金风险较低，适合学习了解，少量闲置资金可考虑。',
      defaultReasons: ['主要投资短期国债等安全资产，历史波动极小', '流动性好，通常 T+1 可赎回', '仍非银行存款，极端情况存在风险'],
      defaultNextAction: '了解货币基金基础知识后再决定是否使用',
    },
  },
  {
    pattern: /应急金|储蓄|攒钱|怎么存钱|存款/,
    profile: {
      level: '低',
      suitability: '适合了解',
      defaultConclusion: '建立应急金和储蓄习惯是非常好的起点，强烈推荐。',
      defaultReasons: ['应急金保障生活不被突发情况打乱', '储蓄是所有理财的基础', '无风险，随时可取'],
      defaultNextAction: '先存下 1 个月生活费作为应急金',
    },
  },
];

function detectRisk(question: string): RiskProfile {
  for (const rule of RISK_RULES) {
    if (rule.pattern.test(question)) return rule.profile;
  }
  return {
    level: '中',
    suitability: '需要谨慎',
    defaultConclusion: '这个问题涉及一定风险，建议先了解基础知识。',
    defaultReasons: ['投资前需要了解基本风险知识', '大学生应优先保障基本生活和建立应急金', '任何投资都可能存在本金损失风险'],
    defaultNextAction: '先学习基础理财知识，建立预算意识',
  };
}

export async function runRiskEducationWorkflow(question: string): Promise<RiskEducationResult> {
  const profile = detectRisk(question);

  if (isDemoMode()) {
    return {
      type: 'risk_education_result',
      riskLevel: profile.level,
      studentSuitability: profile.suitability,
      conclusion: profile.defaultConclusion,
      reasons: profile.defaultReasons,
      nextAction: profile.defaultNextAction,
      disclaimer: '本回答仅用于理财知识教育，不构成投资建议。',
      reply: `关于"${question}"：风险等级${profile.level}，大学生${profile.suitability}。${profile.defaultConclusion}${profile.defaultReasons[0]}。${profile.defaultNextAction}。\n\n本回答仅用于理财知识教育，不构成投资建议。`,
    };
  }

  const knowledge = retrieveKnowledge('risk_education', question);

  const prompt = `大学生的理财问题："${question}"

预判风险等级：${profile.level}
预判学生适配：${profile.suitability}

参考知识：
${knowledge}

请输出 JSON（字段名用英文，中文内容）：
{
  "riskLevel": "${profile.level}",
  "studentSuitability": "${profile.suitability}",
  "conclusion": "30-50字结论",
  "reasons": ["原因1", "原因2", "原因3"],
  "nextAction": "具体行动建议，20字以内",
  "disclaimer": "本回答仅用于理财知识教育，不构成投资建议。",
  "reply": "80-120字的完整回复，用学生化通俗语言，必须强调风险，末尾附加免责声明"
}

规则：不得推荐具体产品，不承诺收益，不鼓励借贷投资。`;

  const raw = await callLLM(SYSTEM_PROMPT, prompt, true);
  let parsed: Partial<RiskEducationResult> = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = {};
  }

  return {
    type: 'risk_education_result',
    riskLevel: (parsed.riskLevel as RiskLevel) || profile.level,
    studentSuitability: (parsed.studentSuitability as StudentSuitability) || profile.suitability,
    conclusion: parsed.conclusion || profile.defaultConclusion,
    reasons: parsed.reasons || profile.defaultReasons,
    nextAction: parsed.nextAction || profile.defaultNextAction,
    disclaimer: '本回答仅用于理财知识教育，不构成投资建议。',
    reply: parsed.reply || `关于这个问题，风险等级 ${profile.level}，${profile.defaultConclusion}本回答仅用于理财知识教育，不构成投资建议。`,
  };
}

export function buildRiskEducationState(result: RiskEducationResult) {
  return {
    updatedAt: new Date().toISOString(),
    riskLevel: result.riskLevel,
    studentSuitability: result.studentSuitability,
  };
}
