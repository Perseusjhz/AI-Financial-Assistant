// App — Money Buddy redesign
// Renders 5 iPhone artboards on a design canvas, each navigable internally.
// Tweaks panel for accent / font / nav style / avatar.

const { useState, useEffect } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#c8ff3a",
  "navStyle": "fab",
  "avatarVariant": "geo",
  "fontWeight": "display"
}/*EDITMODE-END*/;

const ACCENTS = [
  '#c01900',  // crimson red (default)
  '#c8ff3a',  // electric lime
  '#ff7a45',  // sunset orange
  '#7c5cff',  // ultraviolet
  '#16b86c',  // mint green
];

// Pick readable text color (white vs near-black) for a given background hex.
function inkOn(hex) {
  const m = /^#?([a-f0-9]{6})$/i.exec(hex);
  if (!m) return '#0a0a0a';
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  // sRGB → linear luminance
  const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return L > 0.55 ? '#0a0a0a' : '#ffffff';
}

// Each phone artboard owns its own current-screen state.
function Phone({ initial, initialChatOpen = false, accent, accentInk, navStyle, avatarVariant }) {
  const [screen, setScreen] = useState(initial);
  const [chatOpen, setChatOpen] = useState(initialChatOpen);

  function handleNav(id) {
    if (id === 'chat') {
      // Toggle the overlay rather than navigating to a new screen.
      setChatOpen(o => !o);
      return;
    }
    setChatOpen(false);
    setScreen(id);
  }

  const props = { onNav: handleNav, accent, accentInk, navStyle, avatarVariant, chatOpen };
  return (
    <IOSDevice width={390} height={830}>
      <div style={{ position: 'absolute', inset: 0 }}>
        {screen === 'home'   && <HomeScreen    {...props}/>}
        {screen === 'plan'   && <PlanScreen    {...props}/>}
        {screen === 'review' && <ReviewScreen  {...props}/>}
        {screen === 'risk'   && <RiskScreen    {...props}/>}
        {screen === 'me'     && <ProfileScreen {...props}/>}
        <ChatOverlay
          open={chatOpen}
          onClose={() => setChatOpen(false)}
          accent={accent}
          accentInk={accentInk}
          avatarVariant={avatarVariant}
        />
      </div>
    </IOSDevice>
  );
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

  return (
    <>
      <DesignCanvas>
        <DCSection id="overview" title="Money Buddy · 攒钱搭子 AI"
          subtitle="HapiGo-inspired 极简 · 五屏 hi-fi · 点击底部导航可切换">
          <DCArtboard id="home"   label="01 · 首页" width={390} height={830}>
            <Phone initial="home" {...phoneProps}/>
          </DCArtboard>
          <DCArtboard id="plan"   label="02 · 攒钱计划" width={390} height={830}>
            <Phone initial="plan" {...phoneProps}/>
          </DCArtboard>
          <DCArtboard id="review" label="03 · 消费复盘" width={390} height={830}>
            <Phone initial="review" {...phoneProps}/>
          </DCArtboard>
          <DCArtboard id="risk"   label="04 · 风险教育" width={390} height={830}>
            <Phone initial="risk" {...phoneProps}/>
          </DCArtboard>
          <DCArtboard id="chat"   label="05 · AI 搭子对话" width={390} height={830}>
            <Phone initial="home" initialChatOpen={true} {...phoneProps}/>
          </DCArtboard>
          <DCArtboard id="profile" label="06 · 我的" width={390} height={830}>
            <Phone initial="me" {...phoneProps}/>
          </DCArtboard>
        </DCSection>
      </DesignCanvas>

      <TweaksPanel>
        <TweakSection label="主题"/>
        <TweakColor label="强调色"
          value={t.accent}
          options={ACCENTS}
          onChange={(v) => setTweak('accent', v)}/>

        <TweakSection label="组件风格"/>
        <TweakRadio label="底部导航"
          value={t.navStyle}
          options={[
            { value: 'fab',     label: 'FAB' },
            { value: 'minimal', label: '极简' },
          ]}
          onChange={(v) => setTweak('navStyle', v)}/>
        <TweakSelect label="搭子头像"
          value={t.avatarVariant}
          options={[
            { value: 'geo',   label: '几何抽象（推荐）' },
            { value: 'word',  label: '文字「搭」' },
            { value: 'emoji', label: '原版 🐷' },
          ]}
          onChange={(v) => setTweak('avatarVariant', v)}/>
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
