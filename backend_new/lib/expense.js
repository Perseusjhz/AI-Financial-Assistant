'use strict';

// Keyword → category mapping (checked in order; first match wins)
const CATEGORY_MAP = [
  {
    key: 'learning',
    keywords: [
      // 学习材料
      '教材', '课本', '参考书', '笔记本', '文具', '打印', '复印', '讲义', '资料费',
      // 课程 & 考试
      '课程', '网课', '慕课', '培训', '考试费', '报名费', '报名', '四六级', '考研', '托福', '雅思', '普通话',
      '实习', '实验', '专业课',
      // 知识付费
      '得到', '知识星球', '编程课', '学编程', '学习',
    ],
  },
  {
    key: 'impulsive',
    keywords: [
      // 游戏娱乐
      '游戏', '游戏充值', '手游', '端游', '皮肤', '装备', '盲盒', '彩票',
      // 演出 & 票务
      '演唱会', '演出票', '音乐节', '话剧', 'KTV', 'k歌', '密室', '剧本杀',
      // 时尚 & 美容
      '化妆品', '口红', '粉底', '眼影', '美甲', '美睫', '染发', '烫发', '美容', '护肤品', '香水', '香氛',
      // 时尚单品
      '潮玩', '手办', '周边', '潮牌', '限量', '联名款', '球鞋', '饰品', '首饰', '耳环', '戒指', '项链',
      // 直播 & 打赏
      '直播', '打赏', '礼物',
      // 网购冲动
      '网购', '淘宝', '拼多多', '直播购',
      // 酒类 & 夜生活
      '酒吧', '酒水', '红酒', '啤酒', '清吧', '夜店',
    ],
  },
  {
    key: 'optimizable',
    keywords: [
      // 外卖 & 咖啡奶茶
      '外卖', '奶茶', '咖啡', '下午茶', '冰淇淋', '雪糕', '果茶', '茶饮',
      // 连锁快餐
      '肯德基', 'KFC', '麦当劳', '汉堡王', '必胜客', '星巴克', '瑞幸', '喜茶', '蜜雪', '古茗', '茶百道',
      '一点点', '沪上阿姨', '书亦', '霸王茶姬',
      // 其他可优化餐饮
      '甜点', '糕点', '零食', '薯片', '饼干', '泡面', '辣条', '坚果', '糖果', '饮料', '果汁', '可乐', '汽水',
      // 打车 & 出行
      '打车', '滴滴', '嘀嗒', '曹操', '花小猪', '出租车',
      // 烧烤 & 聚餐 & 夜宵
      '烧烤', '烤肉', '串串', '聚餐', '请客', '火锅', '自助餐', '网红餐厅', '炸鸡', '汉堡', '披萨', '寿司',
      '夜宵', '宵夜',
      // 娱乐休闲
      '电影', '电影票', '剧本', '健身房', '游泳', '羽毛球', '乒乓球',
      // 订阅 & 会员
      '会员', '订阅', '爱奇艺', '优酷', '腾讯视频', '哔哩哔哩', 'b站', '网飞', 'spotify', '音乐',
    ],
  },
  {
    key: 'necessary',
    keywords: [
      // 餐饮必要
      '食堂', '菜', '饭', '早餐', '午餐', '晚餐', '米饭', '面条', '包子', '饺子', '粥', '菜市场', '买菜',
      '水果', '牛奶', '鸡蛋', '面包', '超市', '便利店',
      // 交通必要
      '地铁', '公交', '公共交通', '交通卡', '共享单车', '骑行', '高铁', '火车票', '返校', '回家',
      // 通讯 & 网络
      '话费', '手机费', '流量', '宽带', '网费', '充值', '联通', '移动', '电信',
      // 住宿 & 水电
      '房租', '宿舍费', '水费', '电费', '水电', '煤气', '暖气',
      // 医疗 & 健康
      '药', '药店', '医院', '诊所', '挂号', '体检', '医保', '眼镜', '隐形眼镜',
      // 日用品 & 卫生
      '日用品', '洗漱', '卫生', '洗发水', '护发素', '沐浴露', '牙膏', '牙刷', '洗手液', '纸巾', '卫生纸',
      '洗衣液', '洗衣粉', '洗衣', '干洗',
      '卫生巾', '生理期', '棉签',
      // 理容
      '理发', '剃须', '修甲',
      // 生活服务
      '快递', '邮费', '洗鞋', '修鞋', '修电脑', '维修', '配钥匙',
      // 保险 & 杂费
      '保险', '社保', '学费', '住宿费',
    ],
  },
];

/**
 * Classify a single item name into one of four categories.
 */
function classifyItem(name) {
  for (const { key, keywords } of CATEGORY_MAP) {
    if (keywords.some((kw) => name.includes(kw))) return key;
  }
  return 'necessary'; // conservative default
}

/**
 * Parse natural language expense text.
 * Handles formats like: "食堂18，奶茶16，外卖35" or "今天食堂 18 奶茶 16"
 */
function parseExpenses(text) {
  const items = [];
  // Match: non-digit-or-separator word(s) followed by an optional ¥/￥ and a number
  const re = /([^\d¥￥，,、。\s]+)\s*[¥￥]?\s*(\d+(?:\.\d+)?)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const name = m[1].trim().replace(/^[今天的是]+/, ''); // strip leading noise
    const amount = parseFloat(m[2]);
    if (name.length >= 1 && amount > 0 && amount < 10000) {
      items.push({ name, amount, category: classifyItem(name) });
    }
  }
  return items;
}

/**
 * Build the structured review result from parsed items.
 */
function buildReview(items, dailyBudget) {
  const total = items.reduce((s, i) => s + i.amount, 0);

  const categories = { necessary: [], optimizable: [], impulsive: [], learning: [] };
  for (const item of items) {
    categories[item.category].push({ name: item.name, amount: item.amount, label: `${item.name} ¥${item.amount}` });
  }

  const overBudget = dailyBudget > 0 && total > dailyBudget;
  const overAmount = overBudget ? Math.round(total - dailyBudget) : 0;

  // Find largest avoidable spend for main risk copy
  const avoidable = items
    .filter((i) => i.category === 'optimizable' || i.category === 'impulsive')
    .sort((a, b) => b.amount - a.amount);

  const mainRisk = avoidable.length > 0
    ? `${avoidable[0].name} ¥${avoidable[0].amount} 是今天最大的可优化支出`
    : '消费结构比较健康，必要支出为主';

  // Numeric summary per category for the stacked bar
  const catTotals = {
    necessary: categories.necessary.reduce((s, i) => s + i.amount, 0),
    optimizable: categories.optimizable.reduce((s, i) => s + i.amount, 0),
    impulsive: categories.impulsive.reduce((s, i) => s + i.amount, 0),
    learning: categories.learning.reduce((s, i) => s + i.amount, 0),
  };

  // Convert to string arrays for frontend label rendering
  const categoryLabels = {
    necessary: categories.necessary.map((i) => i.label),
    optimizable: categories.optimizable.map((i) => i.label),
    impulsive: categories.impulsive.map((i) => i.label),
    learning: categories.learning.map((i) => i.label),
  };

  return { total, dailyBudget, overBudget, overAmount, categories: categoryLabels, catTotals, mainRisk };
}

module.exports = { parseExpenses, buildReview, classifyItem };
