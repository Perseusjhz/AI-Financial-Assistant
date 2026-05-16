import knowledgeBase from '../data/knowledge.json';

interface KnowledgeItem {
  id: string;
  title: string;
  tags: string[];
  content: string;
}

const MODE_TAGS: Record<string, string[]> = {
  saving_plan: ['budget', 'saving', 'emergency', 'student', 'planning'],
  expense_review: ['expense', 'classification', 'optimization', 'student'],
  risk_education: ['risk', 'investment', 'guardrail', 'education'],
  general: ['student', 'budget', 'saving', 'tone'],
};

export function retrieveKnowledge(mode: string, userText: string, topK = 3): string {
  const items = knowledgeBase as KnowledgeItem[];
  const targetTags = MODE_TAGS[mode] || MODE_TAGS.general;

  const scored = items.map((item) => {
    let score = 0;

    for (const tag of item.tags) {
      if (targetTags.includes(tag)) score += 2;
    }

    const lowerText = userText.toLowerCase();
    const combined = (item.content + item.title).toLowerCase();
    const chunkKeywords = ['攒钱', '预算', '消费', '外卖', '奶茶', '风险', '基金', '股票', '应急金'];
    for (const kw of chunkKeywords) {
      if (lowerText.includes(kw) && combined.includes(kw)) score += 1;
    }

    return { item, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const top = scored.slice(0, topK).filter((s) => s.score > 0);
  if (top.length === 0) return '';

  return top.map((s) => `【${s.item.title}】\n${s.item.content}`).join('\n\n');
}
