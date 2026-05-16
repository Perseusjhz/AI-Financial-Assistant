'use strict';

const knowledge = require('../data/knowledge.json');

// Mode → preferred tag set mapping
const MODE_TAGS = {
  saving_plan: ['budget', 'saving', 'student', 'goal', 'planning'],
  expense_review: ['expense', 'classification', 'optimization', 'student'],
  risk_education: ['risk', 'investment', 'guardrail', 'education'],
  chat: ['tone', 'non_marketing', 'saving', 'budget'],
};

/**
 * Retrieve the top-k most relevant knowledge chunks.
 *
 * Scoring:
 *  +2 per matching mode tag
 *  +1 per query keyword found in content
 */
function retrieve(mode, query = '', k = 3) {
  const targetTags = MODE_TAGS[mode] ?? MODE_TAGS.chat;

  // Allow callers to inject extra tags (e.g. risk-level-specific tags)
  const scored = knowledge.map((item) => {
    let score = 0;
    for (const tag of item.tags) {
      if (targetTags.includes(tag)) score += 2;
    }
    if (query) {
      const words = query.split(/[\s，,、。？?！!]+/).filter((w) => w.length > 1);
      for (const word of words) {
        if (item.content.includes(word) || item.title.includes(word)) score += 1;
      }
    }
    return { ...item, score };
  });

  return scored
    .filter((i) => i.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((i) => i.content);
}

/**
 * Retrieve with explicit extra tags (used by risk education with risk-level tags).
 */
function retrieveWithTags(extraTags, query = '', k = 3) {
  const scored = knowledge.map((item) => {
    let score = 0;
    for (const tag of item.tags) {
      if (extraTags.includes(tag)) score += 2;
    }
    if (query) {
      const words = query.split(/[\s，,、。？?！!]+/).filter((w) => w.length > 1);
      for (const word of words) {
        if (item.content.includes(word) || item.title.includes(word)) score += 1;
      }
    }
    return { ...item, score };
  });

  return scored
    .filter((i) => i.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((i) => i.content);
}

module.exports = { retrieve, retrieveWithTags };
