(function(){
// Chat overlay — half-screen liquid glass sheet with live LLM via window.claude.complete
// Falls back to a mock reasoner on error or non-JSON output.
const { useState: useStateChat, useEffect: useEffectChat, useRef: useRefChat } = React;
const QUICK_CHIPS = [
    '帮我算每日预算', '我能买基金吗', '存 600 难吗', '复盘今天'
];
// Inject pulse animation once
if (typeof document !== 'undefined' && !document.getElementById('mb-pulse-css')) {
    const s = document.createElement('style');
    s.id = 'mb-pulse-css';
    s.textContent = `
    @keyframes mb-pulse-num {
      0%   { transform: scale(1);    color: inherit; }
      30%  { transform: scale(1.06); color: var(--accent, #c01900); }
      100% { transform: scale(1);    color: inherit; }
    }
    .mb-pulse { animation: mb-pulse-num 0.9s ease-out; display: inline-block; }
  `;
    document.head.appendChild(s);
}
function ChatOverlay({ open, onClose, accent, accentInk, avatarVariant, liveData, onUpdateData, currentScreen, onNavigate, }) {
    const greet = `你好，我是攒钱搭子 AI。可以帮你：拆攒钱目标 · 复盘消费 · 解释风险。
今天想聊哪个？`;
    const [messages, setMessages] = useStateChat([
        { id: 'init', role: 'assistant', text: greet }
    ]);
    const [input, setInput] = useStateChat('');
    const [typing, setTyping] = useStateChat(false);
    const bottomRef = useRefChat(null);
    useEffectChat(() => {
        var _a;
        if (!open)
            return;
        const sc = (_a = bottomRef.current) === null || _a === void 0 ? void 0 : _a.parentElement;
        if (sc)
            sc.scrollTo({ top: sc.scrollHeight, behavior: 'smooth' });
    }, [messages, open, typing]);
    async function send(text) {
        const t = (text !== null && text !== void 0 ? text : input).trim();
        if (!t || typing)
            return;
        setInput('');
        setMessages(m => [...m, { id: Date.now() + 'u', role: 'user', text: t }]);
        setTyping(true);
        let result;
        try {
            result = await callAgent(t, liveData, currentScreen, messages);
        }
        catch (e) {
            result = mockReply(t, liveData);
        }
        setTyping(false);
        setMessages(m => [...m, {
                id: Date.now() + 'a', role: 'assistant',
                text: result.reply, card: result.card,
                action: result.action,
            }]);
        if (result.updates)
            onUpdateData === null || onUpdateData === void 0 ? void 0 : onUpdateData(result.updates);
        if (result.navigate) {
            setTimeout(() => onNavigate === null || onNavigate === void 0 ? void 0 : onNavigate(result.navigate), 600);
        }
    }
    return (React.createElement(React.Fragment, null,
        React.createElement("div", { onClick: onClose, style: {
                position: 'absolute', inset: 0, zIndex: 40,
                background: 'rgba(10,10,12,0.18)',
                backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)',
                opacity: open ? 1 : 0,
                pointerEvents: open ? 'auto' : 'none',
                transition: 'opacity .25s ease',
            } }),
        React.createElement("div", { style: {
                position: 'absolute', left: 10, right: 10, bottom: 90,
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
            } },
            React.createElement("div", { style: {
                    position: 'absolute', top: 7, left: '50%', transform: 'translateX(-50%)',
                    width: 38, height: 4, borderRadius: 999, background: 'rgba(0,0,0,0.18)',
                } }),
            React.createElement("div", { style: {
                    padding: '14px 18px 10px', display: 'flex', alignItems: 'center', gap: 10,
                    borderBottom: '0.5px solid rgba(0,0,0,0.06)',
                } },
                React.createElement(Buddy, { size: 32, variant: avatarVariant, accent: accent }),
                React.createElement("div", { style: { flex: 1, marginTop: 4 } },
                    React.createElement("div", { style: { fontSize: 14, fontWeight: 800, color: '#0a0a0a' } }, "\u6512\u94B1\u642D\u5B50"),
                    React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: 5 } },
                        React.createElement("span", { style: { width: 5, height: 5, borderRadius: 999, background: '#16b86c' } }),
                        React.createElement("span", { style: { fontSize: 10.5, color: '#9a9a96', fontWeight: 600 } }, "\u5B9E\u65F6\u540C\u6B65 \u00B7 \u4E0D\u63A8\u9500\u4EA7\u54C1"))),
                React.createElement("span", { style: {
                        fontSize: 9, fontWeight: 800, padding: '3px 7px', borderRadius: 999,
                        background: 'rgba(0,0,0,0.06)', color: '#9a9a96', letterSpacing: '0.08em',
                    } }, "AGENT")),
            React.createElement("div", { className: "app-scroll", style: {
                    flex: 1, overflowY: 'auto', padding: '14px 16px 8px',
                } },
                messages.map(m => (React.createElement(ChatRow, { key: m.id, m: m, accent: accent, accentInk: accentInk, avatarVariant: avatarVariant, onNavigate: onNavigate }))),
                typing && React.createElement(TypingRow, { accent: accent, avatarVariant: avatarVariant }),
                React.createElement("div", { ref: bottomRef })),
            messages.length <= 2 && !typing && (React.createElement("div", { style: {
                    display: 'flex', gap: 6, overflowX: 'auto', padding: '0 16px 8px',
                } }, QUICK_CHIPS.map(c => (React.createElement("button", { key: c, onClick: () => send(c), className: "press", style: {
                    flexShrink: 0, fontSize: 11.5, fontWeight: 700,
                    padding: '7px 12px', borderRadius: 999, cursor: 'pointer',
                    background: 'rgba(255,255,255,0.65)',
                    border: '0.5px solid rgba(0,0,0,0.06)',
                    color: '#0a0a0a', whiteSpace: 'nowrap',
                } }, c))))),
            React.createElement("div", { style: {
                    padding: '8px 12px 14px', display: 'flex', gap: 8, alignItems: 'center',
                } },
                React.createElement("input", { value: input, onChange: e => setInput(e.target.value), onKeyDown: e => { if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        send();
                    } }, placeholder: typing ? '搭子在想…' : '问我任何理财问题…', disabled: typing, style: {
                        flex: 1, fontSize: 14, padding: '11px 14px', borderRadius: 22,
                        background: 'rgba(255,255,255,0.7)',
                        border: '0.5px solid rgba(0,0,0,0.08)',
                        outline: 'none', color: '#0a0a0a',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9)',
                    } }),
                React.createElement("button", { onClick: () => send(), disabled: !input.trim() || typing, className: "press", style: {
                        width: 40, height: 40, borderRadius: 20, border: 0, cursor: 'pointer',
                        background: accent, color: accentInk,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        opacity: (input.trim() && !typing) ? 1 : 0.4,
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), 0 4px 14px rgba(0,0,0,0.18)',
                    } },
                    React.createElement(Icon.Send, { size: 16, color: accentInk }))))));
}
function ChatRow({ m, accent, accentInk, avatarVariant, onNavigate }) {
    if (m.role === 'user') {
        return (React.createElement("div", { style: { display: 'flex', justifyContent: 'flex-end', marginBottom: 10 } },
            React.createElement("div", { style: {
                    maxWidth: '78%', padding: '10px 14px',
                    background: '#0a0a0a', color: '#fff', fontSize: 13.5, lineHeight: 1.5,
                    borderRadius: '18px 18px 6px 18px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                } }, m.text)));
    }
    return (React.createElement("div", { style: { display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 10 } },
        React.createElement(Buddy, { size: 28, variant: avatarVariant, accent: accent }),
        React.createElement("div", { style: {
                maxWidth: '80%', padding: '10px 14px',
                background: 'rgba(255,255,255,0.75)',
                backdropFilter: 'blur(20px) saturate(160%)',
                WebkitBackdropFilter: 'blur(20px) saturate(160%)',
                border: '0.5px solid rgba(255,255,255,0.9)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.95), 0 2px 8px rgba(0,0,0,0.06)',
                color: '#0a0a0a', fontSize: 13.5, lineHeight: 1.55,
                borderRadius: '18px 18px 18px 6px',
                whiteSpace: 'pre-wrap',
            } },
            m.text,
            m.card && React.createElement(InChatCard, { data: m.card, accent: accent, accentInk: accentInk }),
            m.action && (React.createElement("button", { onClick: () => onNavigate === null || onNavigate === void 0 ? void 0 : onNavigate(m.action.to), className: "press", style: {
                    marginTop: 8, padding: '7px 12px', borderRadius: 12, border: 0, cursor: 'pointer',
                    background: '#0a0a0a', color: '#fff', fontSize: 12, fontWeight: 700,
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                } },
                m.action.label,
                " ",
                React.createElement(Icon.Chevron, { size: 12, color: "#fff" }))))));
}
function InChatCard({ data, accent, accentInk }) {
    return (React.createElement("div", { style: {
            marginTop: 8, padding: '10px 12px', borderRadius: 14,
            background: 'rgba(0,0,0,0.04)',
            border: '0.5px solid rgba(0,0,0,0.06)',
        } },
        React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' } },
            React.createElement("span", { style: { fontSize: 10, fontWeight: 800, color: '#9a9a96', letterSpacing: '0.12em' } }, data.label),
            data.badge && (React.createElement("span", { style: {
                    fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 999,
                    background: accent, color: accentInk,
                } }, data.badge))),
        React.createElement("div", { style: { display: 'flex', alignItems: 'flex-end', gap: 4, marginTop: 4 } },
            React.createElement("span", { className: "num", style: { fontSize: 28, fontWeight: 900, color: '#0a0a0a' } }, data.value),
            React.createElement("span", { style: { fontSize: 12, color: '#9a9a96', fontWeight: 600, marginBottom: 3 } }, data.unit)),
        data.sub && React.createElement("div", { style: { fontSize: 11, color: '#9a9a96', marginTop: 2 } }, data.sub)));
}
function TypingRow({ accent, avatarVariant }) {
    return (React.createElement("div", { style: { display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 10 } },
        React.createElement(Buddy, { size: 28, variant: avatarVariant, accent: accent }),
        React.createElement("div", { style: {
                padding: '12px 16px', borderRadius: '18px 18px 18px 6px',
                background: 'rgba(255,255,255,0.75)',
                border: '0.5px solid rgba(255,255,255,0.9)',
                display: 'flex', gap: 4, alignItems: 'center',
            } }, [0, 1, 2].map(i => (React.createElement("span", { key: i, style: {
                width: 5, height: 5, borderRadius: 999, background: '#9a9a96',
                animation: `mb-bounce 1.2s ${i * 150}ms infinite ease-in-out`,
            } }))))));
}
// ═══════════════════════════════════════════════════════════════════════
// REAL AGENT — uses window.claude.complete with a strict JSON contract
// ═══════════════════════════════════════════════════════════════════════
const SCREEN_NAMES = {
    home: '首页（总览）', plan: '攒钱计划', review: '消费复盘',
    risk: '风险教育', me: '我的',
};
async function callAgent(userText, liveData, currentScreen, history) {
    var _a;
    if (typeof window === 'undefined' || !((_a = window.claude) === null || _a === void 0 ? void 0 : _a.complete)) {
        return mockReply(userText, liveData);
    }
    const hist = history.slice(-6).map(m => `${m.role === 'user' ? '用户' : '搭子'}: ${m.text}`).join('\n');
    const ctx = JSON.stringify(liveData);
    const system = `你是「攒钱搭子 AI」，专门服务大学生的理财教育智能体。规则：
1) 不推销任何金融产品；不构成投资建议；不承诺收益
2) 简短、口语化、像同龄人聊天；回复 ≤ 80 字
3) 用户当前在：${SCREEN_NAMES[currentScreen] || '首页'}页
4) 当前数据快照：${ctx}
5) 必须返回严格 JSON（不要 markdown / 不要解释），结构：
{
  "reply": "回复正文（必填，≤80字）",
  "card": { "label":"标题", "value":"数字", "unit":"单位", "badge":"可选标识", "sub":"可选子说明" } 或 null,
  "updates": { "dailyBudget":数字, "todayTotal":数字, "monthlySaved":数字, "monthlyGoal":数字, "dailyAvg":数字, "weeklyBudget":数字 } 或 null,
  "action": { "label":"按钮文案", "to":"home|plan|review|risk|me" } 或 null
}
6) 只有当用户的话明确暗示一个数值（如「我要存 800」「我每天预算改成 90」「今天又花了 30」）才返回 updates
7) 对风险问题（基金/股票/币/借贷）：必须谈风险等级、损失上限，never推荐
8) 涉及具体功能页面时可建议 action 跳转`;
    const messages = [
        { role: 'user', content: `历史对话：\n${hist || '（首次）'}\n\n用户最新：${userText}\n\n请按 JSON 结构回复。` },
    ];
    let raw;
    try {
        raw = await window.claude.complete({ system, messages });
    }
    catch (_b) {
        return mockReply(userText, liveData);
    }
    // Try to pull JSON out of the response
    const json = extractJSON(raw);
    if (!json || !json.reply)
        return mockReply(userText, liveData);
    return json;
}
function extractJSON(s) {
    if (!s)
        return null;
    // direct parse
    try {
        return JSON.parse(s);
    }
    catch (_a) { }
    // strip code fences
    const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) {
        try {
            return JSON.parse(fence[1]);
        }
        catch (_b) { }
    }
    // greedy braces
    const first = s.indexOf('{');
    const last = s.lastIndexOf('}');
    if (first >= 0 && last > first) {
        try {
            return JSON.parse(s.slice(first, last + 1));
        }
        catch (_c) { }
    }
    return null;
}
// ─── mock reasoner (fallback) ────────────────────────────────────────
function mockReply(text, d) {
    const t = text;
    if (/预算|每日|每天|算/.test(t)) {
        const m = t.match(/(\d{2,3})/);
        const v = m ? +m[1] : 84;
        return {
            reply: `按你最近 7 天的支出，我把每日预算更新到 ¥${v}，能稳稳达成 ¥${d.monthlyGoal} 目标。`,
            card: { label: '每日预算', value: String(v), unit: '元/天', badge: '已更新', sub: `本周可花 ${v * 7} 元` },
            updates: { dailyBudget: v, weeklyBudget: v * 7 },
            action: { label: '看攒钱计划', to: 'plan' },
        };
    }
    if (/基金|股票|币|杠杆|借/.test(t)) {
        return {
            reply: '简短答：高风险资产应 ≤ 总余钱的 5%。生活费不能动 —— 那是不可承受损失的钱。',
            card: { label: '风险上限', value: '5%', unit: '余钱占比', sub: '虚拟货币 / 杠杆 / 期权' },
            action: { label: '展开风险页', to: 'risk' },
        };
    }
    if (/(\d+).*目标|存\s*(\d+)|目标.*(\d+)/.test(t)) {
        const m = t.match(/(\d{3,4})/);
        const goal = m ? +m[1] : 600;
        return {
            reply: `目标 ¥${goal} 已更新。已存 ¥${d.monthlySaved}，还差 ¥${goal - d.monthlySaved}。`,
            card: { label: '目标', value: String(goal), unit: '元/月', badge: '可行' },
            updates: { monthlyGoal: goal },
        };
    }
    if (/复盘|今天|花了|消费/.test(t)) {
        const m = t.match(/(\d{2,3})/);
        const v = m ? +m[1] : d.todayTotal;
        return {
            reply: `今天累计 ¥${v}，${v > d.dailyBudget ? `超预算 ¥${v - d.dailyBudget}` : `在预算内 ✓`}。打车 ¥22 是可避免支出。`,
            card: { label: '今日支出', value: String(v), unit: '元', badge: v > d.dailyBudget ? `超 ¥${v - d.dailyBudget}` : '在预算内' },
            updates: { todayTotal: v },
            action: { label: '展开复盘', to: 'review' },
        };
    }
    return {
        reply: '我记下了。试试问：「帮我算每日预算」「我能买基金吗」「存 600 难吗」「今天花了 91」',
    };
}
Object.assign(window, { ChatOverlay });

})();
