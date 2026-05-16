(function(){
// Screens — Home, Plan, Review, Risk, Chat
// Each is rendered inside an iPhone frame on the canvas.
// Globals expected: React, Icon, Buddy, BottomNav, MiniChart, ChatBubble
const { useState } = React;
// ─── shared chrome ───────────────────────────────────────────────────
// The IOSDevice frame already renders its own status bar + dynamic island,
// so we just leave a 56px top spacer so content clears them.
function ScreenShell({ children, bg, label }) {
    return (React.createElement("div", { "data-screen-label": label, style: {
            width: '100%', height: '100%',
            background: bg || 'transparent',
            display: 'flex', flexDirection: 'column', position: 'relative',
            overflow: 'hidden',
        } },
        React.createElement("div", { className: "wallpaper" }),
        React.createElement("div", { className: "app-scroll", style: {
                flex: 1, overflowY: 'auto', overflowX: 'hidden',
                paddingTop: 56, position: 'relative', zIndex: 1,
            } }, children)));
}
function BackBar({ title, onBack }) {
    return (React.createElement("div", { style: {
            display: 'flex', alignItems: 'center', gap: 4, padding: '4px 18px 18px',
        } },
        React.createElement("button", { onClick: onBack, className: "press", style: {
                width: 36, height: 36, borderRadius: 18, border: 0, background: 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', marginLeft: -8,
            } },
            React.createElement(Icon.Back, { size: 22, color: "#fff" })),
        React.createElement("span", { style: { fontSize: 15, fontWeight: 600 } }, title)));
}
// ═══════════════════════════════════════════════════════════════════════
// 1.  HOME · 攒钱总览
// ═══════════════════════════════════════════════════════════════════════
function HomeScreen({ onNav, accent, accentInk = '#0a0a0a', navStyle, avatarVariant, chatOpen = false, layout = 'metric' }) {
    var _a, _b, _c, _d;
    // demo data
    const chartData = [
        { label: '5/3', amount: 62 },
        { label: '5/5', amount: 88 },
        { label: '5/7', amount: 45 },
        { label: '5/9', amount: 102 },
        { label: '5/11', amount: 71 },
        { label: '5/13', amount: 58 },
        { label: '今天', amount: 84 },
        { label: '5/17', amount: 78 },
        { label: '5/19', amount: 78 },
    ];
    return (React.createElement(ScreenShell, { label: "01 Home" },
        React.createElement("h1", { className: "num", style: {
                margin: '0 22px 4px', fontSize: 38, fontWeight: 800, letterSpacing: '-0.04em',
                lineHeight: 1.05,
            } }, "\u6512\u94B1\u603B\u89C8"),
        React.createElement("div", { style: { margin: '0 22px 18px', color: '#9a9a96', fontSize: 13, fontWeight: 500 } },
            "\u8DDD\u79BB\u6708\u5E95\u8FD8\u6709 ",
            React.createElement("span", { style: { color: '#0a0a0a', fontWeight: 700 } }, "16 \u5929"),
            " \u00B7 \u8BA1\u5212\u5B8C\u6210 68%"),
        React.createElement("div", { className: "dotmask", style: {
                margin: '0 18px 16px', borderRadius: 28,
                background: 'linear-gradient(155deg, #36363a 0%, #1a1a1d 100%)',
                border: '0.5px solid rgba(255,255,255,0.10)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 12px 36px rgba(0,0,0,0.22)',
                padding: '20px 22px 22px', color: '#fff', position: 'relative', overflow: 'hidden',
            } },
            React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' } },
                React.createElement("div", { style: {
                        fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase',
                        color: 'rgba(255,255,255,0.5)', fontWeight: 700,
                    } }, "\u65E5\u5747\u6D88\u8D39"),
                React.createElement("div", { style: {
                        fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 600,
                        background: 'rgba(255,255,255,0.10)', padding: '4px 8px', borderRadius: 999,
                    } }, "\u672C\u5468")),
            React.createElement("div", { style: { display: 'flex', alignItems: 'flex-end', gap: 6, margin: '12px 0 14px' } },
                React.createElement(PulseNum, { value: (_a = data === null || data === void 0 ? void 0 : data.dailyAvg) !== null && _a !== void 0 ? _a : 72, pulseKey: pulse === null || pulse === void 0 ? void 0 : pulse.dailyAvg, style: { fontSize: 72, fontWeight: 900, lineHeight: 0.9 } }),
                React.createElement("span", { style: { color: 'rgba(255,255,255,0.5)', fontSize: 18, fontWeight: 500, marginBottom: 8 } }, "\u5143/\u5929")),
            React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                React.createElement("div", { style: {
                        display: 'inline-flex', alignItems: 'center', gap: 3,
                        background: accent, color: accentInk, fontSize: 11.5, fontWeight: 800,
                        padding: '4px 9px', borderRadius: 999,
                    } },
                    React.createElement(Icon.ArrowDown, { size: 11 }),
                    " 18%"),
                React.createElement("span", { style: { color: 'rgba(255,255,255,0.65)', fontSize: 12.5 } }, "\u4F4E\u4E8E\u4E0A\u5468\u5747\u503C")),
            React.createElement("div", { style: {
                    marginTop: 18, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.12)',
                    display: 'flex', gap: 22,
                } }, [
                { l: '已存', k: 'monthlySaved', v: (_b = data === null || data === void 0 ? void 0 : data.monthlySaved) !== null && _b !== void 0 ? _b : 408, u: `/ ${(_c = data === null || data === void 0 ? void 0 : data.monthlyGoal) !== null && _c !== void 0 ? _c : 600} 元` },
                { l: '日预算', k: 'dailyBudget', v: (_d = data === null || data === void 0 ? void 0 : data.dailyBudget) !== null && _d !== void 0 ? _d : 84, u: '元/天' },
                { l: '连击', k: null, v: 5, u: '天内未超支' },
            ].map((o) => (React.createElement("div", { key: o.l },
                React.createElement("div", { style: { fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginBottom: 2 } }, o.l.toUpperCase()),
                React.createElement("div", { style: { fontSize: 18, fontWeight: 800 } },
                    React.createElement(PulseNum, { value: o.v, pulseKey: o.k ? pulse === null || pulse === void 0 ? void 0 : pulse[o.k] : 0 }),
                    " ",
                    React.createElement("span", { style: { fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 500 } }, o.u))))))),
        React.createElement("div", { style: {
                margin: '0 18px 20px', background: 'rgba(255,255,255,0.45)', borderRadius: 28,
                padding: '16px 12px 8px',
            } },
            React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between', padding: '0 8px 6px' } },
                React.createElement("div", { style: { display: 'flex', gap: 14, alignItems: 'baseline' } },
                    React.createElement("span", { style: { fontSize: 13, fontWeight: 700, color: '#0a0a0a' } }, "\u6D88\u8D39\u8D8B\u52BF"),
                    React.createElement("span", { style: { fontSize: 11, color: '#9a9a96', fontWeight: 600 } }, "\u8FD1 9 \u5929 \u00B7 \u9884\u6D4B 2 \u5929")),
                React.createElement("div", { style: { display: 'flex', gap: 4 } }, ['周', '月', '年'].map((t, i) => (React.createElement("span", { key: t, style: {
                        fontSize: 11, fontWeight: 700,
                        padding: '4px 10px', borderRadius: 999,
                        background: i === 0 ? '#0a0a0a' : 'transparent',
                        color: i === 0 ? '#fff' : '#bdbdb8',
                    } }, t))))),
            React.createElement(MiniChart, { data: chartData, predicted: 2, budget: 90, accent: accent, height: 140 })),
        React.createElement("div", { style: { padding: '0 22px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' } },
            React.createElement("h2", { style: { fontSize: 18, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' } }, "\u4ECA\u5929\u505A\u4EC0\u4E48"),
            React.createElement("span", { style: { fontSize: 12, color: '#9a9a96', fontWeight: 600 } }, "3 \u9879")),
        React.createElement("div", { style: { padding: '0 18px 36px', display: 'flex', flexDirection: 'column', gap: 8 } },
            React.createElement(ActionRow, { tag: "\u8BA1\u5212", tagBg: accent, tagColor: accentInk, title: "\u8FD8\u6CA1\u590D\u76D8\u4ECA\u5929\u6D88\u8D39", desc: "\u4ECA\u5929\u5348\u9910 + \u5976\u8336\u5DF2\u7ECF\u8BB0 3 \u7B14\u4E86", onClick: () => onNav('review') }),
            React.createElement(ActionRow, { tag: "\u5EFA\u8BAE", tagBg: "#0a0a0a", tagColor: "#fff", title: "\u8C03\u6574\u6BCF\u65E5\u9884\u7B97 \u00A584 \u2192 \u00A590", desc: "\u6309\u8FD1 7 \u5929\u6570\u636E\uFF0C\u4F60\u5DF2\u7ECF\u8D85\u652F 2 \u6B21", onClick: () => onNav('plan') }),
            React.createElement(ActionRow, { tag: "\u5B66\u4E60", tagBg: "#f3f3f1", tagColor: "#0a0a0a", title: "3 \u5206\u949F\u770B\u61C2\u300C\u8D27\u5E01\u57FA\u91D1\u300D", desc: "\u4E0D\u63A8\u9500 \u00B7 \u53EA\u89E3\u91CA\u98CE\u9669", onClick: () => onNav('risk') })),
        React.createElement("div", { style: { height: 96 } }),
        React.createElement(BottomNav, { active: "home", onNav: onNav, style: navStyle, accent: accent, chatOpen: chatOpen })));
}
function ActionRow({ tag, tagBg, tagColor, title, desc, onClick }) {
    return (React.createElement("button", { onClick: onClick, className: "press", style: {
            width: '100%', textAlign: 'left', border: 0, background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(28px) saturate(180%)', WebkitBackdropFilter: 'blur(28px) saturate(180%)',
            borderRadius: 22, padding: '14px 16px',
            boxShadow: '0 1px 0 rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.04)',
            display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
        } },
        React.createElement("div", { style: { flex: 1 } },
            React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 } },
                React.createElement("span", { style: {
                        fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 999,
                        background: tagBg, color: tagColor, letterSpacing: '0.04em',
                    } }, tag)),
            React.createElement("div", { style: { fontSize: 14.5, fontWeight: 700, color: '#fff' } }, title),
            React.createElement("div", { style: { fontSize: 12, color: '#9a9a96', marginTop: 2 } }, desc)),
        React.createElement(Icon.Chevron, { color: "#c8c8c4" })));
}
// ═══════════════════════════════════════════════════════════════════════
// 2.  SAVING PLAN
// ═══════════════════════════════════════════════════════════════════════
function PlanScreen({ onNav, accent, accentInk = '#0a0a0a', navStyle, avatarVariant, chatOpen = false }) {
    var _a, _b, _c, _d;
    const [style, setStyle] = useState('balanced');
    return (React.createElement(ScreenShell, { label: "02 Plan" },
        React.createElement(BackBar, { title: "\u6512\u94B1\u8BA1\u5212", onBack: () => onNav('home') }),
        React.createElement("div", { style: { padding: '0 22px' } },
            React.createElement("div", { style: { fontSize: 11, color: '#9a9a96', fontWeight: 700, letterSpacing: '0.12em' } }, "STEP 02 / 03"),
            React.createElement("h1", { className: "num", style: {
                    margin: '6px 0 4px', fontSize: 34, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1,
                } },
                "\u80FD\u5B58\u591A\u5C11\uFF0C",
                React.createElement("br", null),
                "\u6211\u5E2E\u4F60\u7B97"),
            React.createElement("p", { style: { color: '#9a9a96', fontSize: 13.5, margin: '8px 0 22px' } }, "\u544A\u8BC9\u6211\u4F60\u7684\u6536\u5165\u548C\u76EE\u6807\uFF0C\u6211\u4F1A\u62C6\u6210\u6BCF\u65E5\u9884\u7B97\u548C\u53EF\u884C\u6027\u8BC4\u4F30")),
        React.createElement("div", { style: {
                margin: '0 18px 18px', borderRadius: 32, padding: '20px 22px 22px',
                background: accent, color: accentInk, position: 'relative', overflow: 'hidden',
                border: '0.5px solid rgba(255,255,255,0.20)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.28), inset 0 -1px 0 rgba(0,0,0,0.10), 0 12px 36px rgba(0,0,0,0.45)',
            } },
            React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' } },
                React.createElement("div", { style: { fontSize: 10, letterSpacing: '0.18em', fontWeight: 800 } }, "EVERY DAY \u00B7 \u6BCF\u65E5\u9884\u7B97"),
                React.createElement("span", { style: {
                        background: accentInk === '#ffffff' ? 'rgba(255,255,255,0.18)' : '#0a0a0a',
                        color: accentInk === '#ffffff' ? '#fff' : '#fff',
                        fontSize: 10, fontWeight: 800,
                        padding: '4px 9px', borderRadius: 999,
                    } }, "\u2713 \u53EF\u884C")),
            React.createElement("div", { style: { display: 'flex', alignItems: 'flex-end', gap: 8, marginTop: 14 } },
                React.createElement(PulseNum, { value: (_a = data === null || data === void 0 ? void 0 : data.dailyBudget) !== null && _a !== void 0 ? _a : 84, pulseKey: pulse === null || pulse === void 0 ? void 0 : pulse.dailyBudget, style: { fontSize: 92, fontWeight: 900, lineHeight: 0.85 } }),
                React.createElement("span", { style: { fontSize: 18, fontWeight: 600, marginBottom: 10 } }, "\u5143 / \u5929")),
            React.createElement("div", { style: {
                    marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14,
                    paddingTop: 16, borderTop: `1px solid ${accentInk === '#ffffff' ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)'}`,
                } }, [
                { l: '每周', k: 'weeklyBudget', v: (_b = data === null || data === void 0 ? void 0 : data.weeklyBudget) !== null && _b !== void 0 ? _b : 588, u: '元' },
                { l: '本月可花', k: 'monthlySpendable', v: ((_c = data === null || data === void 0 ? void 0 : data.monthlySpendable) !== null && _c !== void 0 ? _c : 2520).toLocaleString(), u: '元' },
                { l: '目标', k: 'monthlyGoal', v: (_d = data === null || data === void 0 ? void 0 : data.monthlyGoal) !== null && _d !== void 0 ? _d : 600, u: '元' },
            ].map(o => (React.createElement("div", { key: o.l },
                React.createElement("div", { style: { fontSize: 10, fontWeight: 700, opacity: 0.55 } }, o.l.toUpperCase()),
                React.createElement("div", { style: { fontSize: 19, fontWeight: 800, marginTop: 2 } },
                    React.createElement(PulseNum, { value: o.v, pulseKey: pulse === null || pulse === void 0 ? void 0 : pulse[o.k] }),
                    React.createElement("span", { style: { fontSize: 10, opacity: 0.55, marginLeft: 2 } }, o.u))))))),
        React.createElement("div", { style: { margin: '0 18px 16px', display: 'flex', gap: 10, alignItems: 'flex-start' } },
            React.createElement(Buddy, { size: 28, variant: avatarVariant, accent: accent }),
            React.createElement("div", { style: {
                    background: 'rgba(255,255,255,0.45)', borderRadius: '4px 18px 18px 18px',
                    padding: '12px 14px', fontSize: 13.5, lineHeight: 1.55, color: '#3a3a38', flex: 1,
                } },
                "\u6309\u5E73\u8861\u98CE\u683C\u62C6\u4E0B\u6765\u6BCF\u5929 \u00A584 \u8FD8\u633A\u5BBD\u88D5\u7684\u3002\u91CD\u70B9\u5173\u6CE8 ",
                React.createElement("b", null, "\u5916\u5356"),
                " \u548C ",
                React.createElement("b", null, "\u5976\u8336"),
                "\uFF0C \u8FD9\u4E24\u9879\u5360\u4E86\u4E0A\u6708\u53EF\u4F18\u5316\u90E8\u5206\u7684 60%\u3002\u672C\u5468\u5982\u679C\u90FD\u4E0D\u70B9\u5916\u5356\uFF0C\u80FD\u591A\u5B58 80~120 \u5143\u3002")),
        React.createElement("div", { style: { padding: '4px 22px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' } },
            React.createElement("h2", { style: { fontSize: 15, fontWeight: 800, margin: 0 } }, "\u8BA1\u5212\u57FA\u7840"),
            React.createElement("span", { style: { fontSize: 11, color: '#9a9a96', fontWeight: 600 } }, "\u70B9\u51FB\u4FEE\u6539")),
        React.createElement("div", { style: { padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 8 } },
            React.createElement(FormRow, { label: "\u6708\u751F\u6D3B\u8D39", value: "3,000", unit: "\u5143" }),
            React.createElement(FormRow, { label: "\u56FA\u5B9A\u652F\u51FA", value: "1,200", unit: "\u5143 (\u623F\u79DF 800 + \u8BDD\u8D39 50\u2026)" }),
            React.createElement(FormRow, { label: "\u672C\u6708\u76EE\u6807", value: "600", unit: "\u5143 / \u6708" }),
            React.createElement(FormRow, { label: "\u5269\u4F59\u5929\u6570", value: "16", unit: "\u5929" })),
        React.createElement("div", { style: { padding: '12px 22px 0', fontSize: 15, fontWeight: 800 } }, "\u98CE\u683C"),
        React.createElement("div", { style: { padding: '10px 18px 24px', display: 'flex', gap: 8 } }, [
            { id: 'strict', label: '严格', sub: '更激进' },
            { id: 'balanced', label: '平衡', sub: '推荐' },
            { id: 'relaxed', label: '宽松', sub: '更友好' },
        ].map(o => (React.createElement("button", { key: o.id, className: "press", onClick: () => setStyle(o.id), style: {
                flex: 1, border: 0, cursor: 'pointer',
                background: style === o.id ? '#0a0a0a' : '#f3f3f1',
                color: style === o.id ? '#fff' : '#0a0a0a',
                borderRadius: 16, padding: '14px 8px',
                display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center',
            } },
            React.createElement("span", { style: { fontSize: 14, fontWeight: 800 } }, o.label),
            React.createElement("span", { style: { fontSize: 10, opacity: 0.6, fontWeight: 600 } }, o.sub))))),
        React.createElement("div", { style: {
                margin: '0 18px 16px', padding: '14px 16px',
                background: 'linear-gradient(155deg, #2e2e32 0%, #18181b 100%)',
                border: '0.5px solid rgba(255,255,255,0.10)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.16), 0 8px 24px rgba(0,0,0,0.20)',
                borderRadius: 22, color: '#fff',
                display: 'flex', alignItems: 'center', gap: 12,
            } },
            React.createElement("div", { style: {
                    width: 36, height: 36, borderRadius: 18, background: accent,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                } },
                React.createElement(Icon.Spark, { color: accentInk, size: 18 })),
            React.createElement("div", { style: { flex: 1 } },
                React.createElement("div", { style: { fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 800, letterSpacing: '0.12em' } }, "\u672C\u5468\u4E00\u4EF6\u4E8B"),
                React.createElement("div", { style: { fontSize: 13.5, fontWeight: 700, marginTop: 2 } }, "\u5916\u5356 / \u5976\u8336\u7D2F\u8BA1\u4E0D\u8D85\u8FC7 90 \u5143")),
            React.createElement(Icon.Chevron, { color: "#9a9a96" })),
        React.createElement("div", { style: { height: 96 } }),
        React.createElement(BottomNav, { active: "plan", onNav: onNav, style: navStyle, accent: accent, chatOpen: chatOpen })));
}
function FormRow({ label, value, unit }) {
    return (React.createElement("div", { style: {
            background: 'rgba(255,255,255,0.45)', borderRadius: 18, padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: 10,
        } },
        React.createElement("span", { style: { fontSize: 12, color: '#9a9a96', fontWeight: 600, width: 76 } }, label),
        React.createElement("span", { className: "num", style: { fontSize: 18, fontWeight: 800, color: '#fff' } }, value),
        React.createElement("span", { style: { fontSize: 11, color: '#9a9a96', fontWeight: 500, flex: 1 } }, unit),
        React.createElement(Icon.Chevron, { size: 14, color: "#c8c8c4" })));
}
// ═══════════════════════════════════════════════════════════════════════
// 3.  EXPENSE REVIEW
// ═══════════════════════════════════════════════════════════════════════
function ReviewScreen({ onNav, accent, accentInk = '#0a0a0a', navStyle, avatarVariant, chatOpen = false }) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const cats = [
        { key: 'nec', tag: '必要', amount: 18, items: ['食堂 ¥18'], tone: 'gray' },
        { key: 'opt', tag: '可优化', amount: 51, items: ['奶茶 ¥16', '外卖 ¥35'], tone: 'soft' },
        { key: 'imp', tag: '冲动', amount: 22, items: ['打车 ¥22'], tone: 'accent' },
        { key: 'learn', tag: '学习', amount: 8, items: ['打印资料 ¥8'], tone: 'dark' },
    ];
    const total = cats.reduce((s, c) => s + c.amount, 0);
    return (React.createElement(ScreenShell, { label: "03 Review" },
        React.createElement(BackBar, { title: "\u4ECA\u65E5\u590D\u76D8", onBack: () => onNav('home') }),
        React.createElement("div", { style: { padding: '0 22px 4px' } },
            React.createElement("div", { style: { fontSize: 11, color: '#9a9a96', fontWeight: 700, letterSpacing: '0.12em' } }, "5 \u6708 15 \u65E5 \u00B7 \u5468\u56DB"),
            React.createElement("h1", { className: "num", style: { margin: '4px 0 0', fontSize: 30, fontWeight: 800, letterSpacing: '-0.03em' } }, "\u590D\u76D8\u4E00\u4E0B\u4ECA\u5929")),
        React.createElement("div", { style: {
                margin: '18px 18px 16px', borderRadius: 28, padding: '20px 22px 22px',
                background: 'linear-gradient(155deg, #36363a 0%, #1a1a1d 100%)',
                border: '0.5px solid rgba(255,255,255,0.10)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 12px 36px rgba(0,0,0,0.22)',
                color: '#fff', position: 'relative', overflow: 'hidden',
            } },
            React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' } },
                React.createElement("div", { style: { fontSize: 10, letterSpacing: '0.18em', fontWeight: 800, color: 'rgba(255,255,255,0.5)' } }, "TODAY \u00B7 \u603B\u652F\u51FA"),
                React.createElement("span", { style: {
                        background: accent, color: accentInk, fontSize: 11, fontWeight: 800,
                        padding: '4px 9px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 3,
                    } },
                    React.createElement(Icon.ArrowUp, { size: 10, color: accentInk }),
                    " ",
                    ((_a = data === null || data === void 0 ? void 0 : data.todayTotal) !== null && _a !== void 0 ? _a : total) > ((_b = data === null || data === void 0 ? void 0 : data.dailyBudget) !== null && _b !== void 0 ? _b : 84) ? `超支 ¥${((_c = data === null || data === void 0 ? void 0 : data.todayTotal) !== null && _c !== void 0 ? _c : total) - ((_d = data === null || data === void 0 ? void 0 : data.dailyBudget) !== null && _d !== void 0 ? _d : 84)}` : '在预算内')),
            React.createElement("div", { style: { display: 'flex', alignItems: 'flex-end', gap: 6, marginTop: 12 } },
                React.createElement(PulseNum, { value: (_e = data === null || data === void 0 ? void 0 : data.todayTotal) !== null && _e !== void 0 ? _e : total, pulseKey: pulse === null || pulse === void 0 ? void 0 : pulse.todayTotal, style: { fontSize: 80, fontWeight: 900, lineHeight: 0.85 } }),
                React.createElement("span", { style: { fontSize: 18, color: 'rgba(255,255,255,0.5)', fontWeight: 500, marginBottom: 8 } }, "\u5143")),
            React.createElement("div", { style: { marginTop: 6, fontSize: 12, color: 'rgba(255,255,255,0.55)' } },
                "\u9884\u7B97 \u00A5", (_f = data === null || data === void 0 ? void 0 : data.dailyBudget) !== null && _f !== void 0 ? _f : 84,
                " \u00B7 \u7528\u6389 ",
                React.createElement("b", { style: { color: '#fff', fontWeight: 800 } },
                    Math.round(((_g = data === null || data === void 0 ? void 0 : data.todayTotal) !== null && _g !== void 0 ? _g : total) / ((_h = data === null || data === void 0 ? void 0 : data.dailyBudget) !== null && _h !== void 0 ? _h : 84) * 100),
                    "%")),
            React.createElement("div", { style: {
                    height: 8, background: 'rgba(0,0,0,0.06)', borderRadius: 999,
                    marginTop: 16, display: 'flex', overflow: 'hidden', gap: 2,
                } }, cats.map(c => {
                const fill = c.key === 'nec' ? 'rgba(255,255,255,0.92)'
                    : c.key === 'opt' ? 'rgba(255,255,255,0.55)'
                        : c.key === 'imp' ? accent
                            : 'rgba(255,255,255,0.25)';
                return (React.createElement("div", { key: c.key, style: { width: `${c.amount / total * 100}%`, background: fill } }));
            })),
            React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between', marginTop: 10 } }, cats.map(c => {
                const fill = c.key === 'nec' ? 'rgba(255,255,255,0.92)'
                    : c.key === 'opt' ? 'rgba(255,255,255,0.55)'
                        : c.key === 'imp' ? accent
                            : 'rgba(255,255,255,0.25)';
                return (React.createElement("div", { key: c.key, style: {
                        fontSize: 10, color: '#7a7a78', fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: 4,
                    } },
                    React.createElement("span", { style: { width: 6, height: 6, borderRadius: 999, background: fill } }),
                    c.tag,
                    " ",
                    React.createElement("span", { style: { color: 'rgba(255,255,255,0.85)', fontWeight: 800 } },
                        "\u00A5",
                        c.amount)));
            }))),
        React.createElement("div", { style: { margin: '0 18px 16px', display: 'flex', gap: 10, alignItems: 'flex-start' } },
            React.createElement(Buddy, { size: 28, variant: avatarVariant, accent: accent }),
            React.createElement("div", { style: {
                    background: 'linear-gradient(155deg, #2e2e32 0%, #18181b 100%)',
                    color: '#fff', borderRadius: '4px 18px 18px 18px',
                    border: '0.5px solid rgba(255,255,255,0.10)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.16), 0 8px 22px rgba(0,0,0,0.20)',
                    padding: '12px 14px', fontSize: 13.5, lineHeight: 1.55, flex: 1,
                } },
                "\u6253\u8F66 \u00A522 \u662F\u4ECA\u5929\u6700\u5927\u7684\u53EF\u907F\u514D\u652F\u51FA \u2014\u2014 \u90A3\u6761\u8DEF\u5730\u94C1\u76F4\u8FBE\u53EA\u8981 \u00A54\u3002 \u5976\u8336\u53EF\u4EE5\u9694\u5929\u559D\uFF0C\u7701\u4E0B\u7684 \u00A580/\u6708 \u591F\u4E70\u534A\u4E2A\u6708\u5348\u9910\u4E86\u3002",
                React.createElement("div", { style: {
                        marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.12)',
                        fontSize: 11, color: 'rgba(255,255,255,0.5)', display: 'flex', justifyContent: 'space-between'
                    } },
                    React.createElement("span", null, "\u660E\u65E5\u9884\u7B97 \u00B7 \u00A584"),
                    React.createElement("span", { style: { color: accent, fontWeight: 700 } }, "\u5C55\u5F00\u5EFA\u8BAE \u2192")))),
        React.createElement("div", { style: { padding: '4px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' } },
            React.createElement("h2", { style: { fontSize: 15, fontWeight: 800, margin: 0 } }, "\u6D88\u8D39\u660E\u7EC6"),
            React.createElement("span", { style: { fontSize: 11, color: '#9a9a96', fontWeight: 600 } },
                cats.length,
                " \u7C7B \u00B7 ",
                cats.reduce((s, c) => s + c.items.length, 0),
                " \u7B14")),
        React.createElement("div", { style: { padding: '10px 18px 30px', display: 'flex', flexDirection: 'column', gap: 8 } },
            cats.map(c => {
                const tile = c.tone === 'accent' ? { bg: accent, fg: accentInk }
                    : c.tone === 'dark' ? { bg: '#2e2e2e', fg: '#fff' }
                        : c.tone === 'soft' ? { bg: '#e7e7e3', fg: '#0a0a0a' }
                            : { bg: '#f3f3f1', fg: '#0a0a0a' };
                return (React.createElement("div", { key: c.key, style: {
                        background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(28px) saturate(180%)', WebkitBackdropFilter: 'blur(28px) saturate(180%)', borderRadius: 20, padding: '14px 16px',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8), 0 4px 18px rgba(0,0,0,0.05)', border: '0.5px solid rgba(0,0,0,0.04)',
                        display: 'flex', alignItems: 'center', gap: 14,
                    } },
                    React.createElement("div", { style: {
                            width: 44, height: 44, borderRadius: 14, background: tile.bg, color: tile.fg,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 800,
                        } }, c.tag),
                    React.createElement("div", { style: { flex: 1, minWidth: 0 } },
                        React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' } },
                            React.createElement("span", { style: { fontSize: 13, fontWeight: 800 } },
                                c.tag,
                                "\u6D88\u8D39"),
                            React.createElement("span", { className: "num", style: { fontSize: 18, fontWeight: 800 } },
                                "\u00A5",
                                c.amount)),
                        React.createElement("div", { style: {
                                marginTop: 4, fontSize: 12, color: '#9a9a96',
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            } }, c.items.join('  ·  ')))));
            }),
            React.createElement("button", { className: "press", style: {
                    border: '1.5px dashed rgba(0,0,0,0.10)', background: 'transparent',
                    borderRadius: 20, padding: '14px', color: '#9a9a96',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    fontSize: 13, fontWeight: 700, cursor: 'pointer',
                } },
                React.createElement(Icon.Plus, { size: 16, color: "#9a9a96" }),
                " \u518D\u8BB0\u4E00\u7B14")),
        React.createElement("div", { style: { height: 96 } }),
        React.createElement(BottomNav, { active: "review", onNav: onNav, style: navStyle, accent: accent, chatOpen: chatOpen })));
}
// ═══════════════════════════════════════════════════════════════════════
// 4.  RISK EDUCATION
// ═══════════════════════════════════════════════════════════════════════
function RiskScreen({ onNav, accent, accentInk = '#0a0a0a', navStyle, avatarVariant, chatOpen = false }) {
    const riskLevel = 4; // 0-4 → 低 / 中低 / 中 / 高 / 极高
    const levels = ['低', '中低', '中', '高', '极高'];
    return (React.createElement(ScreenShell, { label: "04 Risk" },
        React.createElement(BackBar, { title: "\u7406\u8D22\u98CE\u9669", onBack: () => onNav('home') }),
        React.createElement("div", { style: { padding: '0 22px 4px' } },
            React.createElement("div", { style: { fontSize: 11, color: '#9a9a96', fontWeight: 700, letterSpacing: '0.12em' } }, "NOT FINANCIAL ADVICE"),
            React.createElement("h1", { className: "num", style: { margin: '4px 0 8px', fontSize: 30, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15 } },
                "\u4E0D\u63A8\u9500\uFF0C",
                React.createElement("br", null),
                "\u53EA\u5E2E\u4F60\u770B\u61C2\u98CE\u9669")),
        React.createElement("div", { style: {
                margin: '14px 18px 0',
                background: 'linear-gradient(155deg, #2e2e32 0%, #18181b 100%)',
                border: '0.5px solid rgba(255,255,255,0.10)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.16), 0 8px 22px rgba(0,0,0,0.20)',
                borderRadius: 22, padding: '14px 16px', color: '#fff',
            } },
            React.createElement("div", { style: { fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 800, letterSpacing: '0.16em' } }, "\u4F60\u95EE"),
            React.createElement("div", { style: { fontSize: 15, fontWeight: 700, marginTop: 4 } }, "\u6211\u80FD\u4E0D\u80FD\u62FF\u751F\u6D3B\u8D39\u4E70\u865A\u62DF\u8D27\u5E01\uFF1F")),
        React.createElement("div", { style: {
                margin: '14px 18px 16px', borderRadius: 28, padding: '22px 22px 18px',
                background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(28px) saturate(180%)', WebkitBackdropFilter: 'blur(28px) saturate(180%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8), 0 4px 18px rgba(0,0,0,0.05)', border: '0.5px solid rgba(0,0,0,0.04)',
            } },
            React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' } },
                React.createElement("div", { style: { fontSize: 10, fontWeight: 800, color: '#9a9a96', letterSpacing: '0.16em' } }, "\u98CE\u9669\u7B49\u7EA7"),
                React.createElement("span", { style: {
                        background: accent, color: accentInk, fontSize: 11, fontWeight: 800,
                        padding: '4px 9px', borderRadius: 999,
                    } }, "\u5B66\u751F\u4E0D\u9002\u5408")),
            React.createElement("div", { style: { display: 'flex', alignItems: 'flex-end', gap: 8, marginTop: 6 } },
                React.createElement("span", { className: "num", style: { fontSize: 64, fontWeight: 900, lineHeight: 0.85, color: '#fff' } }, "\u6781\u9AD8"),
                React.createElement("span", { style: { fontSize: 13, color: '#9a9a96', fontWeight: 600, marginBottom: 8 } }, "5 / 5 \u7EA7")),
            React.createElement("div", { style: { marginTop: 18, display: 'flex', gap: 4 } }, levels.map((_, i) => {
                const tones = ['#dededa', '#b8b8b3', '#7c7c78', '#3e3e3c', accent];
                return (React.createElement("div", { key: i, style: {
                        flex: 1, height: 8, borderRadius: 999,
                        background: i <= riskLevel ? tones[i] : '#f3f3f1',
                    } }));
            })),
            React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between', marginTop: 8 } }, levels.map((l, i) => (React.createElement("span", { key: l, style: {
                    fontSize: 10, fontWeight: 700,
                    color: i === riskLevel ? '#0a0a0a' : '#c8c8c4',
                } }, l))))),
        React.createElement("div", { style: { margin: '0 18px 16px', display: 'flex', gap: 10, alignItems: 'flex-start' } },
            React.createElement(Buddy, { size: 28, variant: avatarVariant, accent: accent }),
            React.createElement("div", { style: {
                    background: 'rgba(255,255,255,0.45)', borderRadius: '4px 18px 18px 18px',
                    padding: '14px 16px', fontSize: 13.5, lineHeight: 1.6, color: '#0a0a0a', flex: 1,
                } },
                "\u76F4\u63A5\u8BF4\u7ED3\u8BBA\uFF1A",
                React.createElement("b", null, "\u4E0D\u80FD\u3002"),
                "\u4E0D\u662F\u9053\u5FB7\u5224\u65AD\uFF0C\u662F\u6570\u5B66\u95EE\u9898 \u2014\u2014",
                React.createElement("ul", { style: { margin: '8px 0 0', paddingLeft: 18, fontSize: 13, color: '#3a3a38' } },
                    React.createElement("li", { style: { marginBottom: 4 } }, "\u65E5\u5185 30~50% \u6CE2\u52A8\u5C5E\u4E8E\u5E38\u6001"),
                    React.createElement("li", { style: { marginBottom: 4 } }, "\u751F\u6D3B\u8D39 = \u4E0D\u53EF\u627F\u53D7\u635F\u5931\u7684\u94B1"),
                    React.createElement("li", null, "\u4F60\u9700\u8981\u7684\u662F\u300C\u4E8F\u5B8C\u4E0D\u5F71\u54CD\u4E0B\u4E2A\u6708\u5403\u996D\u300D\u7684\u4F59\u94B1")))),
        React.createElement("div", { style: { padding: '0 22px', fontSize: 15, fontWeight: 800, marginBottom: 10 } }, "\u8BE5\u95EE\u4E4B\u524D\u5148\u60F3"),
        React.createElement("div", { style: { padding: '0 18px 12px', display: 'flex', flexDirection: 'column', gap: 8 } }, [
            { n: 1, t: '损失上限', d: '极端情况会归零，能接受这笔钱完全消失吗？' },
            { n: 2, t: '应急备份', d: '生活费是用来吃饭住宿的，没有冗余金' },
            { n: 3, t: '资产配置', d: '高风险资产应 ≤ 总余钱的 5%，不是 100%' },
        ].map(r => (React.createElement("div", { key: r.n, style: {
                background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(28px) saturate(180%)', WebkitBackdropFilter: 'blur(28px) saturate(180%)', borderRadius: 20, padding: '14px 16px',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8), 0 4px 18px rgba(0,0,0,0.05)', border: '0.5px solid rgba(0,0,0,0.04)',
                display: 'flex', alignItems: 'flex-start', gap: 14,
            } },
            React.createElement("span", { className: "num", style: {
                    fontSize: 24, fontWeight: 900, color: '#c8c8c4', width: 26, flexShrink: 0,
                } },
                "0",
                r.n),
            React.createElement("div", null,
                React.createElement("div", { style: { fontSize: 13.5, fontWeight: 800 } }, r.t),
                React.createElement("div", { style: { fontSize: 12, color: '#9a9a96', marginTop: 3 } }, r.d)))))),
        React.createElement("div", { style: {
                margin: '8px 18px 16px', padding: '14px 16px', background: accent,
                borderRadius: 22, color: accentInk,
                border: '0.5px solid rgba(255,255,255,0.20)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22), 0 8px 22px rgba(0,0,0,0.35)',
                display: 'flex', alignItems: 'center', gap: 12,
            } },
            React.createElement(Icon.Spark, { color: accentInk, size: 20 }),
            React.createElement("div", { style: { flex: 1 } },
                React.createElement("div", { style: { fontSize: 10, fontWeight: 800, opacity: 0.55, letterSpacing: '0.12em' } }, "\u5EFA\u8BAE"),
                React.createElement("div", { style: { fontSize: 13, fontWeight: 700, marginTop: 1 } }, "\u5148\u5B58\u591F 3 \u4E2A\u6708\u751F\u6D3B\u8D39\uFF0C\u518D\u8003\u8651\u6295\u8D44"))),
        React.createElement("div", { style: { padding: '4px 22px 0', fontSize: 10.5, color: '#bdbdb8', textAlign: 'center', lineHeight: 1.5 } }, "\uD83D\uDD12 \u672C\u56DE\u7B54\u4EC5\u4F9B\u7406\u8D22\u6559\u80B2\u53C2\u8003\uFF0C\u4E0D\u6784\u6210\u4EFB\u4F55\u6295\u8D44\u5EFA\u8BAE"),
        React.createElement("div", { style: { height: 96 } }),
        React.createElement(BottomNav, { active: "risk", onNav: onNav, style: navStyle, accent: accent, chatOpen: chatOpen })));
}
// ═══════════════════════════════════════════════════════════════════════
// 5.  CHAT
// ═══════════════════════════════════════════════════════════════════════
function ChatScreen({ onNav, accent, accentInk = '#0a0a0a', avatarVariant }) {
    return (React.createElement(ScreenShell, { label: "05 Chat", bg: "transparent" },
        React.createElement("div", { style: {
                background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(28px) saturate(180%)', WebkitBackdropFilter: 'blur(28px) saturate(180%)', padding: '4px 16px 14px',
                boxShadow: '0 1px 0 rgba(0,0,0,0.04)',
                display: 'flex', alignItems: 'center', gap: 12,
            } },
            React.createElement("button", { onClick: () => onNav('home'), className: "press", style: {
                    width: 36, height: 36, borderRadius: 18, border: 0, background: 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginLeft: -8,
                } },
                React.createElement(Icon.Back, { size: 22, color: "#fff" })),
            React.createElement(Buddy, { size: 40, variant: avatarVariant, accent: accent }),
            React.createElement("div", { style: { flex: 1 } },
                React.createElement("div", { style: { fontSize: 15, fontWeight: 800 } }, "\u6512\u94B1\u642D\u5B50"),
                React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 } },
                    React.createElement("span", { style: { width: 6, height: 6, borderRadius: 999, background: '#16b86c' } }),
                    React.createElement("span", { style: { fontSize: 11, color: '#9a9a96', fontWeight: 600 } }, "\u5728\u7EBF \u00B7 \u4E0D\u63A8\u9500\u4EA7\u54C1"))),
            React.createElement("button", { className: "press", style: {
                    width: 36, height: 36, borderRadius: 18, border: 0, background: 'rgba(255,255,255,0.45)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                } },
                React.createElement("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "#0a0a0a", strokeWidth: "2.4", strokeLinecap: "round" },
                    React.createElement("circle", { cx: "12", cy: "6", r: "1.4" }),
                    React.createElement("circle", { cx: "12", cy: "12", r: "1.4" }),
                    React.createElement("circle", { cx: "12", cy: "18", r: "1.4" })))),
        React.createElement("div", { style: { padding: '16px 14px 16px', display: 'flex', flexDirection: 'column' } },
            React.createElement("div", { style: { textAlign: 'center', fontSize: 10, color: '#bdbdb8', fontWeight: 600, marginBottom: 14 } }, "5 \u6708 15 \u65E5 14:08"),
            React.createElement(ChatBubble, { role: "assistant", accent: accent },
                "\u4F60\u597D\u5440 \uD83D\uDC4B \u6211\u662F\u4F60\u7684\u6512\u94B1\u642D\u5B50\u3002",
                React.createElement("br", null),
                "\u6211\u80FD\u505A\u4E09\u4EF6\u4E8B\uFF1A",
                React.createElement("ul", { style: { margin: '6px 0 0', paddingLeft: 18, fontSize: 13.5 } },
                    React.createElement("li", null, "\u62C6\u6512\u94B1\u76EE\u6807 \u00B7 \u7B97\u6BCF\u65E5\u9884\u7B97"),
                    React.createElement("li", null, "\u590D\u76D8\u6D88\u8D39 \u00B7 \u627E\u53EF\u4F18\u5316\u9879"),
                    React.createElement("li", null, "\u89E3\u91CA\u7406\u8D22\u98CE\u9669 \u00B7 \u4E0D\u63A8\u9500\u4EA7\u54C1"))),
            React.createElement(ChatBubble, { role: "user" }, "\u4ECA\u5929\u98DF\u580218\uFF0C\u5976\u833616\uFF0C\u5916\u535635\uFF0C\u6253\u8F6622"),
            React.createElement(ChatBubble, { role: "assistant", accent: accent },
                "\u6211\u6570\u4E86\u4E00\u4E0B\uFF0C\u4ECA\u5929\u603B\u5171\u82B1\u4E86 ",
                React.createElement("b", null, "\u00A591"),
                " \u2014\u2014 \u6BD4\u9884\u7B97 \u00A584 \u8D85\u4E86 7 \u5757\u3002"),
            React.createElement("div", { style: { marginLeft: 40, marginBottom: 14 } },
                React.createElement("div", { style: {
                        background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(28px) saturate(180%)', WebkitBackdropFilter: 'blur(28px) saturate(180%)', borderRadius: 22, padding: '14px 16px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)', maxWidth: 280,
                    } },
                    React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' } },
                        React.createElement("div", { style: { fontSize: 10, fontWeight: 800, color: '#9a9a96', letterSpacing: '0.14em' } }, "\u4ECA\u65E5\u652F\u51FA"),
                        React.createElement("span", { style: {
                                background: accent, color: accentInk, fontSize: 10, fontWeight: 800,
                                padding: '3px 8px', borderRadius: 999,
                            } }, "\u8D85 \u00A57")),
                    React.createElement("div", { style: { display: 'flex', alignItems: 'flex-end', gap: 4, marginTop: 6 } },
                        React.createElement("span", { className: "num", style: { fontSize: 38, fontWeight: 900, lineHeight: 0.9 } }, "91"),
                        React.createElement("span", { style: { fontSize: 13, color: '#9a9a96', fontWeight: 600, marginBottom: 4 } }, "\u5143")),
                    React.createElement("div", { style: { marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' } }, [
                        { t: '必要', v: 18, bg: '#f3f3f1', fg: '#0a0a0a' },
                        { t: '可优化', v: 51, bg: '#e7e7e3', fg: '#0a0a0a' },
                        { t: '冲动', v: 22, bg: accent, fg: accentInk },
                    ].map(p => (React.createElement("span", { key: p.t, style: {
                            fontSize: 11, fontWeight: 700, padding: '5px 10px', borderRadius: 999,
                            background: p.bg, color: p.fg,
                        } },
                        p.t,
                        " \u00A5",
                        p.v)))),
                    React.createElement("button", { onClick: () => onNav('review'), className: "press", style: {
                            marginTop: 12, width: '100%', border: '0.5px solid rgba(255,255,255,0.14)', cursor: 'pointer',
                            background: 'rgba(0,0,0,0.06)', color: '#0a0a0a', fontSize: 12.5, fontWeight: 700,
                            padding: '10px', borderRadius: 14,
                            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.16)',
                        } }, "\u5C55\u5F00\u590D\u76D8 \u2192"))),
            React.createElement(ChatBubble, { role: "assistant", accent: accent },
                "\u6700\u5927\u7684\u6D6A\u8D39\u662F",
                React.createElement("b", null, "\u6253\u8F66 \u00A522"),
                " \u2014\u2014 \u8FD9\u6761\u8DEF\u5730\u94C1\u53EA\u8981 \u00A54\u3002 \u660E\u5929\u80FD\u7701\u4E0B\u6765\u5C31\u56DE\u5230\u9884\u7B97\u7EBF \uD83D\uDC4D"),
            React.createElement("div", { style: { display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 14 } },
                React.createElement(Buddy, { size: 32, variant: avatarVariant, accent: accent }),
                React.createElement("div", { style: {
                        background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(28px) saturate(180%)', WebkitBackdropFilter: 'blur(28px) saturate(180%)', borderRadius: '20px 20px 20px 6px',
                        padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        display: 'flex', gap: 4, alignItems: 'center',
                    } }, [0, 1, 2].map(i => (React.createElement("span", { key: i, style: {
                        width: 6, height: 6, borderRadius: 999, background: '#c8c8c4',
                        animation: `bounce 1.2s ${i * 150}ms infinite ease-in-out`,
                    } })))))),
        React.createElement("div", { style: {
                position: 'absolute', left: 0, right: 0, bottom: 0,
                background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(28px) saturate(180%)', WebkitBackdropFilter: 'blur(28px) saturate(180%)', padding: '10px 14px 30px',
                boxShadow: '0 -1px 0 rgba(0,0,0,0.04)',
            } },
            React.createElement("div", { style: {
                    display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8,
                } }, ['帮我算每日预算', '今天能买基金吗', '存 600 难吗'].map(c => (React.createElement("span", { key: c, style: {
                    fontSize: 12, fontWeight: 600, padding: '7px 12px',
                    borderRadius: 999, background: 'rgba(255,255,255,0.45)', color: '#3a3a38',
                    whiteSpace: 'nowrap', flexShrink: 0,
                } }, c)))),
            React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                React.createElement("div", { style: {
                        flex: 1, background: 'rgba(255,255,255,0.45)', borderRadius: 22, padding: '12px 16px',
                        color: '#9a9a96', fontSize: 14,
                    } }, "\u6709\u4EC0\u4E48\u60F3\u95EE\u7684\u2026"),
                React.createElement("button", { className: "press", style: {
                        width: 44, height: 44, borderRadius: 22, border: 0,
                        background: accent, color: accentInk,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    } },
                    React.createElement(Icon.Send, { size: 18 })))),
        React.createElement("style", null, `
        @keyframes bounce {
          0%,80%,100% { transform: translateY(0); opacity: 0.5; }
          40% { transform: translateY(-4px); opacity: 1; }
        }
      `)));
}
// ═══════════════════════════════════════════════════════════════════════
// 6.  PROFILE · 我的
// ═══════════════════════════════════════════════════════════════════════
function ProfileScreen({ onNav, accent, accentInk = '#0a0a0a', navStyle, avatarVariant, chatOpen = false }) {
    return (React.createElement(ScreenShell, { label: "06 Profile" },
        React.createElement("div", { style: { padding: '0 22px 4px' } },
            React.createElement("div", { style: { fontSize: 11, color: '#9a9a96', fontWeight: 700, letterSpacing: '0.16em' } }, "ACCOUNT"),
            React.createElement("h1", { className: "num", style: { margin: '4px 0 18px', fontSize: 34, fontWeight: 800, letterSpacing: '-0.03em' } }, "\u6211\u7684")),
        React.createElement("div", { style: {
                margin: '0 18px 16px',
                background: 'linear-gradient(155deg, #36363a 0%, #1a1a1d 100%)',
                border: '0.5px solid rgba(255,255,255,0.10)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 12px 36px rgba(0,0,0,0.22)',
                borderRadius: 26,
                padding: '18px 18px', color: '#fff',
                display: 'flex', alignItems: 'center', gap: 14,
            } },
            React.createElement(Buddy, { size: 56, variant: avatarVariant, accent: accent }),
            React.createElement("div", { style: { flex: 1, minWidth: 0 } },
                React.createElement("div", { style: { fontSize: 17, fontWeight: 800 } }, "\u540C\u5B66"),
                React.createElement("div", { style: { fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2 } }, "\u672C\u5730\u8D26\u6237 \u00B7 \u65E0\u9700\u767B\u5F55"),
                React.createElement("div", { style: { display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' } },
                    React.createElement("span", { style: {
                            fontSize: 10.5, fontWeight: 800, padding: '4px 9px', borderRadius: 999,
                            background: 'rgba(255,255,255,0.12)', color: '#fff',
                        } }, "\u975E\u8425\u9500\u8BA4\u8BC1"),
                    React.createElement("span", { style: {
                            fontSize: 10.5, fontWeight: 800, padding: '4px 9px', borderRadius: 999,
                            background: accent, color: accentInk,
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                        } },
                        React.createElement(Icon.Flame, { size: 10, color: accentInk }),
                        " \u7406\u6027\u6D88\u8D39 12 \u5929")))),
        React.createElement("div", { style: { padding: '0 18px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 } }, [
            { v: '47', l: '攒钱天数', s: '连击 12' },
            { v: '189', l: '复盘次数', s: '本月 23' },
            { v: '72', l: '日均消费', s: '元 / 天' },
        ].map(s => (React.createElement("div", { key: s.l, style: {
                background: 'rgba(255,255,255,0.45)', borderRadius: 20, padding: '14px 10px',
                textAlign: 'center',
            } },
            React.createElement("div", { className: "num", style: { fontSize: 26, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1 } }, s.v),
            React.createElement("div", { style: { fontSize: 11, color: '#0a0a0a', fontWeight: 700, marginTop: 6 } }, s.l),
            React.createElement("div", { style: { fontSize: 10, color: '#9a9a96', marginTop: 1 } }, s.s))))),
        React.createElement("div", { style: { padding: '0 22px 8px', fontSize: 16, fontWeight: 800 } }, "\u8D22\u52A1\u753B\u50CF"),
        React.createElement("div", { style: { padding: '0 18px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6 } }, [
            { v: '3,000', l: '月生活费' },
            { v: '1,800', l: '可支配' },
            { v: '600', l: '攒钱目标' },
            { v: '平衡', l: '风格' },
        ].map(s => (React.createElement("div", { key: s.l, style: {
                background: 'rgba(255,255,255,0.45)', borderRadius: 16, padding: '12px 6px',
                textAlign: 'center',
            } },
            React.createElement("div", { className: "num", style: { fontSize: 16, fontWeight: 900, letterSpacing: '-0.03em' } }, s.v),
            React.createElement("div", { style: { fontSize: 10, color: '#9a9a96', marginTop: 4, fontWeight: 600 } }, s.l))))),
        React.createElement("div", { style: { padding: '0 22px 8px', fontSize: 16, fontWeight: 800 } }, "\u8BBE\u7F6E"),
        React.createElement("div", { style: { padding: '0 18px', display: 'flex', flexDirection: 'column', gap: 8 } }, [
            { Ic: Icon.Target, title: '攒钱计划', desc: '¥84 / 天 · 平衡模式', to: 'plan' },
            { Ic: Icon.Sliders, title: '消费分类规则', desc: '4 类已配置 · 自定义关键词', to: null },
            { Ic: Icon.Bell, title: '提醒', desc: '每晚 21:00 复盘提醒', to: null,
                trailing: React.createElement("span", { style: { fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 999, background: accent, color: accentInk } }, "\u5F00") },
            { Ic: Icon.Shield, title: '隐私与数据', desc: '所有数据存在本地 · 不上传', to: null },
            { Ic: Icon.Help, title: '帮助与反馈', desc: '常见问题 · 联系搭子', to: null },
        ].map((s, i) => {
            var _a;
            return (React.createElement("button", { key: i, onClick: () => s.to && onNav(s.to), className: "press", style: {
                    width: '100%', textAlign: 'left', border: 0, background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(28px) saturate(180%)', WebkitBackdropFilter: 'blur(28px) saturate(180%)',
                    borderRadius: 20, padding: '12px 14px', cursor: 'pointer',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8), 0 4px 18px rgba(0,0,0,0.05)', border: '0.5px solid rgba(0,0,0,0.04)',
                    display: 'flex', alignItems: 'center', gap: 14,
                } },
                React.createElement("div", { style: {
                        width: 38, height: 38, borderRadius: 12,
                        background: 'rgba(0,0,0,0.06)',
                        border: '0.5px solid rgba(255,255,255,0.14)',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    } },
                    React.createElement(s.Ic, { size: 18, color: "#fff" })),
                React.createElement("div", { style: { flex: 1, minWidth: 0 } },
                    React.createElement("div", { style: { fontSize: 14, fontWeight: 800 } }, s.title),
                    React.createElement("div", { style: { fontSize: 11.5, color: '#9a9a96', marginTop: 2 } }, s.desc)), (_a = s.trailing) !== null && _a !== void 0 ? _a : React.createElement(Icon.Chevron, { color: "#c8c8c4" })));
        })),
        React.createElement("div", { style: { padding: '20px 18px 8px' } },
            React.createElement("button", { className: "press", style: {
                    width: '100%', background: 'transparent', border: '1px solid rgba(0,0,0,0.08)',
                    borderRadius: 20, padding: '14px', cursor: 'pointer',
                    fontSize: 14, fontWeight: 700, color: '#0a0a0a',
                } }, "\u6E05\u9664\u672C\u5730\u6570\u636E")),
        React.createElement("div", { style: { padding: '12px 28px 24px', fontSize: 10, color: '#bdbdb8', textAlign: 'center', lineHeight: 1.5 } },
            "v1.0 \u00B7 \u672C\u4EA7\u54C1\u4E0D\u63A8\u9500\u4EFB\u4F55\u91D1\u878D\u4EA7\u54C1",
            React.createElement("br", null),
            "\u6240\u6709\u56DE\u7B54\u4EC5\u4F9B\u7406\u8D22\u6559\u80B2\u53C2\u8003"),
        React.createElement("div", { style: { height: 96 } }),
        React.createElement(BottomNav, { active: "me", onNav: onNav, style: navStyle, accent: accent, chatOpen: chatOpen })));
}
Object.assign(window, { HomeScreen, PlanScreen, ReviewScreen, RiskScreen, ChatScreen, ProfileScreen });

})();
