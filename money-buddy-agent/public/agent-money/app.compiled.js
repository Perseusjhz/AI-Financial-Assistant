(function(){
// App — Money Buddy redesign
// Renders 5 iPhone artboards on a design canvas, each navigable internally.
// Tweaks panel for accent / font / nav style / avatar.
const { useState, useEffect } = React;
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/ {
    "accent": "#c01900",
    "navStyle": "fab",
    "avatarVariant": "geo",
    "fontWeight": "display"
} /*EDITMODE-END*/;
const ACCENTS = [
    '#c01900', // crimson red (default)
    '#c8ff3a', // electric lime
    '#ff7a45', // sunset orange
    '#7c5cff', // ultraviolet
    '#16b86c', // mint green
];
// Pick readable text color (white vs near-black) for a given background hex.
function inkOn(hex) {
    const m = /^#?([a-f0-9]{6})$/i.exec(hex);
    if (!m)
        return '#0a0a0a';
    const n = parseInt(m[1], 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    // sRGB → linear luminance
    const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    return L > 0.55 ? '#0a0a0a' : '#ffffff';
}
// Each phone artboard owns its own current-screen state.
// liveData is the source of truth — chat updates it; screens read from it.
const INITIAL_LIVE = {
    dailyBudget: 84,
    todayTotal: 91,
    monthlySaved: 408,
    monthlyGoal: 600,
    dailyAvg: 72,
    weeklyBudget: 588,
    monthlySpendable: 2520,
};
function Phone({ initial, initialChatOpen = false, accent, accentInk, navStyle, avatarVariant }) {
    const [screen, setScreen] = useState(initial);
    const [chatOpen, setChatOpen] = useState(initialChatOpen);
    const [liveData, setLiveData] = useState(INITIAL_LIVE);
    const [pulseKeys, setPulseKeys] = useState({});
    function handleNav(id) {
        if (id === 'chat') {
            setChatOpen(o => !o);
            return;
        }
        setChatOpen(false);
        setScreen(id);
    }
    function patchData(patch) {
        if (!patch || typeof patch !== 'object')
            return;
        setLiveData(d => {
            const next = { ...d };
            const pk = { ...pulseKeys };
            for (const k of Object.keys(patch)) {
                if (typeof patch[k] === 'number' && patch[k] !== d[k]) {
                    next[k] = patch[k];
                    pk[k] = (pk[k] || 0) + 1;
                }
            }
            setPulseKeys(pk);
            return next;
        });
    }
    const props = {
        onNav: handleNav, accent, accentInk, navStyle, avatarVariant, chatOpen,
        data: liveData, pulse: pulseKeys, currentScreen: screen,
    };
    return (React.createElement(IOSDevice, { width: 390, height: 830 },
        React.createElement("div", { style: { position: 'absolute', inset: 0 } },
            screen === 'home' && React.createElement(HomeScreen, { ...props }),
            screen === 'plan' && React.createElement(PlanScreen, { ...props }),
            screen === 'review' && React.createElement(ReviewScreen, { ...props }),
            screen === 'risk' && React.createElement(RiskScreen, { ...props }),
            screen === 'me' && React.createElement(ProfileScreen, { ...props }),
            React.createElement(ChatOverlay, { open: chatOpen, onClose: () => setChatOpen(false), accent: accent, accentInk: accentInk, avatarVariant: avatarVariant, liveData: liveData, onUpdateData: patchData, currentScreen: screen, onNavigate: (s) => { setChatOpen(false); setTimeout(() => setScreen(s), 280); } }))));
}
function App() {
    const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
    const accentInk = inkOn(t.accent);
    // expose accent as CSS var; also derive a translucent glow color for the wallpaper.
    useEffect(() => {
        const m = /^#?([a-f0-9]{6})$/i.exec(t.accent);
        let glow = 'rgba(192,25,0,0.22)';
        if (m) {
            const n = parseInt(m[1], 16);
            const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
            glow = `rgba(${r},${g},${b},0.22)`;
        }
        document.documentElement.style.setProperty('--accent', t.accent);
        document.documentElement.style.setProperty('--accent-ink', accentInk);
        document.documentElement.style.setProperty('--accent-glow', glow);
    }, [t.accent, accentInk]);
    const phoneProps = { accent: t.accent, accentInk, navStyle: t.navStyle, avatarVariant: t.avatarVariant };
    return (React.createElement(React.Fragment, null,
        React.createElement(DesignCanvas, null,
            React.createElement(DCSection, { id: "overview", title: "Money Buddy \u00B7 \u6512\u94B1\u642D\u5B50 AI", subtitle: "HapiGo-inspired \u6781\u7B80 \u00B7 \u4E94\u5C4F hi-fi \u00B7 \u70B9\u51FB\u5E95\u90E8\u5BFC\u822A\u53EF\u5207\u6362" },
                React.createElement(DCArtboard, { id: "home", label: "01 \u00B7 \u9996\u9875", width: 390, height: 830 },
                    React.createElement(Phone, { initial: "home", ...phoneProps })),
                React.createElement(DCArtboard, { id: "plan", label: "02 \u00B7 \u6512\u94B1\u8BA1\u5212", width: 390, height: 830 },
                    React.createElement(Phone, { initial: "plan", ...phoneProps })),
                React.createElement(DCArtboard, { id: "review", label: "03 \u00B7 \u6D88\u8D39\u590D\u76D8", width: 390, height: 830 },
                    React.createElement(Phone, { initial: "review", ...phoneProps })),
                React.createElement(DCArtboard, { id: "risk", label: "04 \u00B7 \u98CE\u9669\u6559\u80B2", width: 390, height: 830 },
                    React.createElement(Phone, { initial: "risk", ...phoneProps })),
                React.createElement(DCArtboard, { id: "chat", label: "05 \u00B7 AI \u642D\u5B50\u5BF9\u8BDD", width: 390, height: 830 },
                    React.createElement(Phone, { initial: "home", initialChatOpen: true, ...phoneProps })),
                React.createElement(DCArtboard, { id: "profile", label: "06 \u00B7 \u6211\u7684", width: 390, height: 830 },
                    React.createElement(Phone, { initial: "me", ...phoneProps })))),
        React.createElement(TweaksPanel, null,
            React.createElement(TweakSection, { label: "\u4E3B\u9898" }),
            React.createElement(TweakColor, { label: "\u5F3A\u8C03\u8272", value: t.accent, options: ACCENTS, onChange: (v) => setTweak('accent', v) }),
            React.createElement(TweakSection, { label: "\u7EC4\u4EF6\u98CE\u683C" }),
            React.createElement(TweakRadio, { label: "\u5E95\u90E8\u5BFC\u822A", value: t.navStyle, options: [
                    { value: 'fab', label: 'FAB' },
                    { value: 'minimal', label: '极简' },
                ], onChange: (v) => setTweak('navStyle', v) }),
            React.createElement(TweakSelect, { label: "\u642D\u5B50\u5934\u50CF", value: t.avatarVariant, options: [
                    { value: 'geo', label: '几何抽象（推荐）' },
                    { value: 'word', label: '文字「搭」' },
                    { value: 'emoji', label: '原版 🐷' },
                ], onChange: (v) => setTweak('avatarVariant', v) }))));
}
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App, null));

})();
