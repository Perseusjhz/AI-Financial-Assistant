import { useState } from 'react';
import { useRouter } from 'next/router';
import { ChevronLeftIcon, TrendingUpIcon, TrendingDownIcon, ShieldIcon } from 'lucide-react';
import Layout from '../components/Layout';
import { AgentResponse, RiskEducationResult } from '../lib/types';

const QUESTIONS = [
  '我能不能拿生活费买基金？',
  '大学生适合买股票吗？',
  '我可以买虚拟货币吗？',
  '我可以借钱投资吗？',
  '货币基金和存款有什么区别？',
  '余额宝安全吗？',
];

const RISK_POS: Record<string, number> = { '低':10, '中低':30, '中':52, '高':75, '极高':95 };
const RISK_LABELS = ['低','中低','中','高','极高'];

export default function RiskEducation() {
  const router = useRouter();
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AgentResponse|null>(null);
  const [error, setError] = useState('');

  async function submit(q?: string) {
    const query = q || question;
    if (!query.trim()) { setError('请输入你的理财问题'); return; }
    setQuestion(query); setLoading(true); setResult(null); setError('');
    try {
      const res = await fetch('/api/agent', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ mode:'risk_education', message: query, formData:{ question: query } }),
      });
      setResult(await res.json());
    } catch { setError('网络错误，请重试'); }
    finally { setLoading(false); }
  }

  const rr = result?.result?.type === 'risk_education_result' ? result.result as RiskEducationResult : null;
  const isDanger = rr && (rr.riskLevel === '高' || rr.riskLevel === '极高');

  return (
    <Layout title="理财风险 - 攒钱搭子 AI">
      <div className="animate-fade-up">
        <div className="pt-14 px-6 pb-4">
          <button onClick={() => router.back()} className="flex items-center gap-1 text-gray-400 mb-4 -ml-1">
            <ChevronLeftIcon size={18} />
            <span className="text-sm font-medium">返回</span>
          </button>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest">Risk Education</p>
          <h1 className="text-2xl font-black text-black mt-0.5">理财风险</h1>
        </div>

        <div className="px-6 mb-4">
          <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2.5 mb-4 shadow-card">
            <ShieldIcon size={14} className="text-gray-400 flex-shrink-0" />
            <p className="text-xs text-gray-500 leading-relaxed">
              不推荐具体产品 · 不承诺收益 · 不构成投资建议
            </p>
          </div>

          <textarea value={question} onChange={e => { setQuestion(e.target.value); setError(''); }}
            placeholder="例：我能不能拿生活费买基金？"
            rows={3}
            className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3.5 text-sm font-medium placeholder-gray-400 focus:outline-none focus:border-black transition-colors resize-none leading-relaxed"
          />
        </div>

        <div className="px-6 mb-5">
          <p className="text-xs text-gray-400 mb-2.5 font-medium">常见问题（点击直接问）</p>
          <div className="flex flex-wrap gap-2">
            {QUESTIONS.map((q, i) => (
              <button key={i} onClick={() => submit(q)}
                className="text-xs px-3 py-2 rounded-full bg-gray-50 text-gray-600 font-medium hover:bg-gray-100 active:scale-[0.97] transition-all shadow-card">
                {q}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-500 px-6 mb-4">{error}</p>}

        <div className="px-6 mb-6">
          <button onClick={() => submit()} disabled={loading}
            className="w-full py-4 rounded-2xl bg-black text-white font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-50">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                分析中...
              </span>
            ) : '分析风险 →'}
          </button>
        </div>

        {rr && (
          <div className="px-6 space-y-4 animate-slide-up">
            {/* Risk meter card */}
            <div className="bg-gray-50 rounded-3xl p-5 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">风险等级</p>
                  <p className={`text-3xl font-black ${isDanger ? 'text-black' : 'text-black'}`}>
                    {rr.riskLevel}
                  </p>
                </div>
                <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                  rr.studentSuitability === '适合了解'  ? 'bg-green-100 text-green-700' :
                  rr.studentSuitability === '可谨慎了解' ? 'bg-blue-100 text-blue-700' :
                  rr.studentSuitability === '需要谨慎'  ? 'bg-yellow-100 text-yellow-700' :
                  'bg-black text-white'
                }`}>
                  {rr.studentSuitability}
                </span>
              </div>

              {/* Risk scale */}
              <div className="mb-3">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-black rounded-full animate-progress-fill"
                    style={{ width: `${RISK_POS[rr.riskLevel]||50}%` }} />
                </div>
                <div className="flex justify-between mt-1.5">
                  {RISK_LABELS.map(l => (
                    <span key={l} className={`text-[9px] font-semibold ${l===rr.riskLevel ? 'text-black' : 'text-gray-300'}`}>
                      {l}
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">{rr.conclusion}</p>
            </div>

            {/* Summary cards */}
            <div className="flex gap-3">
              <div className="flex-1 bg-gray-50 rounded-2xl p-4 shadow-card">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">大学生适配</div>
                <div className={`flex items-center gap-1 mt-2 text-xs font-semibold ${isDanger ? 'text-red-500' : 'text-green-500'}`}>
                  {isDanger ? <TrendingUpIcon size={12}/> : <TrendingDownIcon size={12}/>}
                  {isDanger ? '风险较高' : '相对安全'}
                </div>
              </div>
              <div className="flex-1 bg-gray-50 rounded-2xl p-4 shadow-card">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">建议行动</div>
                <div className="text-xs text-black font-semibold mt-1 leading-relaxed">{rr.nextAction}</div>
              </div>
            </div>

            {/* AI reply */}
            <div className="bg-gray-50 rounded-2xl p-4 shadow-card">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">搭子说</p>
              <p className="text-sm text-black leading-relaxed">{rr.reply}</p>
            </div>

            {/* Reasons */}
            <div className="bg-gray-50 rounded-3xl p-5 shadow-card">
              <h3 className="text-sm font-bold text-black mb-4">原因分析</h3>
              {rr.reasons.map((reason, i) => (
                <div key={i} className="mb-3 last:mb-0">
                  <div className="flex gap-3">
                    <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mt-0.5">
                      {i+1}
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">{reason}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Disclaimer */}
            <div className="bg-black rounded-3xl p-5 flex items-center gap-4">
              <ShieldIcon size={22} className="text-gray-400 flex-shrink-0" />
              <p className="text-xs text-gray-400 leading-relaxed">{rr.disclaimer}</p>
            </div>
          </div>
        )}
        <div className="h-16" />
      </div>
    </Layout>
  );
}
