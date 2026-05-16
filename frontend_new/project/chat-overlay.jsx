// Chat overlay — half-screen liquid glass sheet
// Appears when user taps the FAB. Real-time chat with the agent (mocked).

const { useState: useStateChat, useEffect: useEffectChat, useRef: useRefChat } = React;

const QUICK_CHIPS = [
  '帮我算每日预算', '今天能买基金吗', '存 600 难吗', '消费分类'
];

function ChatOverlay({ open, onClose, accent, accentInk, avatarVariant, onContextHint }) {
  const initial = [{
    id: 'init', role: 'assistant',
    text: '你好呀，我是攒钱搭子。可以拆目标、复盘消费、解释风险 —— 你今天想聊哪个？',
  }];
  const [messages, setMessages] = useStateChat(initial);
  const [input, setInput] = useStateChat('');
  const [typing, setTyping] = useStateChat(false);
  const bottomRef = useRefChat(null);

  useEffectChat(() => {
    if (!open) return;
    bottomRef.current?.parentElement?.scrollTo({ top: 99999, behavior: 'smooth' });
  }, [messages, open, typing]);

  function send(text) {
    const t = (text ?? input).trim();
    if (!t) return;
    setInput('');
    const userMsg = { id: Date.now()+'u', role: 'user', text: t };
    setMessages(m => [...m, userMsg]);
    setTyping(true);

    fetch('http://localhost:3002/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: t,
        profile: JSON.parse(localStorage.getItem('mb_plan') || 'null'),
      }),
    })
      .then(r => r.json())
      .then(data => {
        setTyping(false);
        // Map backend card → InChatCard format
        let card = null;
        if (data.card) {
          const c = data.card;
          if (c.type === 'expense_review_card') {
            card = { label: '今日支出', value: String(c.total), unit: '元',
                     badge: c.overBudget ? `超 ¥${c.overAmount}` : '未超支',
                     sub: `必要¥${c.catTotals.necessary} 可优化¥${c.catTotals.optimizable}` };
          } else if (c.type === 'saving_plan_card') {
            card = { label: '每日预算', value: String(c.dailyBudget), unit: '元/天',
                     badge: c.feasibility, sub: `每周 ¥${c.weeklyBudget}` };
          } else if (c.type === 'risk_education_card') {
            card = { label: '风险等级', value: c.riskLevel, unit: `${c.riskScore}/5`,
                     badge: c.studentSuitability, sub: c.disclaimer };
          }
        }
        setMessages(m => [...m, { id: Date.now()+'a', role: 'assistant', text: data.reply, card }]);
      })
      .catch(() => {
        setTyping(false);
        setMessages(m => [...m, { id: Date.now()+'a', role: 'assistant',
          text: '网络好像出问题了，稍后再试？' }]);
      });
  }

  return (
    <>
      {/* scrim */}
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0, zIndex: 40,
        background: 'rgba(10,10,12,0.18)',
        backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)',
        opacity: open ? 1 : 0,
        pointerEvents: open ? 'auto' : 'none',
        transition: 'opacity .25s ease',
      }}/>

      {/* sheet */}
      <div style={{
        position: 'absolute', left: 10, right: 10, bottom: 108,
        height: '58%', zIndex: 50,
        borderRadius: 32,
        background: 'rgba(255,255,255,0.62)',
        backdropFilter: 'blur(40px) saturate(200%)',
        WebkitBackdropFilter: 'blur(40px) saturate(200%)',
        border: '0.5px solid rgba(255,255,255,0.8)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 -8px 40px rgba(0,0,0,0.18)',
        transform: open ? 'translateY(0) scale(1)' : 'translateY(40px) scale(0.96)',
        opacity: open ? 1 : 0,
        pointerEvents: open ? 'auto' : 'none',
        transition: 'transform .35s cubic-bezier(.2,.85,.3,1), opacity .25s ease',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* header */}
        <div style={{
          padding: '14px 18px 10px', display: 'flex', alignItems: 'center', gap: 10,
          borderBottom: '0.5px solid rgba(0,0,0,0.06)',
        }}>
          {/* drag handle */}
          <div style={{
            position: 'absolute', top: 7, left: '50%', transform: 'translateX(-50%)',
            width: 38, height: 4, borderRadius: 999, background: 'rgba(0,0,0,0.18)',
          }}/>
          <Buddy size={32} variant={avatarVariant} accent={accent}/>
          <div style={{ flex: 1, marginTop: 4 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0a0a0a' }}>攒钱搭子</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 5, height: 5, borderRadius: 999, background: '#16b86c' }}/>
              <span style={{ fontSize: 10.5, color: '#9a9a96', fontWeight: 600 }}>实时同步 · 不推销产品</span>
            </div>
          </div>
        </div>

        {/* messages */}
        <div className="app-scroll" style={{
          flex: 1, overflowY: 'auto', padding: '14px 16px 8px',
        }}>
          {messages.map(m => <ChatRow key={m.id} m={m} accent={accent} accentInk={accentInk} avatarVariant={avatarVariant}/>)}
          {typing && <TypingRow accent={accent} avatarVariant={avatarVariant}/>}
          <div ref={bottomRef}/>
        </div>

        {/* quick chips */}
        {messages.length <= 2 && (
          <div style={{
            display: 'flex', gap: 6, overflowX: 'auto', padding: '0 16px 8px',
          }}>
            {QUICK_CHIPS.map(c => (
              <button key={c} onClick={() => send(c)} className="press" style={{
                flexShrink: 0, fontSize: 11.5, fontWeight: 700,
                padding: '7px 12px', borderRadius: 999, cursor: 'pointer',
                background: 'rgba(255,255,255,0.65)',
                border: '0.5px solid rgba(0,0,0,0.06)',
                color: '#0a0a0a', whiteSpace: 'nowrap',
              }}>{c}</button>
            ))}
          </div>
        )}

        {/* input */}
        <div style={{
          padding: '8px 12px 14px', display: 'flex', gap: 8, alignItems: 'center',
        }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="发送消息…"
            style={{
              flex: 1, fontSize: 14, padding: '11px 14px', borderRadius: 22,
              background: 'rgba(255,255,255,0.7)',
              border: '0.5px solid rgba(0,0,0,0.08)',
              outline: 'none', color: '#0a0a0a',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9)',
            }}
          />
          <button onClick={() => send()} disabled={!input.trim()} className="press" style={{
            width: 40, height: 40, borderRadius: 20, border: 0, cursor: 'pointer',
            background: accent, color: accentInk,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: input.trim() ? 1 : 0.5,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), 0 4px 14px rgba(0,0,0,0.18)',
          }}>
            <Icon.Send size={16} color={accentInk}/>
          </button>
        </div>
      </div>
    </>
  );
}

function ChatRow({ m, accent, accentInk, avatarVariant }) {
  if (m.role === 'user') {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
        <div style={{
          maxWidth: '78%', padding: '10px 14px',
          background: '#0a0a0a', color: '#fff', fontSize: 13.5, lineHeight: 1.5,
          borderRadius: '18px 18px 6px 18px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}>{m.text}</div>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 10 }}>
      <Buddy size={28} variant={avatarVariant} accent={accent}/>
      <div style={{
        maxWidth: '78%', padding: '10px 14px',
        background: 'rgba(255,255,255,0.75)',
        backdropFilter: 'blur(20px) saturate(160%)',
        WebkitBackdropFilter: 'blur(20px) saturate(160%)',
        border: '0.5px solid rgba(255,255,255,0.9)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.95), 0 2px 8px rgba(0,0,0,0.06)',
        color: '#0a0a0a', fontSize: 13.5, lineHeight: 1.55,
        borderRadius: '18px 18px 18px 6px',
      }}>
        {m.text}
        {m.card && <InChatCard data={m.card} accent={accent} accentInk={accentInk}/>}
      </div>
    </div>
  );
}

function InChatCard({ data, accent, accentInk }) {
  return (
    <div style={{
      marginTop: 8, padding: '10px 12px', borderRadius: 14,
      background: 'rgba(0,0,0,0.04)',
      border: '0.5px solid rgba(0,0,0,0.06)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: '#9a9a96', letterSpacing: '0.12em' }}>
          {data.label}
        </span>
        {data.badge && (
          <span style={{
            fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 999,
            background: accent, color: accentInk,
          }}>{data.badge}</span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, marginTop: 4 }}>
        <span className="num" style={{ fontSize: 28, fontWeight: 900, color: '#0a0a0a' }}>{data.value}</span>
        <span style={{ fontSize: 12, color: '#9a9a96', fontWeight: 600, marginBottom: 3 }}>{data.unit}</span>
      </div>
      {data.sub && <div style={{ fontSize: 11, color: '#9a9a96', marginTop: 2 }}>{data.sub}</div>}
    </div>
  );
}

function TypingRow({ accent, avatarVariant }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 10 }}>
      <Buddy size={28} variant={avatarVariant} accent={accent}/>
      <div style={{
        padding: '12px 16px', borderRadius: '18px 18px 18px 6px',
        background: 'rgba(255,255,255,0.75)',
        border: '0.5px solid rgba(255,255,255,0.9)',
        display: 'flex', gap: 4, alignItems: 'center',
      }}>
        {[0,1,2].map(i => (
          <span key={i} style={{
            width: 5, height: 5, borderRadius: 999, background: '#9a9a96',
            animation: `mb-bounce 1.2s ${i*150}ms infinite ease-in-out`,
          }}/>
        ))}
      </div>
    </div>
  );
}

// ─── tiny mock reasoner ──────────────────────────────────────────────
function mockReply(text) {
  if (/预算|每日|每天|算/.test(text)) {
    return {
      text: '按你最近的支出，建议每日预算 ¥84，已帮你更新到首页。',
      card: { label: '建议每日预算', value: '84', unit: '元/天', badge: '已更新', sub: '本周累计可花 ¥588' },
      hint: { kind: 'budget', value: 84 },
    };
  }
  if (/基金|股票|币|风险/.test(text)) {
    return {
      text: '简短答：高风险资产应 ≤ 总余钱的 5%。生活费不能动 —— 那是不可承受损失的钱。要不要我展开风险页给你看？',
      card: { label: '建议', value: '5%', unit: '上限', sub: '虚拟货币 / 杠杆 / 期权' },
    };
  }
  if (/600|存|攒|目标/.test(text)) {
    return {
      text: '本月目标 ¥600 是可行的。已存 ¥408，还差 ¥192 / 16 天 = 每天少花 12 元就行。',
      card: { label: '差额', value: '192', unit: '元', badge: '16 天', sub: '每天少花 ¥12' },
    };
  }
  if (/复盘|今天|花了|消费/.test(text)) {
    return {
      text: '今天累计 ¥91，超预算 ¥7。打车 ¥22 是可避免支出。',
      card: { label: '今日支出', value: '91', unit: '元', badge: '超 ¥7' },
    };
  }
  return {
    text: '我记下了。可以试试问我：「帮我算每日预算」「今天能买基金吗」「存 600 难吗」',
  };
}

Object.assign(window, { ChatOverlay });
