import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { ChevronLeftIcon } from 'lucide-react';
import Layout from '../components/Layout';
import { AgentResponse, ExpenseReviewResult } from '../lib/types';

const EXAMPLES = [
  '食堂18，奶茶16，外卖35，打印资料8，打车22',
  '今天买教材60，咖啡22，地铁4',
  '游戏充值50，食堂20，零食15',
];

const CAT = {
  necessary:   { label: '必要消费', emoji: '🍚' },
  optimizable: { label: '可优化',   emoji: '🧋' },
  impulsive:   { label: '冲动消费', emoji: '🎮' },
  learning:    { label: '学习投资', emoji: '📚' },
};

function catTotal(items: string[]) {
  return items.reduce((s, item) => { const m = item.match(/\d+/); return s + (m ? +m[0] : 0); }, 0);
}

export default function ExpenseReview() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [budget, setBudget] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AgentResponse|null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const b = localStorage.getItem('userDailyBudget'); if (b) setBudget(b);
  }, []);

  async function submit() {
    if (!text.trim()) { setError('请输入今天的消费记录'); return; }
    setLoading(true); setResult(null); setError('');
    try {
      const res = await fetch('/api/agent', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          mode: 'expense_review', message: text,
          profile: { dailyBudget: +budget||undefined },
          formData: { text, dailyBudget: +budget||undefined },
        }),
      });
      const data: AgentResponse = await res.json();
      setResult(data);
      if (data.result && 'total' in data.result) {
        const total = data.result.total;
        localStorage.setItem('lastReview', JSON.stringify({ total, overBudget: data.result.overBudget, date: new Date().toDateString() }));
        const todayDate = new Date().toISOString().slice(0,10);
        const raw = localStorage.getItem('spendingHistory') || '[]';
        const h: Array<{date:string;amount:number}> = JSON.parse(raw);
        const idx = h.findIndex(r => r.date === todayDate);
        if (idx >= 0) h[idx].amount = total; else h.push({ date: todayDate, amount: total });
        localStorage.setItem('spendingHistory', JSON.stringify(h.slice(-60)));
      }
    } catch { setError('网络错误，请重试'); }
    finally { setLoading(false); }
  }

  const er = result?.result?.type === 'expense_review_result' ? result.result as ExpenseReviewResult : null;

  return (
    <Layout title="消费复盘 - 攒钱搭子 AI">
      <div className="animate-fade-up">
        <div className="pt-14 px-6 pb-4">
          <button onClick={() => router.back()} className="flex items-center gap-1 text-gray-400 mb-4 -ml-1">
            <ChevronLeftIcon size={18} />
            <span className="text-sm font-medium">返回</span>
          </button>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest">Expense Review</p>
          <h1 className="text-2xl font-black text-black mt-0.5">消费复盘</h1>
        </div>

        {budget && (
          <div className="px-6 mb-4">
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2.5">
              <span className="text-xs text-gray-400">今日预算参考</span>
              <span className="text-xs font-black text-black ml-auto">{budget} 元</span>
              <button onClick={() => setBudget('')} className="text-gray-300 ml-1">×</button>
            </div>
          </div>
        )}

        <div className="px-6 mb-4">
          <textarea value={text} onChange={e => { setText(e.target.value); setError(''); }}
            placeholder="例：今天食堂18，奶茶16，外卖35，打印资料8，打车22"
            rows={4}
            className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3.5 text-sm font-medium placeholder-gray-400 focus:outline-none focus:border-black transition-colors resize-none leading-relaxed"
          />
        </div>

        <div className="px-6 mb-5">
          <p className="text-xs text-gray-400 mb-2 font-medium">示例（点击填入）</p>
          <div className="flex flex-col gap-2">
            {EXAMPLES.map((ex, i) => (
              <button key={i} onClick={() => setText(ex)}
                className="text-left text-xs text-gray-500 bg-gray-50 rounded-xl px-4 py-2.5 hover:bg-gray-100 transition-colors truncate shadow-card">
                {ex}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-500 px-6 mb-4">{error}</p>}

        <div className="px-6 mb-6">
          <button onClick={submit} disabled={loading}
            className="w-full py-4 rounded-2xl bg-black text-white font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-50">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                分析中...
              </span>
            ) : '开始复盘 →'}
          </button>
        </div>

        {er && (
          <div className="px-6 space-y-4 animate-slide-up">
            <div className="flex gap-3">
              <div className="flex-1 bg-gray-50 rounded-2xl p-4 shadow-card">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">今日总支出</div>
                <div className="flex items-end gap-1">
                  <span className="text-2xl font-black text-black">{er.total}</span>
                  <span className="text-xs text-gray-400 mb-0.5">元</span>
                </div>
                {er.overBudget !== undefined && (
                  <div className={`text-xs mt-1 font-semibold ${er.overBudget ? 'text-red-500' : 'text-green-500'}`}>
                    {er.overBudget ? `超出 ${er.total - (+budget||0)} 元` : '在预算内 ✓'}
                  </div>
                )}
              </div>
              <div className="flex-1 bg-gray-50 rounded-2xl p-4 shadow-card">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">可优化</div>
                <div className="flex items-end gap-1">
                  <span className="text-2xl font-black text-black">{catTotal(er.categories.optimizable)}</span>
                  <span className="text-xs text-gray-400 mb-0.5">元</span>
                </div>
                <div className="text-xs text-gray-400 mt-1">外卖·奶茶·打车</div>
              </div>
              <div className="flex-1 bg-black rounded-2xl p-4">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">冲动消费</div>
                <div className="text-2xl font-black text-white">{catTotal(er.categories.impulsive)}</div>
                <div className="text-xs text-gray-500 mt-1">元</div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 shadow-card">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">搭子说</p>
              <p className="text-sm text-black leading-relaxed">{er.reply}</p>
            </div>

            <div className="bg-gray-50 rounded-3xl p-5 shadow-card">
              <h3 className="text-sm font-bold text-black mb-4">消费分类详情</h3>
              {(Object.entries(er.categories) as [keyof typeof CAT, string[]][]).map(([key, items]) => {
                if (!items.length) return null;
                const cfg = CAT[key];
                return (
                  <div key={key} className="mb-4 last:mb-0">
                    <div className="flex items-center justify-between text-xs font-semibold mb-2">
                      <span className="flex items-center gap-1.5 text-gray-600">{cfg.emoji} {cfg.label}</span>
                      <span className="text-black">{catTotal(items)} 元</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {items.map((item, i) => (
                        <span key={i} className="text-xs bg-white border border-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium shadow-card">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-black rounded-3xl p-5 flex items-center gap-4">
              <div className="text-3xl">📅</div>
              <div>
                <div className="text-white font-black text-base">明日行动</div>
                <div className="text-gray-400 text-xs mt-0.5">{er.nextAction}</div>
              </div>
            </div>
          </div>
        )}
        <div className="h-16" />
      </div>
    </Layout>
  );
}
