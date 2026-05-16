'use strict';

/* ════════════════════════════════════════════════════════════════
   系统 Prompt —— 所有 workflow 共用同一个人设
   ════════════════════════════════════════════════════════════════ */
const SYSTEM_PROMPT = `你是"攒钱搭子 AI"，一名面向大学生的理财陪伴智能体。

任务：帮助大学生完成三类事情：
1. 制定攒钱和预算计划；
2. 复盘日常消费，给出可执行的优化建议；
3. 用通俗语言解释入门理财知识和投资风险。

语气：像同学和教练的结合——轻松、具体、克制、不说教。

硬性边界（违反则拒绝回答）：
- 不推荐具体股票、基金、币种或金融产品
- 不承诺收益，不鼓励借贷投资
- 不建议用生活费做高风险投资
- 涉及股票/基金/虚拟资产必须强调风险
- 风险类回答必须附免责声明
- 数据不足时追问，不编造`;

/* ════════════════════════════════════════════════════════════════
   Step 4：统一 Prompt Builder
   入参来自前三步的输出，统一组装成一条 user message 发给 LLM

   intent        : 'expense_review' | 'saving_plan' | 'risk_education' | 'follow_up'
   workflowData  : Step 3 确定性计算结果
   ragChunks     : Step 2 RAG 检索结果（string[]）
   dbContext     : 数据库用户摘要（string）
   userMessage   : 原始用户输入
   ════════════════════════════════════════════════════════════════ */
function buildAgentPrompt(intent, workflowData, ragChunks, dbContext, userMessage) {
  // --- RAG 知识块 ---
  const ragSection = ragChunks.length > 0
    ? `\n【RAG 知识库（${ragChunks.length} 条相关条目）】\n${ragChunks.join('\n')}`
    : '';

  // --- Workflow 结构化数据 ---
  const workflowSection = buildWorkflowSection(intent, workflowData);

  // --- 意图专属的输出格式要求 ---
  const outputFormat = buildOutputFormat(intent);

  return {
    system: SYSTEM_PROMPT,
    user:
`${dbContext}
${ragSection}

【Workflow 计算结果（来自 Step 3，已经确定，不要重新计算）】
${workflowSection}

用户消息：${userMessage}

${outputFormat}`,
  };
}

/* ─── Workflow section：把 Step 3 的结构化数据转成文字注入给 LLM ─── */
function buildWorkflowSection(intent, d) {
  if (!d) return '（无 Workflow 数据）';

  if (intent === 'expense_review') {
    if (d.needsMoreInfo) return '用户消费记录中金额不完整，需要追问。';
    return [
      `今日消费总额：¥${d.review.total}`,
      `每日预算：¥${d.review.dailyBudget || '未设置'}`,
      `是否超支：${d.review.overBudget ? `是，超出 ¥${d.review.overAmount}` : '否'}`,
      `主要风险点：${d.review.mainRisk}`,
      `分类合计：必要 ¥${d.review.catTotals.necessary}｜可优化 ¥${d.review.catTotals.optimizable}｜冲动 ¥${d.review.catTotals.impulsive}｜学习 ¥${d.review.catTotals.learning}`,
      `消费明细：${d.items.map(i => `${i.name}¥${i.amount}(${i.category})`).join('、')}`,
    ].join('\n');
  }

  if (intent === 'saving_plan') {
    if (d.needsMoreInfo) return '用户未提供足够的收入/支出信息，需要追问月生活费和固定支出。';
    const c = d.calc;
    return [
      `总收入：¥${c.totalIncome}`,
      `固定支出后可支配：¥${c.availableIncome}`,
      `扣除攒钱目标后本月可花：¥${c.monthlySpendable}`,
      `每日预算：¥${c.dailyBudget}`,
      `每周预算：¥${c.weeklyBudget}`,
      `可行性评估：${c.feasibility}`,
      `主要风险点：${d.riskPoints.join('、')}`,
    ].join('\n');
  }

  if (intent === 'risk_education') {
    const r = d.risk;
    return [
      `资产/行为类型：${d.assetType || '待识别'}`,
      `风险等级：${r.riskLevel}（${r.score}/5）`,
      `学生适配判断：${r.suitability}`,
      `风险级别：${r.level}`,
    ].join('\n');
  }

  // follow_up — 不需要额外 workflow 数据，DB context 已经足够
  return '（追问/闲聊场景，依据 DB 档案和 RAG 知识回答）';
}

/* ─── 意图专属输出格式 ─────────────────────────────────────────── */
function buildOutputFormat(intent) {
  const base = '用学生化语言回复，语气轻松，不说教。';

  if (intent === 'expense_review') {
    return `${base}
返回 JSON：
{
  "reply": "复盘说明（不超过80字，基于上方 Workflow 数据）",
  "nextAction": "明日一件具体可执行的事（不超过25字）"
}`;
  }
  if (intent === 'saving_plan') {
    return `${base}
返回 JSON：
{
  "reply": "计划说明（不超过80字，直接引用上方计算结果）",
  "nextAction": "本周一件事（不超过25字）",
  "riskPoints": ["消费风险点1", "风险点2"]
}`;
  }
  if (intent === 'risk_education') {
    return `${base}，强调风险，不推荐任何具体产品。
返回 JSON：
{
  "conclusion": "一句话结论（不超过30字）",
  "reply": "白话解释（不超过100字，可用简短列表）",
  "reasons": ["原因1", "原因2", "原因3"],
  "nextAction": "建议行动（不超过25字）",
  "disclaimer": "本回答仅供理财教育参考，不构成任何投资建议"
}`;
  }
  // follow_up
  return `${base}直接基于 DB 档案数据回答，不要让用户重复提供数字。
返回 JSON：
{
  "reply": "回复（不超过120字）"
}`;
}

/* ════════════════════════════════════════════════════════════════
   以下保留旧接口供独立路由（saving-plan / expense-review / risk）使用
   ════════════════════════════════════════════════════════════════ */
function savingPlanPrompt(calc, knowledge) {
  const kCtx = knowledge.join('\n');
  return {
    system: SYSTEM_PROMPT,
    user: `财务数据：每日预算 ¥${calc.dailyBudget}，每周 ¥${calc.weeklyBudget}，可行性：${calc.feasibility}，本月可花 ¥${calc.monthlySpendable}
知识参考：${kCtx}
请返回 JSON：{"reply":"计划说明（不超过80字）","nextAction":"本周一件事（不超过25字）","riskPoints":["风险点"]}`,
  };
}

function expenseReviewPrompt(review, knowledge) {
  const kCtx = knowledge.join('\n');
  return {
    system: SYSTEM_PROMPT,
    user: `消费数据：总 ¥${review.total}，预算 ¥${review.dailyBudget}，${review.overBudget ? `超支 ¥${review.overAmount}` : '未超支'}，主要风险：${review.mainRisk}
知识参考：${kCtx}
请返回 JSON：{"reply":"复盘说明（不超过80字）","nextAction":"明日一件事（不超过25字）"}`,
  };
}

function riskEducationPrompt(question, risk, knowledge) {
  const kCtx = knowledge.join('\n');
  return {
    system: SYSTEM_PROMPT,
    user: `问题：${question}
风险等级：${risk.riskLevel}（${risk.score}/5），学生适配：${risk.suitability}
知识参考：${kCtx}
请返回 JSON：{"conclusion":"结论（不超过30字）","reply":"白话解释（不超过100字）","reasons":["原因1","原因2","原因3"],"nextAction":"建议行动（不超过25字）","disclaimer":"本回答仅供理财教育参考，不构成任何投资建议"}`,
  };
}

module.exports = {
  SYSTEM_PROMPT,
  buildAgentPrompt,
  savingPlanPrompt,
  expenseReviewPrompt,
  riskEducationPrompt,
};
