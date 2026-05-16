import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { ChevronRightIcon, TargetIcon, ActivityIcon, BookOpenIcon, MessageCircleIcon, SettingsIcon, ShieldIcon } from 'lucide-react';
import Layout from '../components/Layout';

interface LastPlan { dailyBudget: number; weeklyBudget: number; savingGoal: number; feasibility: string; updatedAt?: string; }
interface LastReview { total: number; overBudget?: boolean; date: string; }

const stats = [
  { label: '攒钱目标', key: 'goal' },
  { label: '消费复盘', key: 'reviews' },
  { label: '日均消费', key: 'avg' },
];

const menuItems = [
  { Icon: TargetIcon,       label: '攒钱计划',    sub: '设置月度目标',   href: '/saving-plan' },
  { Icon: ActivityIcon,     label: '消费复盘',    sub: '记录今天消费',   href: '/expense-review' },
  { Icon: BookOpenIcon,     label: '理财风险教育', sub: '不推销，只教育', href: '/risk-education' },
  { Icon: MessageCircleIcon,label: 'AI 搭子对话', sub: '自由聊，自动分析',href: '/chat' },
];

const techInfo = [
  { label: '前端', val: 'Next.js + Tailwind CSS' },
  { label: 'AI',   val: 'DeepSeek-Chat (可换 GPT-4o)' },
  { label: '知识库', val: '轻量 RAG · 本地 JSON 检索' },
  { label: '风控', val: '规则层 + Prompt 层双重约束' },
];

export default function MyPlans() {
  const router = useRouter();
  const [plan, setPlan] = useState<LastPlan|null>(null);
  const [review, setReview] = useState<LastReview|null>(null);
  const [histCount, setHistCount] = useState(0);

  useEffect(() => {
    try {
      const p = localStorage.getItem('lastPlan'); if (p) setPlan(JSON.parse(p));
      const r = localStorage.getItem('lastReview'); if (r) setReview(JSON.parse(r));
      const h = localStorage.getItem('spendingHistory');
      if (h) {
        const arr: Array<{date:string;amount:number}> = JSON.parse(h);
        const thisM = new Date().toISOString().slice(0,7);
        setHistCount(arr.filter(a => a.date.startsWith(thisM)).length);
      }
    } catch { /* ignore */ }
  }, []);

  const avgSpend = review?.total ?? 0;

  return (
    <Layout title="我的 - 攒钱搭子 AI">
      <div className="animate-fade-up">
        <div className="pt-14 px-6 pb-6">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-1">Account</p>
          <h1 className="text-2xl font-black text-black">我的</h1>
        </div>

        {/* Profile card */}
        <div className="px-6 mb-6">
          <div className="bg-black rounded-3xl p-6 flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-3xl">
              🐷
            </div>
            <div className="flex-1">
              <div className="text-white font-black text-lg">攒钱搭子 AI</div>
              <div className="text-gray-400 text-xs mt-0.5">非营销型理财教育助手</div>
              <div className="flex items-center gap-1.5 mt-2">
                <div className="bg-white/15 rounded-full px-2.5 py-1 text-[10px] font-bold text-white">Demo</div>
                {histCount > 0 && (
                  <div className="bg-green-500/80 rounded-full px-2.5 py-1 text-[10px] font-bold text-white">
                    📊 {histCount} 天记录
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="px-6 mb-6">
          <div className="flex gap-3">
            <div className="flex-1 bg-gray-50 rounded-2xl p-4 text-center shadow-card">
              <div className="text-xl font-black text-black">{plan ? `${plan.savingGoal}元` : '—'}</div>
              <div className="text-[10px] text-gray-400 mt-0.5 font-medium">攒钱目标</div>
              <div className="text-[10px] text-gray-300">{plan?.feasibility ?? '未设置'}</div>
            </div>
            <div className="flex-1 bg-gray-50 rounded-2xl p-4 text-center shadow-card">
              <div className="text-xl font-black text-black">{histCount || '—'}</div>
              <div className="text-[10px] text-gray-400 mt-0.5 font-medium">本月记录</div>
              <div className="text-[10px] text-gray-300">天消费数据</div>
            </div>
            <div className="flex-1 bg-gray-50 rounded-2xl p-4 text-center shadow-card">
              <div className="text-xl font-black text-black">{plan ? `${plan.dailyBudget}元` : '—'}</div>
              <div className="text-[10px] text-gray-400 mt-0.5 font-medium">每日预算</div>
              <div className="text-[10px] text-gray-300">参考值</div>
            </div>
          </div>
        </div>

        {/* Menu */}
        <div className="px-6 mb-6">
          <h3 className="text-sm font-black text-black mb-3">功能入口</h3>
          <div className="flex flex-col gap-2">
            {menuItems.map(item => (
              <button key={item.href} onClick={() => router.push(item.href)}
                className="flex items-center gap-4 bg-gray-50 rounded-2xl p-4 w-full text-left hover:bg-gray-100 transition-all duration-200 active:scale-[0.98] shadow-card">
                <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center flex-shrink-0">
                  <item.Icon size={16} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-black text-sm">{item.label}</div>
                  <div className="text-xs text-gray-400">{item.sub}</div>
                </div>
                <ChevronRightIcon size={16} className="text-gray-300" />
              </button>
            ))}
          </div>
        </div>

        {/* Tech stack */}
        <div className="px-6 mb-6">
          <h3 className="text-sm font-black text-black mb-3">技术架构</h3>
          <div className="bg-gray-50 rounded-2xl p-4 shadow-card space-y-3">
            {techInfo.map(t => (
              <div key={t.label} className="flex gap-3 text-xs">
                <span className="text-gray-400 w-12 flex-shrink-0">{t.label}</span>
                <span className="text-black font-medium">{t.val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Compliance */}
        <div className="px-6 mb-4">
          <div className="flex items-start gap-3 bg-gray-50 rounded-2xl p-4 shadow-card">
            <ShieldIcon size={16} className="text-gray-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-400 leading-relaxed">
              本产品不推销具体金融产品，不承诺投资收益，所有回答仅供理财知识学习参考，不构成投资建议。
            </p>
          </div>
        </div>

        {/* Clear data */}
        <div className="px-6 mb-4">
          <button
            onClick={() => {
              localStorage.removeItem('lastPlan'); localStorage.removeItem('lastReview');
              localStorage.removeItem('userDailyBudget'); localStorage.removeItem('spendingHistory');
              setPlan(null); setReview(null); setHistCount(0);
            }}
            className="w-full py-4 rounded-2xl border border-gray-200 text-gray-400 text-sm font-semibold hover:bg-gray-50 transition-colors">
            清除所有本地数据
          </button>
        </div>

        <div className="h-28" />
      </div>
    </Layout>
  );
}
