import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import { ChevronLeftIcon, SendIcon } from 'lucide-react';
import Layout from '../components/Layout';
import { ChatMessage, AgentResponse } from '../lib/types';

const INIT: ChatMessage = {
  id: 'init', role: 'assistant', timestamp: Date.now(),
  content: '你好，我是你的攒钱搭子 🐷\n\n可以帮你做三件事：\n① 拆攒钱目标、算每日预算\n② 复盘今天消费找出问题\n③ 解释理财风险（不推销产品）\n\n你今天想先处理哪件事？',
};

const CHIPS = [
  '我每月生活费3000，固定支出1200，想攒600',
  '今天食堂18，奶茶16，外卖35，打车22',
  '我能买基金吗？',
];

export default function Chat() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([INIT]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function send(text?: string) {
    const content = text || input.trim();
    if (!content || loading) return;
    setInput('');
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content, timestamp: Date.now() };
    setMessages(p => [...p, userMsg]);
    setLoading(true);
    try {
      const profile = (() => { try { const r = localStorage.getItem('lastPlan'); return r ? JSON.parse(r) : undefined; } catch { return undefined; } })();
      const res = await fetch('/api/agent', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ mode: 'auto', message: content, profile }),
      });
      const data: AgentResponse = await res.json();
      setMessages(p => [...p, {
        id: (Date.now()+1).toString(), role: 'assistant',
        content: data.reply || data.summary || '让我想想...',
        cards: data.cards, result: data.result, timestamp: Date.now(),
      }]);
    } catch {
      setMessages(p => [...p, { id: (Date.now()+1).toString(), role: 'assistant', content: '抱歉，出了点问题，请重试。', timestamp: Date.now() }]);
    } finally { setLoading(false); }
  }

  return (
    <Layout title="AI 搭子 - 攒钱搭子 AI" noNav>
      <div className="flex flex-col h-screen bg-white">
        {/* Header */}
        <div className="pt-14 px-6 pb-4 border-b border-gray-100 flex items-center gap-3 flex-shrink-0">
          <button onClick={() => router.back()} className="-ml-1">
            <ChevronLeftIcon size={22} className="text-gray-400" />
          </button>
          <div className="w-9 h-9 rounded-full bg-black flex items-center justify-center text-base flex-shrink-0">🐷</div>
          <div>
            <p className="text-sm font-black text-black">攒钱搭子 AI</p>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <span className="text-[11px] text-gray-400">在线 · 不推销产品</span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-hide">
          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-end`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-sm flex-shrink-0">🐷</div>
              )}
              <div className={`flex flex-col gap-2 max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-black text-white rounded-br-md'
                    : 'bg-gray-50 text-black rounded-bl-md shadow-card'
                }`} style={{ whiteSpace: 'pre-wrap' }}>
                  {msg.content}
                </div>
                {/* Result cards */}
                {msg.role === 'assistant' && msg.cards && msg.cards.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 w-full">
                    {msg.cards.slice(0,4).map((card, i) => (
                      <div key={i} className="bg-gray-50 rounded-xl p-3 shadow-card">
                        <p className="text-[9px] uppercase tracking-wider text-gray-400 font-medium mb-1">{card.title}</p>
                        <p className="text-sm font-black text-black leading-tight">{card.value}</p>
                        {card.subtitle && <p className="text-[10px] text-gray-400 mt-0.5">{card.subtitle}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 items-end">
              <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-sm">🐷</div>
              <div className="bg-gray-50 rounded-2xl rounded-bl-md px-4 py-3 shadow-card">
                <div className="flex gap-1.5 items-center h-4">
                  {[0,1,2].map(i => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
                      style={{ animationDelay: `${i*150}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-100 px-4 pt-3 pb-6 flex-shrink-0 bg-white"
          style={{ paddingBottom: `calc(1.5rem + env(safe-area-inset-bottom, 0px))` }}>
          {messages.length <= 2 && (
            <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-hide pb-1">
              {CHIPS.map((chip, i) => (
                <button key={i} onClick={() => send(chip)}
                  className="flex-shrink-0 text-xs px-3 py-2 rounded-full bg-gray-50 text-gray-600 font-medium whitespace-nowrap hover:bg-gray-100 active:scale-[0.97] transition-all shadow-card">
                  {chip.length > 18 ? chip.slice(0,18)+'…' : chip}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-3 items-end">
            <textarea value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="发送消息…"
              rows={1}
              className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm font-medium placeholder-gray-400 focus:outline-none focus:border-black transition-colors resize-none max-h-24 leading-relaxed"
            />
            <button onClick={() => send()} disabled={loading || !input.trim()}
              className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center flex-shrink-0 disabled:opacity-30 active:scale-95 transition-all">
              <SendIcon size={16} />
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
