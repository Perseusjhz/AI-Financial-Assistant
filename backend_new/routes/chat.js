'use strict';

/**
 * POST /api/chat  —  攒钱搭子 AI Agent 主入口
 *
 * 完整 Pipeline：
 *
 *   Step 0  Input Guardrail     输入级安全检查（快速拦截明显违规）
 *   Step 1  Intent Detection    5 种意图（情绪优先）
 *   Step 2  Emotion Detection   情绪分类（影响 temperature 和回复策略）
 *   Step 3  RAG Retrieval       按意图 + 情绪检索知识库
 *   Step 4  Workflow            确定性计算 + Slot Filling（parseSavingSlots）
 *   Step 5  Prompt Build        分层 Prompt 组装
 *   Step 6  LLM API             温度按意图调整
 *   Step 7  Output Guardrail    输出级安全检查
 *   Step 8  Response Builder    结构化响应（含 summary/emotionalSupport/financialState）
 */

const { Router } = require('express');
const { parseExpenses, buildReview } = require('../lib/expense');
const { calculateBudget, detectRiskPoints } = require('../lib/budget');
const { assessRisk, riskTagsFor } = require('../lib/risk');
const { retrieve, retrieveWithTags } = require('../lib/rag');
const { chat: llmChat, parseJSON, isDemoMode } = require('../lib/llm');
const { buildAgentPrompt, emotionalSupportPrompt } = require('../lib/prompts');
const { parseSavingSlots, applyDeltas, missingSlots, buildAskMessage } = require('../lib/slots');
const { detectEmotion, emotionAcknowledgement, assessFinancialState } = require('../lib/emotion');
const db = require('../lib/db');

const router = Router();

/* ════════════════════════════════════════════════════════════════
   主入口
   ════════════════════════════════════════════════════════════════ */
router.post('/', async (req, res) => {
  try {
    const { message, mode = 'auto', profile: clientProfile = {}, history = [] } = req.body;
    if (!message?.trim()) {
      return res.status(400).json({ error: 'missing_message', message: '请输入消息' });
    }
    const msg = message.trim();

    // 数据库用户数据
    const dbProfile  = db.getProfile();
    const dbSpending = db.getSpending();

    // ── Step 0: Input Guardrail（输入级拦截）────────────────────────
    const inputGuard = checkInputGuardrail(msg);
    if (inputGuard.blocked) {
      return res.json({
        intent: 'risk_education',
        reply: inputGuard.safeReply,
        emotionalSupport: '了解风险边界是理财的第一步。',
        summary: '该问题触发安全边界，已返回合规回复。',
        card: null,
        financialState: 'safe',
        nextSuggestions: ['什么是应急金', '货币基金安全吗', '先应该做什么再考虑投资'],
        demo: isDemoMode(),
      });
    }

    // ── Step 1: Intent Detection ──────────────────────────────────
    const intent = mode !== 'auto' ? mode : step1_detectIntent(msg);

    // ── Step 2: Emotion Detection ─────────────────────────────────
    const emotion = detectEmotion(msg);

    // ── Step 3: RAG Retrieval ─────────────────────────────────────
    const ragChunks = step3_rag(intent, msg, emotion);

    // ── Step 4: Workflow + Slot Filling ───────────────────────────
    // 从消息中提取 Slot（绝对值 + 增量），合并 DB profile + 前端 profile
    const { slots: slotsFromMsg, deltas } = parseSavingSlots(msg);
    let profile = { ...dbProfile, ...(clientProfile || {}), ...slotsFromMsg };
    let profileChanged = false;

    // 应用增量更新（"多加500奖学金"→ extraIncome += 500）
    if (deltas.length > 0) {
      profile = applyDeltas(profile, deltas);
      profileChanged = true;
    }
    if (Object.keys(slotsFromMsg).length > 0) {
      profileChanged = true;
    }

    // 如果 profile 有变化，重算预算并保存到 DB
    if (profileChanged) {
      const updNow = new Date();
      const lastDay = new Date(updNow.getFullYear(), updNow.getMonth() + 1, 0).getDate();
      const remDays = Math.max(1, lastDay - updNow.getDate() + 1);
      if (profile.monthlyIncome) {
        const newCalc = calculateBudget({ ...profile, remainingDays: remDays, extraIncome: profile.extraIncome || 0 });
        profile = { ...profile, ...newCalc };
      }
      db.saveProfile(profile);
    }

    const workflowData = step4_workflow(intent, msg, profile, dbSpending);

    // 信息缺失 → 追问，跳过 LLM
    if (workflowData.needsMoreInfo) {
      return res.json({
        intent,
        reply:            workflowData.askMessage,
        emotionalSupport: null,
        summary:          '等待用户补充信息中。',
        card:             null,
        financialState:   'unknown',
        nextSuggestions:  workflowData.suggestions || [],
        needsMoreInfo:    true,
        demo:             isDemoMode(),
      });
    }

    // ── Step 5: Prompt Build ──────────────────────────────────────
    const dbContext = buildDbContext(dbProfile, dbSpending);
    let prompt;
    if (intent === 'emotional_support') {
      prompt = emotionalSupportPrompt(msg, dbContext, ragChunks, emotion);
    } else {
      prompt = buildAgentPrompt(intent, workflowData, ragChunks, dbContext, msg, emotion);
    }

    // ── Step 6: LLM API（temperature 按意图+情绪动态调）────────────
    const temperature = resolveTemperature(intent, emotion);
    // Convert history to actual multi-turn messages for the LLM
    const llmHistory = history.slice(-10).map(h => ({
      role: h.role === 'user' ? 'user' : 'assistant',
      content: h.text || '',
    })).filter(h => h.content);
    let llmResult = null;
    if (!isDemoMode()) {
      const raw = await llmChat(prompt.system, prompt.user, {
        json: true,
        temperature,
        maxTokens: 700,
        history: llmHistory,
      });
      llmResult = parseJSON(raw);
    }

    // ── Step 7: Output Guardrail ──────────────────────────────────
    if (llmResult?.reply) {
      const guarded = checkOutputGuardrail(llmResult.reply);
      if (guarded !== llmResult.reply) {
        llmResult.reply = guarded;
        llmResult.emotionalSupport = null;
      }
    }

    // ── Step 8: 组装响应 ──────────────────────────────────────────
    const todayStr  = new Date().toISOString().slice(0, 10);
    const todayRec  = dbSpending.find(r => r.date === todayStr);
    const financialState = assessFinancialState(profile, todayRec?.total);

    const response = buildResponse(intent, workflowData, llmResult, emotion, financialState);
    const dataUpdated = !!(workflowData.dbWritten || profileChanged);
    // 增量更新摘要（用于前端提示）
    let syncNote = null;
    if (deltas.length > 0) {
      syncNote = deltas.map(d => {
        const labels = { monthlyIncome:'月生活费', extraIncome:'额外收入', savingGoal:'攒钱目标' };
        const ops = { add:'增加了', sub:'减少了', set:'调整为' };
        return `${labels[d.field]||d.field}${ops[d.op]||''}¥${d.amount}`;
      }).join('，') + '，数据已同步';
    } else if (workflowData.dbWritten) {
      syncNote = '消费已记录，数据已同步';
    }
    return res.json({ ...response, dataUpdated, syncNote, demo: isDemoMode() });

  } catch (err) {
    console.error('[chat pipeline]', err);
    return res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

/* ════════════════════════════════════════════════════════════════
   Step 0: Input Guardrail
   在意图识别之前就拦截明显违规输入
   ════════════════════════════════════════════════════════════════ */
const INPUT_DANGER = [
  /(?:推荐|买|买入|重仓)\s*(?:一只|哪只|哪个)\s*(?:股票|基金|币)/,
  /(?:怎么|如何)\s*快速\s*(?:翻倍|暴富|赚钱)/,
  /借钱.{0,10}(?:投资|炒股|买币)/,
  /哪个.{0,8}(?:稳赚|必赚|保本)/,
];

const INPUT_SAFE_REPLY =
  '这个问题涉及具体投资推荐或收益承诺，我没办法帮你做这件事。\n\n' +
  '但我可以帮你做的是：把你的生活费情况理清楚，看清风险，再决定要不要了解相关知识。\n\n' +
  '本回答仅供理财知识教育参考，不构成任何投资建议。';

function checkInputGuardrail(text) {
  const hit = INPUT_DANGER.some(re => re.test(text));
  return hit ? { blocked: true, safeReply: INPUT_SAFE_REPLY } : { blocked: false };
}

/* ════════════════════════════════════════════════════════════════
   Step 1: Intent Detection（情绪优先）
   ════════════════════════════════════════════════════════════════ */
// ─── Intent patterns ────────────────────────────────────────────────
const RESCUE_RE      = /(?:还剩|剩余|只剩|剩下)[^\d]*\d+[^\d]*元.*\d+[天日]|月末急救|撑到月底|撑.*\d+天|快没钱.*\d+天|\d+天.*只有\d+|急救模式/;
const WHATIF_RE      = /如果.*(?:少|不|省|减少|控制).*(?:杯|次|元|块)|少喝.*能省|少点.*影响|每天.*少.*多|如果.*每周|如果.*每天.*(?:少|多|省)|能省多少|会影响.*目标吗/;
const IMPULSE_RE     = /(?:想买|要买|准备买|打算买|入手|下单)[^，。！,\.!]*\d+|我要.*买.*[¥￥]?\d+|[¥￥]\d+.*(?:要买|想买)/;
const ANALYSIS_RE    = /复盘|分析.*(?:我|消费|支出|数据)|给我.*(?:报告|总结|看看|统计)|(?:这周|本周|这月|本月|过去|最近|半个月|一个月|几天).*(?:消费|支出|花了|数据|情况)|月报|周报|账单|支出情况|消费情况|花了多少|哪里花多了|花在哪|消费习惯|消费分析/;
// 情绪词（含"消费吐槽"场景，不要求纯情绪词）
const EMOTION_RE     = /焦虑|烦死|崩了|又超支|管不住|好难|撑不住|挫败|自责|难受|月末没钱|快没钱|怎么办|失败|放弃|坚持不了|废了|堕落|后悔|心疼|好惨|太惨|好气|没忍住|又买了|又点了|又喝了|又花了|又败了|破功|忍不住了|管不了|控制不住自己|好想哭|对自己失望|反正都|算了|无所谓了|没救了/;
// 消费吐槽复合识别：有负面情绪词 + 消费行为 → 优先情绪陪伴
const SPEND_VENT_RE  = /(?:没忍住|又买|又点|又喝|又花|没控住|忍不住|后悔|废了|破功).*(?:外卖|奶茶|咖啡|零食|打车)|(?:外卖|奶茶|咖啡|零食).*(?:没忍住|又买|又点|又喝|后悔|感觉.*废|感觉.*堕)/;
const EXPENSE_RE     = /[\d]\s*元|食堂|奶茶|外卖|打车|咖啡|充值|超市|早餐|午餐|晚餐|买了|花了|消费|今天花|记一笔|花多少|地铁|公交|理发|药|医院|话费|网费|零食|饮料|快递|洗衣|电影|游戏|火锅|烧烤|聚餐|夜宵|水果|牛奶|面包|蜜雪|瑞幸|星巴克|喜茶|滴滴|健身|会员|订阅|教材|文具|打印|房租|水电|日用/;
const SAVING_RE      = /生活费|攒钱|预算|目标|每天能花|每月|剩余天数|收入|固定支出|计划|攒多少|能攒/;
const RISK_RE        = /虚拟货币|比特币|数字货币|买币|炒币|翻倍|稳赚|P2P|借钱.*(?:买|投)|网贷.*投|(?:什么是|解释|了解).*(?:基金|股票|理财产品)/;
// 投资准备度判断：用户问「我能不能/该不该投资」，需要结合自身数据回答
const INVEST_RE      = /(?:能不能|可不可以|适不适合|应不应该|该不该|要不要|我能|我该|我现在).*(?:买基金|投资|理财|买股票)|(?:买|拿|用)[^，。！\n]*\d+[^，。！\n]*(?:基金|理财|试试|股票)|同学.*(?:赚了|赚钱|买基金)|(?:看到|听说).*(?:赚了|涨了).*(?:想|要|也)|理财入门|四个钱袋|适合.*理财|现在.*理财|模拟理财|理财.*阶段|省.*(?:能不能|可以).*(?:买|投|理财)|我现在适合|投资.*从哪|我适合什么/;
const CHECKIN_RE     = /我做到了|打卡|完成了|今天(?:做到了|执行了|没有点外卖|去食堂了|做到)|已经做了|做到了|执行了/;
const ALTERNATIVE_RE = /总是(?:想|要)(?:喝|吃|买|点)|戒不掉|忍不住(?:买|喝|吃|点)|控制不住|每天都(?:要|会)(?:喝|吃|点)|停不下来|(?:奶茶|外卖|咖啡|零食).*(?:戒|减少|少喝|少吃|少点)|怎么减少.*(?:奶茶|外卖)|怎么控制.*消费/;

function step1_detectIntent(msg) {
  if (CHECKIN_RE.test(msg))      return 'checkin';
  if (RESCUE_RE.test(msg))       return 'rescue_mode';
  if (WHATIF_RE.test(msg))       return 'what_if';
  if (IMPULSE_RE.test(msg))      return 'impulse_check';
  if (ALTERNATIVE_RE.test(msg))  return 'spending_alternative';
  if (ANALYSIS_RE.test(msg))     return 'spending_analysis';
  // 情绪优先：吐槽消费 or 单纯情绪 → emotional_support
  if (SPEND_VENT_RE.test(msg))   return 'emotional_support';
  if (EMOTION_RE.test(msg))      return 'emotional_support';
  // 投资准备度（需结合用户数据判断）优先于通用风险教育
  if (INVEST_RE.test(msg))       return 'investment_readiness';
  // 有明确金额数字才走 expense_review，否则可能是闲聊
  if (EXPENSE_RE.test(msg) && /\d/.test(msg)) return 'expense_review';
  if (SAVING_RE.test(msg))       return 'saving_plan';
  if (RISK_RE.test(msg))         return 'risk_education';
  return 'follow_up';
}

/* ════════════════════════════════════════════════════════════════
   Step 3: RAG Retrieval（情绪场景加载陪伴知识）
   ════════════════════════════════════════════════════════════════ */
function step3_rag(intent, msg, emotion) {
  // 高情绪强度：额外检索情绪陪伴知识
  const emotionTags = (emotion.intensity === 'strong' || emotion.intensity === 'moderate')
    ? ['emotion', 'support', 'psychology']
    : [];

  if (intent === 'emotional_support') {
    return retrieveWithTags([...emotionTags, 'tone', 'budget'], msg, 3);
  }
  if (intent === 'risk_education') {
    const risk = assessRisk(msg);
    return retrieveWithTags([...riskTagsFor(risk.level), 'risk', 'education', ...emotionTags], msg, 3);
  }
  if (intent === 'investment_readiness') {
    return retrieveWithTags(['investment', 'readiness', 'framework', 'safety', 'money_market', 'beginner'], msg, 4);
  }
  const modeMap = {
    expense_review:   'expense_review',
    saving_plan:      'saving_plan',
    spending_analysis:'expense_review',
    rescue_mode:      'expense_review',
    what_if:          'saving_plan',
    impulse_check:    'expense_review',
    follow_up:        'chat',
  };
  const chunks = retrieve(modeMap[intent] ?? 'chat', msg, emotionTags.length ? 2 : 3);
  if (emotionTags.length > 0) {
    const emoChunks = retrieveWithTags(emotionTags, msg, 1);
    return [...chunks, ...emoChunks].slice(0, 3);
  }
  return chunks;
}

/* ════════════════════════════════════════════════════════════════
   Step 4: Workflow + Slot Filling
   ════════════════════════════════════════════════════════════════ */
function step4_workflow(intent, msg, profile, spending) {

  /* ── 消费复盘 ── */
  if (intent === 'expense_review') {
    const items = parseExpenses(msg);
    if (items.length === 0) {
      return {
        needsMoreInfo: true,
        askMessage:  '我能看出你记录了一些消费，但金额不太完整。\n可以像这样补充一下吗？\n\n  食堂18，奶茶16，外卖35\n\n大概数字就好，不需要特别精确。',
        suggestions: ['食堂18，奶茶16，外卖35', '帮我做攒钱计划', '问一个理财问题'],
      };
    }
    const budget = Number(profile?.dailyBudget ?? 0);
    const review = buildReview(items, budget);
    const zone   = calcBudgetZone(review.total, budget);

    // 预算修复计算（超支时）
    let repair = null;
    if (review.overBudget && review.overAmount > 0) {
      const nowDate = new Date();
      const lastDayOfMonth = new Date(nowDate.getFullYear(), nowDate.getMonth() + 1, 0).getDate();
      const remainingRepairDays = Math.max(1, lastDayOfMonth - nowDate.getDate());
      const dailyAdjustment = Math.round(review.overAmount / remainingRepairDays);
      const repairDifficulty = dailyAdjustment < 10 ? '低' : dailyAdjustment < 25 ? '中等' : dailyAdjustment < 50 ? '较高' : '高压力';
      repair = { dailyAdjustment, remainingRepairDays, repairDifficulty };
    }
    // 自动把这次消费写入 DB（含今天追加的记录）
    const todayStr = new Date().toISOString().slice(0, 10);
    const existingRec = spending.find(r => r.date === todayStr);
    // 若今天已有记录，合并（累加）消费项目；否则直接写入
    if (existingRec) {
      const mergedItems = [...(existingRec.items || [])];
      items.forEach(newItem => {
        // 避免重复写入相同描述的条目
        const label = `${newItem.name}¥${newItem.amount}`;
        if (!mergedItems.includes(label)) mergedItems.push(label);
      });
      const mergedCatTotals = {};
      for (const k of ['necessary','optimizable','impulsive','learning']) {
        mergedCatTotals[k] = (existingRec.catTotals?.[k] || 0) + (review.catTotals[k] || 0);
      }
      const mergedTotal = mergedCatTotals.necessary + mergedCatTotals.optimizable + mergedCatTotals.impulsive + mergedCatTotals.learning;
      const bgt = Number(profile?.dailyBudget ?? 0);
      db.upsertSpending({
        date: todayStr, total: mergedTotal, items: mergedItems,
        catTotals: mergedCatTotals, overBudget: bgt > 0 && mergedTotal > bgt,
        overAmount: bgt > 0 ? Math.max(0, mergedTotal - bgt) : 0,
      });
    } else {
      db.upsertSpending({
        date: todayStr, total: review.total,
        items: items.map(i => `${i.name}¥${i.amount}`),
        catTotals: review.catTotals, overBudget: review.overBudget, overAmount: review.overAmount,
      });
    }
    return { intent: 'expense_review', items, review, zone, repair, dbWritten: true };
  }

  /* ── 攒钱规划：精准 Slot Filling ── */
  if (intent === 'saving_plan') {
    const missing = missingSlots(profile);
    if (missing.length > 0) {
      return {
        needsMoreInfo: true,
        missingFields: missing,
        askMessage:    buildAskMessage(missing),
        suggestions:   ['生活费3000，固定支出1200，想攒600，还剩20天', '帮我复盘今天消费'],
      };
    }
    const calc       = calculateBudget({ ...profile, extraIncome: profile.extraIncome || 0 });
    const riskPoints = detectRiskPoints(calc.dailyBudget);
    // 保存到数据库
    db.saveProfile({ ...profile, ...calc });
    return { intent: 'saving_plan', calc, riskPoints, dbWritten: true };
  }

  /* ── 风险教育 ── */
  if (intent === 'risk_education') {
    const risk      = assessRisk(msg);
    const assetType = detectAssetType(msg);
    // 投资前安全三问检测
    const isInvestmentQuery = /能不能买|要不要买|我想买|我要买|应该买|可以买|该不该|要不要投|我能投|买基金|买股票|买币/.test(msg);
    const fundSource = /生活费|零花钱|奖学金/.test(msg) ? '生活费（高风险，不建议）' : '资金来源不明确（需询问）';
    const hasBorrowRisk = /借钱|贷款|网贷|套现/.test(msg);
    const safetyConclusion = hasBorrowRisk ? '借钱投资：极不建议，风险极高' :
      isInvestmentQuery ? (risk.level === 'extreme' || risk.level === 'high' ? '暂不建议投入，先建立应急金' : '先学习风险，不急于买入') : '';
    return { intent: 'risk_education', risk, assetType, isInvestmentQuery, fundSource, hasBorrowRisk, safetyConclusion,
      hasEmergencyFund: false // 默认未知，LLM引导用户回答
    };
  }

  /* ── 投资准备度评估 ── */
  if (intent === 'investment_readiness') {
    return buildInvestmentReadiness(msg, profile, spending);
  }

  /* ── 情绪陪伴 ── */
  if (intent === 'emotional_support') {
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayRec = spending.find(r => r.date === todayStr);
    // 识别消息中的情绪型消费项目（吐槽类消息里可能带了实际消费）
    const ventItems = parseExpenses(msg);
    const ventTotal = ventItems.reduce((s, i) => s + i.amount, 0);
    return { intent: 'emotional_support', todayRec, profile, ventItems, ventTotal };
  }

  /* ── 月末急救 ── */
  if (intent === 'rescue_mode') {
    return buildRescueMode(msg, profile);
  }

  /* ── What-if 推演 ── */
  if (intent === 'what_if') {
    return buildWhatIf(msg, profile);
  }

  /* ── 冲动消费检测 ── */
  if (intent === 'impulse_check') {
    return buildImpulseCheck(msg, profile);
  }

  /* ── 消费分析（历史复盘）── */
  if (intent === 'spending_analysis') {
    return buildSpendingAnalysis(msg, spending, profile);
  }

  /* ── 打卡确认 ── */
  if (intent === 'checkin') {
    return { intent: 'checkin', date: new Date().toISOString().slice(0, 10), msg };
  }

  /* ── 消费替代方案 ── */
  if (intent === 'spending_alternative') {
    return buildSpendingAlternative(msg, profile);
  }

  return { intent: 'follow_up' };
}

/* ════════════════════════════════════════════════════════════════
   温度动态分配（意图 + 情绪强度）
   ════════════════════════════════════════════════════════════════ */
function resolveTemperature(intent, emotion) {
  const base = {
    saving_plan:       0.3,
    expense_review:    0.3,
    risk_education:        0.2,
    investment_readiness:  0.35,
    emotional_support:     0.6,
    rescue_mode:       0.5,
    what_if:           0.3,
    impulse_check:     0.4,
    spending_analysis: 0.4,
    follow_up:         0.5,
  }[intent] ?? 0.4;

  // 情绪强度高 → 稍微提高温度，让回复更有温度感
  if (emotion.intensity === 'strong' && intent !== 'risk_education') {
    return Math.min(0.7, base + 0.15);
  }
  return base;
}

/* ════════════════════════════════════════════════════════════════
   Step 7: Output Guardrail
   ════════════════════════════════════════════════════════════════ */
const OUTPUT_FORBIDDEN = [
  '稳赚', '必赚', '推荐你买', '可以买入', '重仓', '翻倍', '借钱投资',
  '适合无脑买', '保证收益', '肯定涨', '一定能赚', '内部消息', '绝对安全',
];

const OUTPUT_SAFE_REPLY =
  '这个问题涉及投资风险，我不能推荐具体产品，也不能承诺任何收益。\n\n' +
  '如果你的资金主要来自生活费，建议先保证基本生活需求、建立应急金，再学习相关风险知识。\n\n' +
  '本回答仅供理财知识教育参考，不构成任何投资建议。';

function checkOutputGuardrail(text) {
  for (const phrase of OUTPUT_FORBIDDEN) {
    if (text.includes(phrase)) return OUTPUT_SAFE_REPLY;
  }
  return text;
}

/* ════════════════════════════════════════════════════════════════
   Step 8: 响应组装
   含 emotionalSupport / summary / financialState / memoryPatch
   ════════════════════════════════════════════════════════════════ */
function buildResponse(intent, workflowData, llm, emotion, financialState) {
  const defaultAck = emotion.type !== 'neutral'
    ? emotionAcknowledgement(emotion)
    : null;

  /* ── 消费复盘 ── */
  if (intent === 'expense_review') {
    const { review, repair } = workflowData;
    const over = review.overBudget;
    const repairSuffix = over && repair
      ? `把超的 ¥${review.overAmount} 平摊到后面 ${repair.remainingRepairDays} 天，每天少花约 ¥${repair.dailyAdjustment} 就能修回来。`
      : '';
    return {
      intent,
      reply: llm?.reply ?? (over
        ? `今天花了 ¥${review.total}，超了 ¥${review.overAmount}。这不是失败，${repairSuffix}`
        : `今天花了 ¥${review.total}，在预算内，做得不错！`),
      emotionalSupport: llm?.emotionalSupport ?? (over
        ? `超支不代表失败，修复难度：${repair?.repairDifficulty || '中等'}，我们一起修。`
        : '今天做得不错，保持住这个节奏！'),
      summary: llm?.summary ?? `今日¥${review.total}，${over ? `超预算¥${review.overAmount}，每天少花¥${repair?.dailyAdjustment || '?'}可修复` : '未超预算'}`,
      card: {
        type: 'expense_review_card',
        total: review.total, overBudget: over, overAmount: review.overAmount,
        dailyBudget: review.dailyBudget, catTotals: review.catTotals, categories: review.categories,
        zone: workflowData.zone,
        repair: repair ? {
          dailyAdjustment: repair.dailyAdjustment,
          remainingDays: repair.remainingRepairDays,
          difficulty: repair.repairDifficulty,
          note: llm?.repairNote ?? `平摊${repair.remainingRepairDays}天，每天少花¥${repair.dailyAdjustment}`,
        } : null,
      },
      financialState,
      nextSuggestions: over
        ? ['帮我修复今天的超支', '明天外卖换食堂能省多少', '帮我分析这周消费趋势']
        : ['今天继续攒多少', '看一下本月余额进度', '如果每天少花10元能多攒多少'],
      memoryPatch: { lastEmotion: over ? 'frustrated' : 'encouraged' },
    };
  }

  /* ── 攒钱规划 ── */
  if (intent === 'saving_plan') {
    const { calc, riskPoints } = workflowData;
    return {
      intent,
      reply:            llm?.reply ?? `好的，数据已经更新了。按新计划，每天 ¥${calc.dailyBudget}，目标评估：${calc.feasibility}。`,
      emotionalSupport: llm?.emotionalSupport ?? '计划出来了！接下来只要每天看住预算就好，一步一步来。',
      summary:          llm?.summary ?? `每日预算¥${calc.dailyBudget}，每周¥${calc.weeklyBudget}，${calc.feasibility}`,
      card: {
        type: 'saving_plan_card',
        dailyBudget: calc.dailyBudget, weeklyBudget: calc.weeklyBudget,
        monthlySpendable: calc.monthlySpendable, feasibility: calc.feasibility,
        riskPoints: llm?.riskPoints ?? riskPoints, nextAction: llm?.nextAction,
      },
      financialState: 'plan_created',
      nextSuggestions: ['复盘今天消费', '修改攒钱目标', '外卖今天能点吗'],
      memoryPatch: { lastEmotion: 'encouraged' },
    };
  }

  /* ── 风险教育 ── */
  if (intent === 'risk_education') {
    const { risk } = workflowData;
    const disclaimer = '本回答仅供理财教育参考，不构成任何投资建议。';
    const reply = checkOutputGuardrail(llm?.reply ?? fallbackRiskReply(risk));
    return {
      intent,
      reply,
      emotionalSupport: llm?.emotionalSupport ?? '了解风险是理财的第一步，比直接入场更重要。',
      summary:          llm?.summary ?? `${workflowData.assetType}，风险等级：${risk.riskLevel}，${risk.suitability}`,
      card: {
        type: 'risk_education_card',
        riskLevel: risk.riskLevel, riskScore: risk.score,
        studentSuitability: risk.suitability,
        reasons:    llm?.reasons    ?? ['本金存在损失风险', '生活费需要保证流动性', '优先建立应急金'],
        nextAction: llm?.nextAction ?? fallbackRiskAction(risk),
        disclaimer,
      },
      financialState,
      nextSuggestions: ['什么是应急金', '货币基金安全吗', '先应该做什么再考虑投资'],
      memoryPatch: { lastEmotion: 'calm' },
    };
  }

  /* ── 投资准备度 ── */
  if (intent === 'investment_readiness') {
    const d = workflowData;
    const disclaimer = '本回答仅用于理财知识教育，不推荐任何具体产品，不构成投资建议。';
    const reply = checkOutputGuardrail(llm?.reply ?? fallbackInvestmentReply(d));
    return {
      intent,
      reply,
      emotionalSupport: llm?.emotionalSupport ?? null,
      summary: llm?.summary ?? `投资准备度：${d.stage}，余额¥${d.remainingBalance}，距月底${d.daysToMonthEnd}天`,
      card: {
        type: 'investment_readiness_card',
        readiness:        d.readiness,
        stage:            d.stage,
        readinessColor:   d.readinessColor,
        remainingBalance: d.remainingBalance,
        daysToMonthEnd:   d.daysToMonthEnd,
        dailyAvg:         d.dailyAvg,
        projectedNeed:    d.projectedNeed,
        shortfall:        d.shortfall,
        cashFlowTight:    d.cashFlowTight,
        hasEmergencyFund: d.hasEmergencyFund,
        investAmount:     d.investAmount,
        nextSteps:        llm?.nextSteps ?? buildDefaultNextSteps(d),
        disclaimer,
      },
      financialState,
      nextSuggestions: ['四个钱袋怎么分？', '货币基金安全吗？', '我现在攒了多少？', '模拟理财是什么？'],
    };
  }

  /* ── 情绪陪伴 ── */
  if (intent === 'emotional_support') {
    const { todayRec } = workflowData;
    const comfortText  = llm?.emotionalSupport ?? defaultAck ?? '先别急，超支一天不代表没有自控力。';
    const nextAction   = llm?.nextAction ?? '把今天的消费发给我，我帮你找一个最容易改的小点。';
    return {
      intent,
      reply:            llm?.reply ?? `${comfortText}\n\n${nextAction}`,
      emotionalSupport: comfortText,
      summary:          llm?.summary ?? `用户情绪：${emotion.label}，${todayRec ? `今日¥${todayRec.total}` : '暂无消费记录'}`,
      card: todayRec ? {
        type: 'expense_review_card',
        total: todayRec.total, overBudget: todayRec.overBudget,
        overAmount: todayRec.overAmount || 0,
        dailyBudget: workflowData.profile?.dailyBudget || 0,
        catTotals: todayRec.catTotals || {}, categories: todayRec.categories || {},
      } : null,
      financialState,
      nextSuggestions: ['复盘今天消费', '帮我重新制定计划', '今天还能花多少'],
      memoryPatch: { lastEmotion: 'encouraged' },
    };
  }

  /* ── 消费分析（历史复盘）── */
  if (intent === 'spending_analysis') {
    const d = workflowData;
    const defaultReply =
      `过去 ${d.period.days} 天你一共花了 ¥${d.totalSpent}，日均 ¥${d.dailyAvg}。\n\n` +
      `分类来看：必要消费 ¥${d.catTotals.necessary}（${d.catPct.necessary}%），` +
      `可优化消费 ¥${d.catTotals.optimizable}（${d.catPct.optimizable}%），` +
      `冲动消费 ¥${d.catTotals.impulsive}（${d.catPct.impulsive}%），` +
      `学习投资 ¥${d.catTotals.learning}（${d.catPct.learning}%）。\n\n` +
      (d.topItems.length > 0 ? `可优化支出主要集中在：${d.topItems.join('、')}。\n\n` : '') +
      (d.daysOver > 0 ? `有 ${d.daysOver} 天超出每日预算，需要重点关注。` : `${d.daysUnder} 天均在预算内，整体还不错！`);

    return {
      intent,
      reply:            llm?.reply ?? defaultReply,
      emotionalSupport: llm?.emotionalSupport ?? '来看看这段时间的数据，没有评判，只是帮你看清楚。',
      summary:          llm?.summary ?? `过去${d.period.days}天日均¥${d.dailyAvg}，可优化占${d.catPct.optimizable}%`,
      card: {
        type:       'spending_analysis_card',
        period:     d.period,
        totalSpent: d.totalSpent,
        dailyAvg:   d.dailyAvg,
        daysOver:   d.daysOver,
        daysUnder:  d.daysUnder,
        catTotals:  d.catTotals,
        catPct:     d.catPct,
        topItems:   d.topItems,
        maxDay:     d.maxDay,
        minDay:     d.minDay,
        insights:   llm?.insights ?? [],
        nextAction: llm?.nextAction,
      },
      financialState,
      nextSuggestions: [
        '这周如何把外卖控制在3次以内',
        '帮我重新制定每日预算',
        '再看看本月余额还剩多少',
        '我的冲动消费怎么改',
      ],
      memoryPatch: { lastEmotion: 'calm' },
    };
  }

  /* ── 月末急救 ── */
  if (intent === 'rescue_mode') {
    const d = workflowData;
    const riskColor = d.riskLevel === '非常紧张' ? 'critical' : d.riskLevel === '偏紧张' ? 'tight' : 'ok';
    return {
      intent,
      reply: llm?.reply ?? `先别慌，¥${d.remaining} 撑 ${d.days} 天，每天上限 ¥${d.dailySurvival}。\n\n必须暂停：${d.stopItems.join('、')}。\n\n今天只做一件事：晚饭食堂解决，不点外卖。`,
      emotionalSupport: llm?.emotionalSupport ?? '先别慌，我们一起把这几天安全撑过去。',
      summary: llm?.summary ?? `¥${d.remaining} 撑 ${d.days} 天，每日 ¥${d.dailySurvival}，${d.riskLevel}`,
      card: {
        type: 'rescue_mode_card',
        remaining: d.remaining,
        days: d.days,
        dailySurvival: d.dailySurvival,
        riskLevel: d.riskLevel,
        riskColor,
        foodBudget: d.foodBudget,
        otherBudget: d.otherBudget,
        stopItems: d.stopItems,
        todayAction: llm?.todayAction ?? '晚饭在食堂解决，不点外卖',
      },
      financialState: d.riskLevel === '非常紧张' ? 'danger' : 'tight',
      nextSuggestions: ['食堂怎么吃最省', '我还有哪些可以临时挣钱的方式', '如果我借钱度过这几天怎么办'],
      memoryPatch: { lastEmotion: 'stressed', rescueMode: true },
    };
  }

  /* ── What-if 推演 ── */
  if (intent === 'what_if') {
    const d = workflowData;
    const isSave = d.changeDirection === 'save';
    const freqLabel = d.freqUnit === 'week' ? '每周' : '每天';
    return {
      intent,
      reply: llm?.reply ?? (
        `如果你${freqLabel}少 ${d.frequency} ${d.itemName === '该消费' ? '次' : `杯/次 ${d.itemName}`}：\n\n` +
        `- 每月约可节省：¥${d.monthlyChange}\n` +
        `- 对你 ¥${d.savingGoal} 目标的贡献：${d.goalImpact}%\n\n` +
        (isSave && d.goalImpact > 20 ? '这个调整影响挺大的，一杯奶茶不起眼，但它可能是你储蓄缺口最大的来源。' : '这个变化对目标影响相对有限，但积少成多。')
      ),
      emotionalSupport: llm?.emotionalSupport ?? '你已经在想正确的问题了，小改变真的可以有大影响。',
      summary: llm?.summary ?? `${freqLabel}少${d.frequency}次${d.itemName} = 月省¥${d.monthlyChange} = 目标${d.goalImpact}%`,
      card: {
        type: 'what_if_card',
        scenario: d.scenario,
        itemName: d.itemName,
        monthlyChange: d.monthlyChange,
        goalImpact: d.goalImpact,
        changeDirection: d.changeDirection,
        savingGoal: d.savingGoal,
        freqLabel,
        frequency: d.frequency,
        insight: llm?.insight,
      },
      financialState,
      nextSuggestions: ['如果我每天少花20元呢', '如果我不点外卖呢', '帮我重新制定每日预算'],
      memoryPatch: { lastEmotion: 'curious' },
    };
  }

  /* ── 冲动消费检测 ── */
  if (intent === 'impulse_check') {
    const d = workflowData;
    const recMsg = { safe: '金额不大，问题不大', cooldown: '建议冷静24小时', plan: '可列入下月计划' };
    return {
      intent,
      reply: llm?.reply ?? (d.recommendation === 'safe'
        ? `¥${d.price} 的${d.itemName}金额不大，不会明显影响你的计划。如果确实需要可以买，今天其他消费注意控一下就好。`
        : `这个${d.itemName} ¥${d.price}${d.equivDays ? `，约等于 ${d.equivDays} 天的日预算` : ''}。${d.affectsGoal ? `会影响你 ¥${d.savingGoal} 攒钱目标的 ${d.goalImpact}%。` : ''}\n\n不是不让你买，建议先放进 24 小时冷静清单，明天还想买再决定。`),
      emotionalSupport: llm?.emotionalSupport ?? '想买是正常的，冷静一下是帮你做更好的决定，不是责备你。',
      summary: llm?.summary ?? `${d.itemName}¥${d.price}，${recMsg[d.recommendation]}，影响目标${d.goalImpact}%`,
      card: {
        type: 'impulse_check_card',
        itemName: d.itemName,
        price: d.price,
        equivDays: d.equivDays,
        goalImpact: d.goalImpact,
        affectsGoal: d.affectsGoal,
        recommendation: d.recommendation,
        cooldownHours: llm?.cooldownHours ?? (d.recommendation === 'cooldown' ? 24 : 0),
        alternativeAction: llm?.alternativeAction ?? (d.recommendation === 'cooldown' ? '先加购物车等24小时' : null),
      },
      financialState,
      nextSuggestions: d.recommendation === 'safe'
        ? ['好，那我买了，帮我记录', '今天还能花多少', '帮我复盘今天消费']
        : ['好的，我先等等', '帮我把它加入下月计划', '有没有平替？'],
      memoryPatch: { lastEmotion: d.recommendation === 'safe' ? 'calm' : 'reflective' },
    };
  }

  /* ── 打卡确认 ── */
  if (intent === 'checkin') {
    return {
      intent,
      reply:            llm?.reply ?? '打卡成功！今天又坚持了一步，这种积累很值钱。',
      emotionalSupport: llm?.emotionalSupport ?? '做到了就是做到了，替你记上！',
      summary:          llm?.summary ?? `用户完成当日小目标打卡，${workflowData.date}`,
      card: {
        type: 'checkin_card',
        date: workflowData.date,
        message: llm?.message ?? '今日目标完成！',
      },
      financialState,
      nextSuggestions: ['今天消费怎么样', '帮我制定明天预算', '帮我复盘今天消费'],
      memoryPatch: { lastEmotion: 'encouraged' },
    };
  }

  /* ── 消费替代方案 ── */
  if (intent === 'spending_alternative') {
    const d = workflowData;
    return {
      intent,
      reply: llm?.reply ?? `关于${d.item}，我帮你想了 4 个替代方案，从最低压力到最大省钱都有，选一个适合自己的就好。`,
      emotionalSupport: llm?.emotionalSupport ?? '不是叫你不花，是帮你换种花法。',
      summary: llm?.summary ?? `${d.item}每月约¥${d.monthlySpend}，提供4种减少方案`,
      card: {
        type: 'alternative_card',
        item: d.item,
        price: d.price,
        monthlySpend: d.monthlySpend,
        alternatives: d.alternatives,
        savingGoal: d.savingGoal,
      },
      financialState,
      nextSuggestions: ['我选方案A（频次减半）', '我选方案D（平替）', '帮我制定本周预算'],
      memoryPatch: { lastEmotion: 'calm' },
    };
  }

  /* ── 追问 / 闲聊 ── */
  return {
    intent: 'follow_up',
    reply:            llm?.reply ?? `我看了你的数据：日预算 ¥${workflowData.profile?.dailyBudget || '--'}。有什么想聊的？`,
    emotionalSupport: defaultAck,
    summary:          llm?.summary ?? '普通闲聊/追问',
    card:             null,
    financialState,
    nextSuggestions: ['帮我做攒钱计划', '复盘今天消费', '问一个理财问题', '我有点焦虑'],
    memoryPatch: {},
  };
}

/* ════════════════════════════════════════════════════════════════
   DB Context Builder
   ════════════════════════════════════════════════════════════════ */
function buildDbContext(profile, spending) {
  const p         = profile;
  const todayStr  = new Date().toISOString().slice(0, 10);
  const thisMonth = todayStr.slice(0, 7);
  const monthRec  = spending.filter(r => r.date.startsWith(thisMonth));
  const totalSpent = monthRec.reduce((s, r) => s + r.total, 0);
  const avg       = monthRec.length ? Math.round(totalSpent / monthRec.length) : null;
  const todayRec  = spending.find(r => r.date === todayStr);

  const lines = ['【用户财务档案（数据库）】'];
  if (p.monthlyIncome)
    lines.push(`月生活费¥${p.monthlyIncome} 固定支出¥${p.fixedExpense||0} 攒钱目标¥${p.savingGoal||0}`);
  if (p.dailyBudget)
    lines.push(`每日预算¥${p.dailyBudget} 每周预算¥${p.weeklyBudget||0} 剩余${p.remainingDays||'?'}天`);
  if (p.monthlySpendable)
    lines.push(`本月可花¥${p.monthlySpendable} 已花¥${totalSpent} 剩余¥${Math.max(0,p.monthlySpendable-totalSpent)}`);
  if (avg)
    lines.push(`本月日均¥${avg}（${monthRec.length}天记录）`);
  if (p.savedAmount != null)
    lines.push(`已攒¥${p.savedAmount||0} 连击${p.streak||0}天`);
  if (todayRec)
    lines.push(`今天¥${todayRec.total}：${todayRec.items?.join('、')||''} ${todayRec.overBudget?`（超支¥${todayRec.overAmount}）`:''}`);

  if (spending.length > 0) {
    lines.push('\n【近14天消费记录】');
    spending.slice(-14).forEach(r =>
      lines.push(`${r.date} ¥${r.total}(${r.overBudget?`超¥${r.overAmount}`:'正常'}) ${r.items?.join(' ')||''}`)
    );
  }

  return lines.join('\n');
}

/* ════════════════════════════════════════════════════════════════
   投资准备度 Workflow — 基于用户真实数据做判断
   ════════════════════════════════════════════════════════════════ */
function buildInvestmentReadiness(msg, profile, spending) {
  const nowDate = new Date();
  const lastDay = new Date(nowDate.getFullYear(), nowDate.getMonth() + 1, 0).getDate();
  const daysToMonthEnd = Math.max(1, lastDay - nowDate.getDate());
  const thisMonth = nowDate.toISOString().slice(0, 7);

  // 本月已花
  const spentThisMonth = spending
    .filter(r => r.date.startsWith(thisMonth))
    .reduce((s, r) => s + r.total, 0);

  // 本月可花余额
  const monthlySpendable = Number(profile.monthlySpendable) || 0;
  const remainingBalance = Math.max(0, monthlySpendable - spentThisMonth);

  // 最近7天日均消费（用于预测后续支出）
  const recent = spending.slice(-7);
  const dailyAvg = recent.length > 0
    ? Math.round(recent.reduce((s, r) => s + r.total, 0) / recent.length)
    : (Number(profile.dailyBudget) || 80);

  // 预计到月底还需要多少钱
  const projectedNeed = dailyAvg * daysToMonthEnd;
  const cashFlowTight = projectedNeed > remainingBalance;
  const shortfall = Math.max(0, projectedNeed - remainingBalance);

  // 应急金判断：savedAmount 是否 >= 半月收入
  const monthlyIncome = Number(profile.monthlyIncome) || 0;
  const savedAmount = Number(profile.savedAmount) || 0;
  const emergencyThreshold = monthlyIncome * 0.5;
  const hasEmergencyFund = savedAmount >= emergencyThreshold && emergencyThreshold > 0;

  // 提取用户提到的投资金额
  const amountMatch = msg.match(/[拿用存放]?\s*(\d+)\s*元?\s*(?:去|来)?(?:买|投|试|放|理财|入|搞)|(\d+)\s*元\s*(?:买|投|试)/);
  const investAmount = amountMatch ? parseInt(amountMatch[1] || amountMatch[2]) : null;
  // 这笔钱占余额的比例（> 30% 视为危险）
  const investRatio = (investAmount && remainingBalance > 0) ? investAmount / remainingBalance : 0;

  // 场景识别
  const isFOMO        = /同学|朋友|别人|看到.*赚|跟.*买|赚了|是不是也|是不是该|跟风/.test(msg);
  const isSmallAmount = investAmount !== null && investAmount <= 100;
  const isWhatStage   = /适合|现在能做|该做什么|从哪开始|入门|阶段|理财阶段|四个钱袋/.test(msg);
  const isProvinceQ   = /省.*(?:能不能|可以).*(?:买|投|理财)|省下来/.test(msg);

  // 准备度评分
  let readiness, stage, readinessColor;
  if (cashFlowTight || !hasEmergencyFund || investRatio > 0.3) {
    readiness = 'not_ready';
    stage = '理财准备期';
    readinessColor = '#ff7043';
  } else if (!cashFlowTight && hasEmergencyFund && remainingBalance > projectedNeed * 1.3) {
    readiness = 'ready';
    stage = '可以考虑入门';
    readinessColor = '#c8ff3a';
  } else {
    readiness = 'marginal';
    stage = '过渡期';
    readinessColor = '#ffd54f';
  }

  return {
    intent: 'investment_readiness',
    // 现金流数据
    remainingBalance,
    daysToMonthEnd,
    dailyAvg,
    projectedNeed,
    spentThisMonth,
    cashFlowTight,
    shortfall,
    monthlySpendable,
    // 应急金
    hasEmergencyFund,
    savedAmount,
    monthlyIncome,
    emergencyThreshold,
    // 投资意向
    investAmount,
    investRatio: Math.round(investRatio * 100),
    // 场景
    isFOMO,
    isSmallAmount,
    isWhatStage,
    isProvinceQ,
    // 评估结论
    readiness,
    stage,
    readinessColor,
    dailyBudget: Number(profile.dailyBudget) || 0,
  };
}

/* ════════════════════════════════════════════════════════════════
   月末急救 Workflow
   ════════════════════════════════════════════════════════════════ */
function buildRescueMode(msg, profile) {
  // 提取剩余金额和天数
  const amtMatch  = msg.match(/(?:还剩|剩余|只剩|剩下|有)[^\d]*(\d+)\s*[元块]/);
  const dayMatch  = msg.match(/(\d+)\s*[天日]/);

  const remaining = amtMatch ? Number(amtMatch[1]) : null;
  const days      = dayMatch ? Number(dayMatch[1]) : null;

  if (!remaining || !days) {
    return {
      needsMoreInfo: true,
      askMessage: '我来帮你规划急救预算！告诉我两个数字：\n\n① 现在还剩多少钱？\n② 距离月底还有几天？\n\n比如："还剩180元，要撑7天"',
      suggestions: ['还剩180元，要撑7天', '还剩300元，还有10天'],
    };
  }

  const dailySurvival  = Math.floor(remaining / days);
  const riskLevel      = dailySurvival < 20 ? '非常紧张' : dailySurvival < 40 ? '偏紧张' : '尚可控';
  const foodBudget     = Math.round(dailySurvival * 0.7);  // 70% 给食物
  const otherBudget    = dailySurvival - foodBudget;

  // 必须停止项目
  const stopItems = [];
  if (dailySurvival < 40) stopItems.push('外卖', '奶茶', '打车');
  else if (dailySurvival < 60) stopItems.push('外卖', '奶茶');
  else stopItems.push('非必要购物');

  return {
    intent: 'rescue_mode',
    remaining, days, dailySurvival, riskLevel,
    foodBudget, otherBudget, stopItems,
    canSurvive: dailySurvival >= 15,
  };
}

/* ════════════════════════════════════════════════════════════════
   What-if 推演 Workflow
   ════════════════════════════════════════════════════════════════ */
function buildWhatIf(msg, profile) {
  // 解析场景：每周少X杯奶茶/少点X次外卖/每天少花X元
  const ITEMS = {
    '奶茶': 16, '咖啡': 22, '外卖': 35, '打车': 20, '零食': 12, '游戏': 50,
  };

  let itemName = '', unitPrice = 0, frequency = 1, freqUnit = 'week';
  let changeAmount = 0; // 正数=少花，负数=多花
  let changeDirection = 'save'; // save | spend

  // 匹配"每周少/不 X杯/次 奶茶/外卖"
  const weekMatch = msg.match(/每周(?:少|不|省|减少)?(\d+)?(?:杯|次|元)?\s*([^\s，,？?！!]+)/);
  const dayMatch  = msg.match(/每天(?:少|多|省|减少|多花)?(\d+)?(?:杯|次|元)/);
  const priceMatch = msg.match(/[¥￥]?(\d+)元/);
  const multiMatch = msg.match(/(\d+)[杯次]/);

  // 识别物品
  for (const [name, price] of Object.entries(ITEMS)) {
    if (msg.includes(name)) { itemName = name; unitPrice = price; break; }
  }

  // 识别数量和价格
  const cnt = multiMatch ? Number(multiMatch[1]) : 1;
  if (priceMatch) unitPrice = Number(priceMatch[1]);

  if (/每周/.test(msg))       { frequency = cnt; freqUnit = 'week'; }
  else if (/每天/.test(msg))  { frequency = cnt; freqUnit = 'day';  }
  else { frequency = cnt; freqUnit = 'week'; }

  if (/多花|多买|多点/.test(msg)) changeDirection = 'spend';

  // 计算月度影响
  const weeksPerMonth = 4.3;
  const weeklyChange  = freqUnit === 'week' ? frequency * unitPrice : frequency * unitPrice * 7;
  const monthlyChange = Math.round(weeklyChange * (freqUnit === 'week' ? weeksPerMonth : 1));

  const savingGoal    = profile.savingGoal || 600;
  const goalImpact    = savingGoal > 0 ? Math.round((monthlyChange / savingGoal) * 100) : 0;

  // 如果没有识别到有效场景
  if (!unitPrice || !monthlyChange) {
    return {
      needsMoreInfo: true,
      askMessage: '我来帮你算一下！可以告诉我具体场景吗？比如：\n\n"如果我每周少喝3杯奶茶（每杯16元）"\n"如果我每天少花20元"\n"如果我不再点外卖"',
      suggestions: ['如果我每周少喝3杯奶茶', '如果我每天少花20元', '如果我不点外卖'],
    };
  }

  return {
    intent: 'what_if',
    scenario: msg,
    itemName: itemName || '该消费',
    unitPrice, frequency, freqUnit,
    weeklyChange, monthlyChange, goalImpact,
    changeDirection,
    savingGoal,
  };
}

/* ════════════════════════════════════════════════════════════════
   冲动消费检测 Workflow
   ════════════════════════════════════════════════════════════════ */
function buildImpulseCheck(msg, profile) {
  // 提取商品名称和价格
  const priceMatch = msg.match(/[¥￥]?(\d+(?:\.\d+)?)/);
  const price      = priceMatch ? Number(priceMatch[1]) : 0;

  // 提取商品名称（"想买"后面的内容）
  const itemMatch  = msg.match(/(?:想买|要买|准备买|打算买|入手|下单)[一个个件台只条块]?\s*(.{2,15}?)(?:[，,。！!？?\d]|$)/);
  const itemName   = itemMatch ? itemMatch[1].trim() : '这件商品';

  if (!price) {
    return {
      needsMoreInfo: true,
      askMessage: `我来帮你做个冷静期检测！告诉我：\n\n① 你想买什么？\n② 大概多少钱？\n\n比如："我想买一个399元的耳机"`,
      suggestions: ['我想买一个399元的耳机', '我想买一件衣服200元'],
    };
  }

  const dailyBudget = profile.dailyBudget || 0;
  const savingGoal  = profile.savingGoal  || 0;

  // 判断是否大额（> 日预算×3）
  const isLarge     = dailyBudget > 0 && price > dailyBudget * 3;
  // 判断是否影响攒钱目标（占目标>20%）
  const goalImpact  = savingGoal > 0 ? Math.round(price / savingGoal * 100) : 0;
  const affectsGoal = goalImpact > 20;

  // 等效天数
  const equivDays   = dailyBudget > 0 ? (price / dailyBudget).toFixed(1) : null;

  // 推荐行动
  let recommendation;
  if (price < 50) {
    recommendation = 'safe'; // 小额，影响不大
  } else if (isLarge || affectsGoal) {
    recommendation = 'cooldown'; // 建议24小时冷静期
  } else {
    recommendation = 'plan'; // 可以买，但建议列入计划
  }

  return {
    intent: 'impulse_check',
    itemName, price, isLarge,
    goalImpact, affectsGoal, equivDays,
    recommendation, dailyBudget, savingGoal,
  };
}

/* ════════════════════════════════════════════════════════════════
   消费分析 Workflow — 自动从 DB 拉数据，无需用户提供
   ════════════════════════════════════════════════════════════════ */
function buildSpendingAnalysis(msg, spending, profile) {
  if (spending.length === 0) {
    return {
      needsMoreInfo: true,
      askMessage: '数据库里还没有消费记录。你可以先把今天的消费发给我，比如：食堂18，奶茶16，外卖35。记录够了我就能帮你做完整复盘。',
      suggestions: ['食堂18，奶茶16，外卖35', '帮我做攒钱计划'],
    };
  }

  // ── 解析时间范围 ──────────────────────────────────────────────
  const today    = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  let days = 14; // 默认半个月
  if (/这周|本周|7天|一周/.test(msg))  days = 7;
  if (/这月|本月|30天/.test(msg))       days = 30;
  if (/半个月|15天/.test(msg))          days = 15;
  if (/3天|三天/.test(msg))             days = 3;

  const cutoff   = new Date(today);
  cutoff.setDate(today.getDate() - days + 1);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const records = spending.filter(r => r.date >= cutoffStr && r.date <= todayStr);
  if (records.length === 0) {
    return {
      needsMoreInfo: true,
      askMessage: `我查了过去 ${days} 天的记录，数据库里还没有这段时间的消费。你可以先发今天的消费给我，比如：食堂18，奶茶16。`,
      suggestions: ['食堂18，奶茶16，外卖35'],
    };
  }

  // ── 聚合计算 ─────────────────────────────────────────────────
  const totalSpent  = records.reduce((s, r) => s + r.total, 0);
  const dailyAvg    = Math.round(totalSpent / records.length);
  const daysOver    = records.filter(r => r.overBudget).length;
  const daysUnder   = records.length - daysOver;
  const maxDay      = records.reduce((a, b) => a.total > b.total ? a : b);
  const minDay      = records.reduce((a, b) => a.total < b.total ? a : b);
  const budget      = profile.dailyBudget || 0;

  // 分类汇总
  const catTotals = { necessary: 0, optimizable: 0, impulsive: 0, learning: 0 };
  const catItems  = { necessary: [], optimizable: [], impulsive: [], learning: [] };
  for (const r of records) {
    if (r.catTotals) {
      for (const k of Object.keys(catTotals)) {
        catTotals[k] += (r.catTotals[k] || 0);
      }
    }
    if (r.items) {
      // 简单按关键词归类（已在 expense.js 分类过了，从 categories 字段读）
      if (r.categories) {
        for (const [cat, items] of Object.entries(r.categories)) {
          if (catItems[cat]) catItems[cat].push(...items);
        }
      }
    }
  }

  // 各类占比
  const catPct = {};
  for (const [k, v] of Object.entries(catTotals)) {
    catPct[k] = totalSpent > 0 ? Math.round(v / totalSpent * 100) : 0;
  }

  // 最大可优化项（前3）
  const topOptimizable = catItems.optimizable.slice(0, 10)
    .reduce((acc, item) => {
      const match = item.match(/(.+?)¥(\d+)/);
      if (match) {
        const name = match[1].trim();
        const amt  = Number(match[2]);
        acc[name]  = (acc[name] || 0) + amt;
      }
      return acc;
    }, {});

  const topItems = Object.entries(topOptimizable)
    .sort(([,a],[,b]) => b - a)
    .slice(0, 3)
    .map(([name, amt]) => `${name}¥${amt}`);

  // 估算本月预算执行情况
  const budgetContext = budget > 0
    ? `每日预算¥${budget}，${days}天累计预算¥${budget * days}，实际花了¥${totalSpent}，${totalSpent > budget * days ? `超出¥${totalSpent - budget * days}` : `节省¥${budget * days - totalSpent}`}`
    : '暂未设置每日预算';

  return {
    intent:      'spending_analysis',
    period:      { days, cutoffStr, todayStr, recordCount: records.length },
    totalSpent,
    dailyAvg,
    daysOver,
    daysUnder,
    maxDay:      { date: maxDay.date, total: maxDay.total },
    minDay:      { date: minDay.date, total: minDay.total },
    catTotals,
    catPct,
    topItems,
    budgetContext,
    records,
    profile,
  };
}

/* ════════════════════════════════════════════════════════════════
   预算弹性区间计算
   ════════════════════════════════════════════════════════════════ */
function calcBudgetZone(total, budget) {
  if (!budget) return { zone: 'unknown', label: '未设置预算', color: '#9a9a96' };
  const ratio = total / budget;
  if (ratio <= 0.9)  return { zone: 'green',  label: '绿色区', color: '#16b86c', ratio, gapAmount: Math.round(budget * 0.9 - total) };
  if (ratio <= 1.25) return { zone: 'yellow', label: '黄色区', color: '#ff9800', ratio, overAmount: Math.round(total - budget * 0.9), recoveryAmount: Math.round(total - budget * 0.9) };
  return               { zone: 'red',    label: '红色区', color: '#e53935', ratio, overAmount: Math.round(total - budget) };
}

/* ════════════════════════════════════════════════════════════════
   消费替代方案 Workflow
   ════════════════════════════════════════════════════════════════ */
function buildSpendingAlternative(msg, profile) {
  const ITEMS = {
    '奶茶': { price: 20, unit: '杯', perWeek: 5, alt: '便利店饮料（约5元）' },
    '外卖': { price: 35, unit: '次', perWeek: 5, alt: '食堂打包' },
    '咖啡': { price: 22, unit: '杯', perWeek: 5, alt: '速溶咖啡（约2元）' },
    '打车': { price: 25, unit: '次', perWeek: 3, alt: '公交/地铁' },
    '零食': { price: 15, unit: '次', perWeek: 5, alt: '水果替代' },
  };

  let item = '', itemData = null;
  for (const [name, data] of Object.entries(ITEMS)) {
    if (msg.includes(name)) { item = name; itemData = data; break; }
  }

  if (!item) {
    return {
      needsMoreInfo: true,
      askMessage: '你说的是哪种消费？告诉我具体是什么，比如奶茶、外卖、咖啡，我来帮你想替代方案。',
      suggestions: ['我总是想喝奶茶', '我戒不掉外卖', '我每天都要喝咖啡'],
    };
  }

  const { price, unit, perWeek, alt } = itemData;
  const monthlySpend = Math.round(price * perWeek * 4.3);
  const savingGoal = profile.savingGoal || 600;

  const alternatives = [
    { plan:'A', label:'频次减半',  desc:`每周从 ${perWeek} ${unit}降到 ${Math.ceil(perWeek/2)} ${unit}`, monthlySaving: Math.round(monthlySpend * 0.5),  pressure:'低' },
    { plan:'B', label:'规格降级',  desc:`${item==='奶茶'?'大杯换中杯，每杯省约5元':item==='外卖'?'换便利店简餐':'降一个规格'}`, monthlySaving: Math.round(price * 0.25 * perWeek * 4.3), pressure:'极低' },
    { plan:'C', label:'奖励制',    desc:`只在完成本周预算时奖励自己一${unit}，其余换替代品`, monthlySaving: Math.round(monthlySpend * 0.6), pressure:'中' },
    { plan:'D', label:'平替方案',  desc:`换成${alt}，每次约省${Math.round(price * 0.7)}元`, monthlySaving: Math.round(price * 0.7 * perWeek * 4.3), pressure:'高' },
  ];

  return { intent: 'spending_alternative', item, price, unit, perWeek, monthlySpend, alternatives, savingGoal };
}

/* ════════════════════════════════════════════════════════════════
   工具函数
   ════════════════════════════════════════════════════════════════ */
function detectAssetType(msg) {
  if (/虚拟|数字货币|比特|ETH|BTC|买币|炒币/i.test(msg)) return '虚拟资产';
  if (/股票|炒股|A股|港股|美股/i.test(msg)) return '股票';
  if (/基金|指数|ETF/i.test(msg)) return '基金';
  if (/货币基金|余额宝|零钱通/i.test(msg)) return '货币基金';
  if (/借钱|贷款|网贷|杠杆/i.test(msg)) return '借贷投资';
  return '未知类型';
}

function fallbackRiskReply(risk) {
  const map = {
    extreme: '不建议用生活费参与，风险极高，短期可能亏损50%以上，生活费是不可承受损失的钱。',
    high:    '高风险资产不建议用生活费直接参与，先建立预算和应急金再考虑。',
    medium:  '可以先了解学习，但不建议用生活费重仓，建议先建立应急金。',
    medium_low: '风险相对较低，可以了解学习，但仍要保证生活费流动性。',
    low:     '风险较低，适合学习了解，建议从小额闲置资金开始，不用生活费。',
  };
  return (map[risk.level] ?? map.medium) + '\n\n本回答仅供理财教育参考，不构成任何投资建议。';
}

function fallbackRiskAction(risk) {
  if (risk.level === 'extreme' || risk.level === 'high') return '先存够1个月生活费的应急金，再考虑其他';
  if (risk.level === 'medium') return '先了解基础知识，等有结余再考虑';
  return '可以把短期闲置资金了解一下货币基金';
}

function fallbackInvestmentReply(d) {
  if (d.isFOMO) {
    return `看到同学赚钱会有这种感觉，很正常——但你的情况和他不一定一样。\n\n从你的数据看，你还剩 ¥${d.remainingBalance}，距月底还有 ${d.daysToMonthEnd} 天，最近日均消费约 ¥${d.dailyAvg}，预计还需要 ¥${d.projectedNeed} 才能撑到月底。${d.cashFlowTight ? '现金流偏紧，这笔钱更像是生活费。' : '现金流还算稳定。'}\n\n先做投资前3问：这笔钱是生活费吗？有单独应急金吗？亏损会影响生活吗？——${d.readiness === 'not_ready' ? '目前三问都还没通过，不建议现在真实投入。' : '还需确认应急金情况。'}\n\n别人赚钱，最适合的行动是：学习他为什么赚钱，而不是立刻跟进。\n\n本回答仅用于理财知识教育，不构成投资建议。`;
  }
  if (d.investAmount) {
    const isLifeMoney = d.cashFlowTight || d.investRatio > 30;
    return `我先不说买不买，先看你的钱包状态。你还剩 ¥${d.remainingBalance}，距月底 ${d.daysToMonthEnd} 天，日均消费约 ¥${d.dailyAvg}，预计还需要 ¥${d.projectedNeed}。${isLifeMoney ? `你提到的 ¥${d.investAmount} 已经占余额的 ${d.investRatio}%，这更像是生活费，不是真正的闲钱。` : `¥${d.investAmount} 占余额比例还好，但要先确认应急金是否到位。`}\n\n建议：${d.readiness === 'not_ready' ? '先稳住现金流，建立 300-500 元应急金，暂不建议真实投入。' : '可以先用模拟理财了解波动，再决定是否真实投入。'}\n\n本回答仅用于理财知识教育，不构成投资建议。`;
  }
  return `按你当前数据：余额 ¥${d.remainingBalance}，距月底 ${d.daysToMonthEnd} 天，日均 ¥${d.dailyAvg}，预计还需 ¥${d.projectedNeed}。\n\n当前阶段：${d.stage}。${d.readiness === 'not_ready' ? '现金流偏紧，建议先完成四个钱袋分配：生活钱袋 → 应急钱袋（300-500元）→ 目标钱袋 → 学习钱袋，而不是直接进入投资。' : '现金流相对稳定，可以先了解货币基金，但建议先确认应急金是否足够。'}\n\n本回答仅用于理财知识教育，不构成投资建议。`;
}

function buildDefaultNextSteps(d) {
  if (d.readiness === 'not_ready') {
    return ['先把每日消费稳住，别超过 ¥' + d.dailyBudget, '建立 300-500 元应急钱袋', '学习：货币基金是什么', '用模拟理财感受基金波动'];
  }
  if (d.readiness === 'marginal') {
    return ['先补足应急金到 1 个月生活费', '了解货币基金，可用于存放应急金', '用小额模拟体验基金涨跌', '等结余稳定后再考虑真实投入'];
  }
  return ['了解货币基金，适合存放短期闲置资金', '学习指数基金基础知识', '用净结余的一小部分做模拟理财', '记住：不构成投资建议，只是学习'];
}

module.exports = router;
