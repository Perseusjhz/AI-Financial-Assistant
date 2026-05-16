import { useState } from 'react';
import { useRouter } from 'next/router';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import Layout from '../components/Layout';
import { AgentResponse, SavingPlanInput, SavingPlanResult } from '../lib/types';

type Style = NonNullable<SavingPlanInput['style']>;
const STYLES: { value: Style; label: string; emoji: string; desc: string }[] = [
  { value: 'strict',   label: '严格', emoji: '💪', desc: '全力攒钱' },
  { value: 'balanced', label: '平衡', emoji: '⚖️', desc: '兼顾生活' },
  { value: 'relaxed',  label: '宽松', emoji: '😌', desc: '留弹性' },
];

function Field({ label, value, onChange, placeholder, unit, optional }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder: string; unit?: string; optional?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-semibold text-black">{label}</label>
        {optional && <span className="text-xs text-gray-400">可选</span>}
      </div>
      <div className="relative">
        <input type="number" value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-black placeholder-gray-400 focus:outline-none focus:border-black transition-colors pr-10"
        />
        {unit && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{unit}</span>}
      </div>
    </div>
  );
}

export default function SavingPlan() {
  const router = useRouter();
  const [form, setForm] = useState({
    monthlyIncome: '', extraIncome: '', fixedExpense: '', savingGoal: '',
    remainingDays: String(new Date(new Date().getFullYear(), new Date().getMonth()+1, 0).getDate() - new Date().getDate()),
    style: 'balanced' as Style,
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AgentResponse|null>(null);
  const [error, setError] = useState('');

  const set = (k: keyof typeof form, v: string) => { setForm(p => ({...p,[k]:v})); setError(''); };

  async function submit() {
    if (!form.monthlyIncome || !form.fixedExpense || !form.savingGoal) {
      setError('请填写月生活费、固定支出和攒钱目标');
      return;
    }
    setLoading(true); setResult(null);
    try {
      const input: SavingPlanInput = {
        monthlyIncome: +form.monthlyIncome, extraIncome: +form.extraIncome||0,
        fixedExpense: +form.fixedExpense, savingGoal: +form.savingGoal,
        remainingDays: +form.remainingDays||25, style: form.style,
      };
      const res = await fetch('/api/agent', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ mode:'saving_plan', message:'', formData: input }),
      });
      const data: AgentResponse = await res.json();
      setResult(data);
      if (data.result?.type === 'saving_plan_result') {
        const sp = data.result as SavingPlanResult;
        localStorage.setItem('lastPlan', JSON.stringify({
          dailyBudget: sp.dailyBudget, weeklyBudget: sp.weeklyBudget,
          savingGoal: sp.savingGoal, feasibility: sp.feasibility,
          updatedAt: new Date().toISOString(),
        }));
        localStorage.setItem('userDailyBudget', String(sp.dailyBudget));
      }
    } catch { setError('网络错误，请重试'); }
    finally { setLoading(false); }
  }

  const sp = result?.result?.type === 'saving_plan_result' ? result.result as SavingPlanResult : null;

  return (
    <Layout title="攒钱计划 - 攒钱搭子 AI">
      <div className="animate-fade-up">
        <div className="pt-14 px-6 pb-4">
          <button onClick={() => router.back()} className="flex items-center gap-1 text-gray-400 mb-4 -ml-1">
            <ChevronLeftIcon size={18} />
            <span className="text-sm font-medium">返回</span>
          </button>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest">Budget Planner</p>
          <h1 className="text-2xl font-black text-black mt-0.5">攒钱计划</h1>
        </div>

        <div className="px-6 space-y-4 mb-6">
          <Field label="月生活费 / 主要收入 *" value={form.monthlyIncome} onChange={v=>set('monthlyIncome',v)} placeholder="例：3000" unit="元/月" />
          <Field label="额外收入（兼职/奖学金）" value={form.extraIncome} onChange={v=>set('extraIncome',v)} placeholder="没有则留空" unit="元" optional />
          <Field label="月固定支出 *" value={form.fixedExpense} onChange={v=>set('fixedExpense',v)} placeholder="例：1200" unit="元/月" />
          <Field label="本月攒钱目标 *" value={form.savingGoal} onChange={v=>set('savingGoal',v)} placeholder="例：600" unit="元" />
          <Field label="本月剩余天数" value={form.remainingDays} onChange={v=>set('remainingDays',v)} placeholder="25" unit="天" />

          <div>
            <label className="text-sm font-semibold text-black mb-2 block">攒钱风格</label>
            <div className="flex gap-2 bg-gray-50 rounded-2xl p-1.5">
              {STYLES.map(s => (
                <button key={s.value} onClick={() => set('style', s.value)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                    form.style === s.value ? 'bg-black text-white shadow-card' : 'text-gray-400'
                  }`}>
                  {s.emoji} {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-500 px-6 mb-4">{error}</p>}

        <div className="px-6 mb-6">
          <button onClick={submit} disabled={loading}
            className="w-full py-4 rounded-2xl bg-black text-white font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-50">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                计算中...
              </span>
            ) : '开始规划 →'}
          </button>
        </div>

        {sp && (
          <div className="px-6 space-y-4 animate-slide-up">
            {/* Summary cards */}
            <div className="flex gap-3">
              <div className="flex-1 bg-gray-50 rounded-2xl p-4 shadow-card">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">每日预算</div>
                <div className="flex items-end gap-1">
                  <span className="text-2xl font-black text-black">{sp.dailyBudget}</span>
                  <span className="text-xs text-gray-400 mb-0.5">元/天</span>
                </div>
                <div className="text-xs text-gray-400 mt-1">每周约 {sp.weeklyBudget} 元</div>
              </div>
              <div className="flex-1 bg-gray-50 rounded-2xl p-4 shadow-card">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">月可消费</div>
                <div className="flex items-end gap-1">
                  <span className="text-2xl font-black text-black">{sp.monthlySpendable}</span>
                  <span className="text-xs text-gray-400 mb-0.5">元</span>
                </div>
                <div className="text-xs text-gray-400 mt-1">扣除固定支出后</div>
              </div>
              <div className="flex-1 bg-black rounded-2xl p-4 shadow-card">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">可行性</div>
                <div className="text-xl font-black text-white leading-tight mt-1">{sp.feasibility}</div>
              </div>
            </div>

            {/* AI reply */}
            <div className="bg-gray-50 rounded-2xl p-4 shadow-card">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">搭子说</p>
              <p className="text-sm text-black leading-relaxed">{sp.reply}</p>
            </div>

            {/* Risk points */}
            {sp.riskPoints.length > 0 && (
              <div className="bg-gray-50 rounded-2xl p-4 shadow-card">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">重点控制</p>
                <div className="flex flex-wrap gap-2">
                  {sp.riskPoints.map((item, i) => (
                    <span key={i} className="px-3 py-1.5 bg-black text-white text-xs font-semibold rounded-full">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Next action */}
            <div className="bg-black rounded-3xl p-5 flex items-center gap-4">
              <div className="text-3xl">🎯</div>
              <div>
                <div className="text-white font-black text-base">本周一件事</div>
                <div className="text-gray-400 text-xs mt-0.5">{sp.nextAction}</div>
              </div>
            </div>

            <button onClick={() => router.push('/expense-review')}
              className="w-full py-4 rounded-2xl border border-gray-200 text-gray-500 text-sm font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
              去复盘今天消费 <ChevronRightIcon size={14} />
            </button>
          </div>
        )}
        <div className="h-16" />
      </div>
    </Layout>
  );
}
