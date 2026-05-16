'use strict';

/**
 * Emotion Detector — 从用户消息识别情绪状态
 *
 * 返回情绪类型，用于：
 *  1. 触发 emotional_support 意图
 *  2. 调整 LLM temperature 和回复策略
 *  3. 写入 memoryPatch.lastEmotion
 */

const EMOTION_RULES = [
  {
    type: 'anxious',        // 焦虑
    label: '焦虑',
    keywords: ['焦虑', '慌', '担心', '怕', '不安', '害怕', '好怕', '好慌'],
  },
  {
    type: 'frustrated',     // 挫败
    label: '挫败',
    keywords: ['失败', '坚持不了', '放弃', '崩了', '坚持不住', '没用', '算了'],
  },
  {
    type: 'guilty',         // 自责
    label: '自责',
    keywords: ['我又', '管不住', '自责', '我太差', '真没用', '又超支', '又花多了'],
  },
  {
    type: 'stressed',       // 压力
    label: '压力',
    keywords: ['没钱', '撑不到', '不够用', '月末', '快没了', '借钱', '还剩几天'],
  },
  {
    type: 'comparing',      // 比较焦虑
    label: '比较焦虑',
    keywords: ['别人', '同学', '朋友都', '大家都', '都在买', '错过了'],
  },
];

/**
 * 检测情绪，返回 {type, label, intensity}
 * intensity: 'mild' | 'moderate' | 'strong'
 */
function detectEmotion(text) {
  let matched = null;
  let matchCount = 0;

  for (const rule of EMOTION_RULES) {
    const hits = rule.keywords.filter(kw => text.includes(kw)).length;
    if (hits > matchCount) {
      matchCount = hits;
      matched = rule;
    }
  }

  if (!matched) return { type: 'neutral', label: '平静', intensity: 'mild' };

  return {
    type:      matched.type,
    label:     matched.label,
    intensity: matchCount >= 3 ? 'strong' : matchCount === 2 ? 'moderate' : 'mild',
  };
}

/**
 * 根据情绪类型和强度，返回情绪承接短句（注入 prompt 或直接显示）
 */
function emotionAcknowledgement(emotion) {
  const map = {
    anxious:    ['先深呼吸一下，钱的事没有你想的那么急。', '别慌，我们慢慢来，先看清楚再说。'],
    frustrated: ['这不是失败，只是需要调整方向。', '能坚持到现在已经不容易了，继续的。'],
    guilty:     ['别这样否定自己，超支一次不代表你没有自控力。', '先别急着自责，我们找一个最容易改的小点。'],
    stressed:   ['先稳住，我们先算清楚这几天怎么度过，一步一步来。', '没关系，先把剩余的钱分好，安全撑到月底。'],
    comparing:  ['看到别人赚钱会焦虑很正常，但你不需要跟别人的节奏走。', '别人的情况和你的不一样，先保护好自己的现金流更重要。'],
    neutral:    ['好的，我们来看看。', '明白，我帮你想一下。'],
  };

  const options = map[emotion.type] || map.neutral;
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * 根据财务情况推断财务状态
 */
function assessFinancialState(profile, todaySpent) {
  if (!profile.dailyBudget) return 'unknown';
  if (!todaySpent && todaySpent !== 0) return 'plan_created';

  const ratio = todaySpent / profile.dailyBudget;
  if (ratio > 1.2) return 'over_budget';
  if (ratio > 0.9) return 'near_limit';
  return 'under_budget';
}

module.exports = { detectEmotion, emotionAcknowledgement, assessFinancialState };
