import { ExpenseReviewResult, ExpenseCategories } from '../types';
import { callLLM, isDemoMode } from '../llm';
import { retrieveKnowledge } from '../rag';

const SYSTEM_PROMPT = `你是"攒钱搭子 AI"，帮助大学生复盘消费。
从用户输入提取消费项和金额，按分类规则分类。必须用 JSON 格式输出。
分类：必要(necessary)=食堂/地铁/话费/生活用品，可优化(optimizable)=外卖/奶茶/打车/零食/咖啡，冲动(impulsive)=游戏充值/盲盒/非计划购物，学习(learning)=教材/课程/考试/打印。`;

function parseExpensesLocally(text: string): { items: Array<{ name: string; amount: number }>; total: number } {
  // Simple regex-based extraction: "项目名称+数字"
  const patterns = [
    /([^\d，,、\s]+?)\s*(\d+(?:\.\d+)?)\s*[元块]?/g,
    /(\d+(?:\.\d+)?)\s*[元块]?\s*([^\d，,、\s]+)/g,
  ];

  const items: Array<{ name: string; amount: number }> = [];
  const seen = new Set<string>();

  let match;
  const re = /([^\d，,、\s。！？]+?)\s*(\d+(?:\.\d+)?)/g;
  while ((match = re.exec(text)) !== null) {
    const name = match[1].replace(/[，,、]/g, '').trim();
    const amount = parseFloat(match[2]);
    if (name && amount > 0 && amount < 10000 && !seen.has(name)) {
      seen.add(name);
      items.push({ name, amount });
    }
  }

  const total = items.reduce((s, i) => s + i.amount, 0);
  return { items, total };
}

function classifyLocally(items: Array<{ name: string; amount: number }>): ExpenseCategories {
  const necessary: string[] = [];
  const optimizable: string[] = [];
  const impulsive: string[] = [];
  const learning: string[] = [];

  const rules: Array<{ pattern: RegExp; category: 'necessary' | 'optimizable' | 'impulsive' | 'learning' }> = [
    { pattern: /食堂|饭堂|学校饭|宿舍水电|话费|电话费|地铁|公交|生活用品|卫生纸|洗漱/, category: 'necessary' },
    { pattern: /外卖|奶茶|打车|滴滴|零食|咖啡|快餐|饮品|果汁|可乐|薯片/, category: 'optimizable' },
    { pattern: /游戏|充值|盲盒|手办|非计划|冲动|直播打赏|彩票/, category: 'impulsive' },
    { pattern: /教材|书|课程|考试|打印|复印|文具|资料|培训|报名/, category: 'learning' },
  ];

  for (const item of items) {
    const label = `${item.name}${Math.round(item.amount)}`;
    let matched = false;
    for (const rule of rules) {
      if (rule.pattern.test(item.name)) {
        if (rule.category === 'necessary') necessary.push(label);
        else if (rule.category === 'optimizable') optimizable.push(label);
        else if (rule.category === 'impulsive') impulsive.push(label);
        else if (rule.category === 'learning') learning.push(label);
        matched = true;
        break;
      }
    }
    if (!matched) optimizable.push(label);
  }

  return { necessary, optimizable, impulsive, learning };
}

export async function runExpenseReviewWorkflow(
  text: string,
  dailyBudget?: number
): Promise<ExpenseReviewResult> {
  const { items, total: localTotal } = parseExpensesLocally(text);
  const localCategories = classifyLocally(items);

  if (isDemoMode()) {
    const overBudget = dailyBudget ? localTotal > dailyBudget : undefined;
    const impulsiveTotal = localCategories.impulsive.reduce((s, i) => {
      const m = i.match(/\d+/);
      return s + (m ? parseInt(m[0]) : 0);
    }, 0);
    const optimizableTotal = localCategories.optimizable.reduce((s, i) => {
      const m = i.match(/\d+/);
      return s + (m ? parseInt(m[0]) : 0);
    }, 0);

    let mainRisk = '消费结构合理';
    if (impulsiveTotal > 0) mainRisk = `冲动消费占 ${impulsiveTotal} 元，下次可以控制`;
    else if (optimizableTotal > localTotal * 0.5) mainRisk = `可优化消费占比偏高（${optimizableTotal} 元）`;

    const nextAction = localCategories.impulsive.length > 0
      ? '明天避免游戏充值等冲动消费'
      : localCategories.optimizable.length > 0
        ? '明天试试用食堂替代一次外卖，省约20元'
        : '今天消费很合理，继续保持！';

    let reply = `今天总支出 ${localTotal} 元。`;
    if (overBudget) reply += `超出每日预算 ${localTotal - (dailyBudget || 0)} 元。`;
    else if (dailyBudget) reply += `在预算范围内，很好！`;
    reply += mainRisk === '消费结构合理' ? '消费结构还不错，' : `${mainRisk}，`;
    reply += nextAction;

    return {
      type: 'expense_review_result',
      total: localTotal,
      dailyBudget,
      overBudget,
      categories: localCategories,
      mainRisk,
      nextAction,
      reply,
    };
  }

  const knowledge = retrieveKnowledge('expense_review', text);

  const prompt = `用户的今日消费记录：
"${text}"

每日参考预算：${dailyBudget ? dailyBudget + '元' : '未设定'}

本地初步解析（供参考）：
总计：${localTotal}元
已分类：${JSON.stringify(localCategories)}

参考分类知识：
${knowledge}

请重新解析并输出更准确的 JSON：
{
  "total": 数字,
  "overBudget": true/false（如无预算则省略此字段）,
  "categories": {
    "necessary": ["项目+金额"],
    "optimizable": ["项目+金额"],
    "impulsive": ["项目+金额"],
    "learning": ["项目+金额"]
  },
  "mainRisk": "主要风险点，20字以内",
  "nextAction": "明日行动建议，20字以内",
  "reply": "60-90字的整体回复，学生化语气，指出主要问题，给一个具体建议"
}`;

  const raw = await callLLM(SYSTEM_PROMPT, prompt, true);
  let parsed: Partial<ExpenseReviewResult> = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = {};
  }

  const total = (typeof parsed.total === 'number' && parsed.total > 0) ? parsed.total : localTotal;
  const overBudget = dailyBudget ? total > dailyBudget : parsed.overBudget;

  return {
    type: 'expense_review_result',
    total,
    dailyBudget,
    overBudget,
    categories: parsed.categories || localCategories,
    mainRisk: parsed.mainRisk || '检查高频小额消费',
    nextAction: parsed.nextAction || '明天减少一次外卖或奶茶',
    reply: parsed.reply || `今天总支出 ${total} 元，${overBudget ? '超出预算，' : ''}重点关注可优化消费。`,
  };
}

export function buildExpenseReviewState(result: ExpenseReviewResult) {
  return {
    todaySpent: result.total,
    lastReview: {
      total: result.total,
      overBudget: result.overBudget,
      date: new Date().toDateString(),
      categories: result.categories,
      mainRisk: result.mainRisk,
      nextAction: result.nextAction,
    },
  };
}
