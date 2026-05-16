// Shared components: Avatar, BottomNav, MiniChart, ChatBubble, icons
// All component names are CAPITALIZED so Babel treats them as components.

// ─── Icons ───────────────────────────────────────────────────────────
const Icon = {
  Home: (p) =>
  <svg width={p.size || 22} height={p.size || 22} viewBox="0 0 24 24" fill="none"
  stroke={p.color || 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l9-7 9 7v9a2 2 0 01-2 2h-4v-7H9v7H5a2 2 0 01-2-2v-9z" />
    </svg>,

  Chart: (p) =>
  <svg width={p.size || 22} height={p.size || 22} viewBox="0 0 24 24" fill="none"
  stroke={p.color || 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 16l5-5 4 3 7-9" /><path d="M14 5h5v5" />
    </svg>,

  Receipt: (p) =>
  <svg width={p.size || 22} height={p.size || 22} viewBox="0 0 24 24" fill="none"
  stroke={p.color || 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 3v18l2-1.5L9 21l2-1.5L13 21l2-1.5L17 21l2-1.5V3l-2 1.5L15 3l-2 1.5L11 3 9 4.5 7 3 5 4.5z" />
      <path d="M8 9h8M8 13h5" />
    </svg>,

  Person: (p) =>
  <svg width={p.size || 22} height={p.size || 22} viewBox="0 0 24 24" fill="none"
  stroke={p.color || 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
    </svg>,

  Spark: (p) =>
  <svg width={p.size || 22} height={p.size || 22} viewBox="0 0 24 24" fill={p.color || 'currentColor'}>
      <path d="M12 2l1.8 5.7L19 9.5l-4.7 2.8L13 18l-1-4.2L8 12l4-1.8L12 2z" />
      <circle cx="19" cy="4" r="1.5" /><circle cx="5" cy="17" r="1" />
    </svg>,

  Chevron: (p) =>
  <svg width={p.size || 16} height={p.size || 16} viewBox="0 0 24 24" fill="none"
  stroke={p.color || '#bdbdb8'} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 6l6 6-6 6" />
    </svg>,

  ArrowUp: (p) =>
  <svg width={p.size || 14} height={p.size || 14} viewBox="0 0 24 24" fill="none"
  stroke={p.color || 'currentColor'} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>,

  ArrowDown: (p) =>
  <svg width={p.size || 14} height={p.size || 14} viewBox="0 0 24 24" fill="none"
  stroke={p.color || 'currentColor'} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12l7 7 7-7" />
    </svg>,

  Send: (p) =>
  <svg width={p.size || 18} height={p.size || 18} viewBox="0 0 24 24" fill={p.color || 'currentColor'}>
      <path d="M3 12L21 4l-4 18-5-7-9-3z" opacity="0.95" />
    </svg>,

  Back: (p) =>
  <svg width={p.size || 22} height={p.size || 22} viewBox="0 0 24 24" fill="none"
  stroke={p.color || 'currentColor'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>,

  Plus: (p) =>
  <svg width={p.size || 22} height={p.size || 22} viewBox="0 0 24 24" fill="none"
  stroke={p.color || 'currentColor'} strokeWidth="2.4" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>,

  Close: (p) =>
  <svg width={p.size || 22} height={p.size || 22} viewBox="0 0 24 24" fill="none"
  stroke={p.color || 'currentColor'} strokeWidth="2.6" strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>,

  Target: (p) =>
  <svg width={p.size || 22} height={p.size || 22} viewBox="0 0 24 24" fill="none"
  stroke={p.color || 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" fill={p.color || 'currentColor'} />
    </svg>,

  Sliders: (p) =>
  <svg width={p.size || 22} height={p.size || 22} viewBox="0 0 24 24" fill="none"
  stroke={p.color || 'currentColor'} strokeWidth="2" strokeLinecap="round">
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
      <circle cx="16" cy="7" r="2" fill={p.color || 'currentColor'} />
      <circle cx="8" cy="17" r="2" fill={p.color || 'currentColor'} />
    </svg>,

  Bell: (p) =>
  <svg width={p.size || 22} height={p.size || 22} viewBox="0 0 24 24" fill="none"
  stroke={p.color || 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10 21a2 2 0 004 0" />
    </svg>,

  Shield: (p) =>
  <svg width={p.size || 22} height={p.size || 22} viewBox="0 0 24 24" fill="none"
  stroke={p.color || 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z" />
    </svg>,

  Help: (p) =>
  <svg width={p.size || 22} height={p.size || 22} viewBox="0 0 24 24" fill="none"
  stroke={p.color || 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 015 0c0 1.5-2.5 2-2.5 4" /><circle cx="12" cy="17.5" r="1" fill={p.color || 'currentColor'} />
    </svg>,

  Flame: (p) =>
  <svg width={p.size || 22} height={p.size || 22} viewBox="0 0 24 24" fill={p.color || 'currentColor'}>
      <path d="M12 2c1 4 5 5 5 10a5 5 0 01-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-4-1-6 1-9z" />
    </svg>

};

// ─── Buddy avatar — abstract geometric mark ──────────────────────────
function PulseNum({ value, pulseKey = 0, ...spanProps }) {
  return (
    <span key={`${value}-${pulseKey}`} className={`num ${pulseKey ? 'mb-pulse' : ''}`} {...spanProps}>
      {value}
    </span>
  );
}
// ─── Buddy avatar — abstract geometric mark ──────────────────────────
function Buddy({ size = 36, variant = 'geo', accent = '#c8ff3a' }) {
  if (variant === 'emoji') {
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: '#0a0a0a', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: size * 0.5, flexShrink: 0
      }}>🐷</div>);

  }
  if (variant === 'word') {
    return (
      <div style={{
        width: size, height: size, borderRadius: '32%',
        background: '#0a0a0a', color: '#fff', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.45, fontWeight: 900, fontFamily: 'var(--font)',
        letterSpacing: '-0.05em', flexShrink: 0
      }}>搭</div>);

  }
  // geo: two overlapping circles — buddy mark
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
      <circle cx="20" cy="20" r="20" fill="#0a0a0a" />
      <circle cx="16" cy="17" r="6.5" fill={accent} />
      <circle cx="24" cy="22" r="6.5" fill="#fff" opacity="0.95" />
    </svg>);

}

// ─── Bottom nav (HapiGo-style pill with center FAB) ─────────────────
function BottomNav({ active, onNav, style = 'fab', accent = '#c8ff3a', chatOpen = false }) {
  const items = [
  { id: 'home', label: '首页', Icon: Icon.Home },
  { id: 'plan', label: '攒钱', Icon: Icon.Chart },
  { id: 'review', label: '复盘', Icon: Icon.Receipt },
  { id: 'me', label: '我的', Icon: Icon.Person }];


  if (style === 'minimal') {
    // text-only minimal nav, no FAB
    const all = [...items.slice(0, 2), { id: 'chat', label: '搭子', Icon: Icon.Spark }, ...items.slice(2)];
    return (
      <div style={{
        position: 'absolute', bottom: 16, left: 16, right: 16, height: 56,
        borderRadius: 999, display: 'flex',
        background: 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(28px) saturate(180%)',
        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        border: '0.5px solid rgba(0,0,0,0.06)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 8px 24px rgba(0,0,0,0.10)',
        zIndex: 40
      }}>
        {all.map((it) => {
          const on = active === it.id;
          return (
            <button key={it.id} onClick={() => onNav?.(it.id)} className="press" style={{
              flex: 1, border: 0, background: 'transparent', display: 'flex',
              flexDirection: 'column', gap: 2, alignItems: 'center', justifyContent: 'center',
              color: on ? '#0a0a0a' : '#bdbdb8', fontSize: 10, fontWeight: 600
            }}>
              <it.Icon color={on ? '#0a0a0a' : '#c8c8c4'} size={20} />
              {it.label}
            </button>);

        })}
      </div>);

  }

  // default: FAB style
  return (
    <div style={{ position: 'absolute', bottom: 14, left: 14, right: 14, height: 64, zIndex: 60 }}>
      {/* center FAB */}
      <button onClick={() => onNav?.('chat')} className="press" style={{
        position: 'absolute', top: -22, left: '50%', transform: 'translateX(-50%)',
        width: 58, height: 58, borderRadius: '50%',
        background: '#0a0a0a',
        border: '0.5px solid rgba(255,255,255,0.10)',
        color: chatOpen ? '#fff' : accent,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 12px 28px rgba(0,0,0,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2, cursor: 'pointer',
      }}>
        <div style={{
          transition: 'transform .35s cubic-bezier(.2,.7,.3,1)',
          transform: chatOpen ? 'rotate(135deg)' : 'rotate(0deg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {chatOpen
            ? <Icon.Plus color="#fff" size={26}/>
            : <Icon.Spark color={accent} size={24}/>}
        </div>
      </button>
      <div style={{
        height: 64, borderRadius: 28,
        background: 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(28px) saturate(180%)',
        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        border: '0.5px solid rgba(0,0,0,0.06)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 8px 24px rgba(0,0,0,0.10)',
        display: 'flex', alignItems: 'center', padding: '0 8px', opacity: "1"
      }}>
        {items.slice(0, 2).map((it) => <NavBtn key={it.id} it={it} active={active} onNav={onNav} />)}
        <div style={{ flex: 1 }} />
        {items.slice(2).map((it) => <NavBtn key={it.id} it={it} active={active} onNav={onNav} />)}
      </div>
    </div>);

}
function NavBtn({ it, active, onNav }) {
  const on = active === it.id;
  return (
    <button onClick={() => onNav?.(it.id)} className="press" style={{
      flex: 1, border: 0, background: 'transparent',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 3, color: on ? '#0a0a0a' : '#bdbdb8', cursor: 'pointer'
    }}>
      <it.Icon color={on ? '#0a0a0a' : '#c8c8c4'} size={22} />
      <span style={{ fontSize: 10, fontWeight: 600, color: on ? '#0a0a0a' : '#bdbdb8' }}>{it.label}</span>
    </button>);

}

// ─── Spending chart (smooth area + dashed forecast) ──────────────────
function MiniChart({ data, predicted = 0, budget = null, height = 150, bg = 'gray', accent = '#c8ff3a' }) {
  // data: [{label, amount}]
  const W = 320,H = height;
  const PAD = { t: 20, r: 12, b: 28, l: 12 };
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;
  const amounts = data.map((d) => d.amount);
  const minV = Math.max(0, Math.min(...amounts) * 0.5);
  const maxV = Math.max(...amounts) * 1.3;
  const toX = (i) => PAD.l + i / (data.length - 1) * plotW;
  const toY = (v) => PAD.t + plotH - (v - minV) / (maxV - minV) * plotH;

  const pts = data.map((d, i) => ({ x: toX(i), y: toY(d.amount), ...d }));

  function smooth(arr) {
    if (arr.length < 2) return '';
    let d = `M ${arr[0].x} ${arr[0].y}`;
    for (let i = 0; i < arr.length - 1; i++) {
      const p0 = arr[Math.max(0, i - 1)],p1 = arr[i],p2 = arr[i + 1],p3 = arr[Math.min(arr.length - 1, i + 2)];
      const c1x = p1.x + (p2.x - p0.x) / 6;
      const c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6;
      const c2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
    }
    return d;
  }

  const splitAt = data.length - predicted;
  const actual = pts.slice(0, splitAt);
  const pred = pts.slice(splitAt - 1);
  const actualPath = smooth(actual);
  const predPath = smooth(pred);

  const baseline = PAD.t + plotH + 1;
  const fillPath = actual.length >= 2 ?
  `${actualPath} L ${actual.at(-1).x},${baseline} L ${actual[0].x},${baseline} Z` : '';

  const todayIdx = splitAt - 1;
  const budgetY = budget != null ? toY(budget) : null;

  const isLight = bg === 'light';
  const lineColor = '#0a0a0a';
  const fillId = `cf-${Math.random().toString(36).slice(2, 7)}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="none" style={{ display: 'block' }}>
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a0a0a" stopOpacity={isLight ? 0.10 : 0.18} />
          <stop offset="100%" stopColor="#0a0a0a" stopOpacity="0" />
        </linearGradient>
      </defs>
      {budgetY != null &&
      <g>
          <line x1={PAD.l} y1={budgetY} x2={W - PAD.r} y2={budgetY}
        stroke="#9a9a96" strokeWidth="1" strokeDasharray="3 4" />
          <text x={W - PAD.r - 4} y={budgetY - 6} textAnchor="end"
        fontSize="9.5" fill="#9a9a96" fontWeight="600">预算 ¥{budget}</text>
        </g>
      }
      {fillPath && <path d={fillPath} fill={`url(#${fillId})`} />}
      {actual.length >= 2 &&
      <path d={actualPath} fill="none" stroke={lineColor} strokeWidth="2.6"
      strokeLinecap="round" strokeLinejoin="round" />
      }
      {pred.length >= 2 &&
      <path d={predPath} fill="none" stroke="#bdbdb8" strokeWidth="2"
      strokeLinecap="round" strokeDasharray="5 4" />
      }
      {/* today highlight halo */}
      {todayIdx >= 0 && pts[todayIdx] &&
      <g>
          <circle cx={pts[todayIdx].x} cy={pts[todayIdx].y} r="14" fill={accent} opacity="0.35" />
          <circle cx={pts[todayIdx].x} cy={pts[todayIdx].y} r="6" fill={accent} />
          <circle cx={pts[todayIdx].x} cy={pts[todayIdx].y} r="6" fill="none" stroke="#0a0a0a" strokeWidth="2" />
        </g>
      }
      {data.map((d, i) =>
      <text key={i} x={toX(i)} y={H - 6} textAnchor="middle"
      fontSize="10" fill={i >= splitAt ? '#c8c8c4' : '#9a9a96'} fontWeight="600">
          {d.label}
        </text>
      )}
    </svg>);

}

// ─── Chat bubble ─────────────────────────────────────────────────────
function ChatBubble({ role, children, avatar, accent }) {
  if (role === 'user') {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <div style={{
          maxWidth: '78%', background: '#0a0a0a', color: '#fff',
          border: '0.5px solid rgba(255,255,255,0.12)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10), 0 4px 14px rgba(0,0,0,0.18)',
          borderRadius: '20px 20px 6px 20px', padding: '11px 15px',
          fontSize: 14.5, lineHeight: 1.5, fontWeight: 500
        }}>{children}</div>
      </div>);

  }
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 14 }}>
      {avatar ?? <Buddy size={32} accent={accent} />}
      <div style={{
        maxWidth: '78%', background: 'rgba(255,255,255,0.65)', color: '#0a0a0a',
        backdropFilter: 'blur(28px) saturate(180%)',
        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        border: '0.5px solid rgba(0,0,0,0.05)',
        borderRadius: '20px 20px 20px 6px', padding: '11px 15px',
        fontSize: 14.5, lineHeight: 1.55,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>{children}</div>
    </div>);

}

// expose
Object.assign(window, { Icon, Buddy, BottomNav, MiniChart, ChatBubble, PulseNum });