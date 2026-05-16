// Screens — Home, Plan, Review, Risk, Chat
// Each is rendered inside an iPhone frame on the canvas.
// Globals expected: React, Icon, Buddy, BottomNav, MiniChart, ChatBubble

const { useState } = React;

// ─── shared chrome ───────────────────────────────────────────────────
// The IOSDevice frame already renders its own status bar + dynamic island,
// so we just leave a 56px top spacer so content clears them.
function ScreenShell({ children, bg, label }) {
  return (
    <div data-screen-label={label} style={{
      width: '100%', height: '100%',
      background: bg || 'transparent',
      display: 'flex', flexDirection: 'column', position: 'relative',
      overflow: 'hidden',
    }}>
      <div className="wallpaper"/>
      <div className="app-scroll" style={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden',
        paddingTop: 56, position: 'relative', zIndex: 1,
      }}>
        {children}
      </div>
    </div>
  );
}

function BackBar({ title, onBack }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4, padding: '4px 18px 18px',
    }}>
      <button onClick={onBack} className="press" style={{
        width: 36, height: 36, borderRadius: 18, border: 0, background: 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', marginLeft: -8,
      }}>
        <Icon.Back size={22} color="#fff"/>
      </button>
      <span style={{ fontSize: 15, fontWeight: 600 }}>{title}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// 1.  HOME · 攒钱总览
// ═══════════════════════════════════════════════════════════════════════
function HomeScreen({ onNav, accent, accentInk = '#0a0a0a', navStyle, avatarVariant, chatOpen = false, layout = 'metric' }) {
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

  return (
    <ScreenShell label="01 Home">
      <h1 className="num" style={{
        margin: '0 22px 4px', fontSize: 38, fontWeight: 800, letterSpacing: '-0.04em',
        lineHeight: 1.05,
      }}>攒钱总览</h1>
      <div style={{ margin: '0 22px 18px', color: '#9a9a96', fontSize: 13, fontWeight: 500 }}>
        距离月底还有 <span style={{ color: '#0a0a0a', fontWeight: 700 }}>16 天</span> · 计划完成 68%
      </div>

      {/* HERO — daily avg */}
      <div className="dotmask" style={{
        margin: '0 18px 16px', borderRadius: 28,
        background: 'linear-gradient(155deg, #36363a 0%, #1a1a1d 100%)',
        border: '0.5px solid rgba(255,255,255,0.10)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 12px 36px rgba(0,0,0,0.22)',
        padding: '20px 22px 22px', color: '#fff', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{
            fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.5)', fontWeight: 700,
          }}>日均消费</div>
          <div style={{
            fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 600,
            background: 'rgba(255,255,255,0.10)', padding: '4px 8px', borderRadius: 999,
          }}>本周</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, margin: '12px 0 14px' }}>
          <span className="num" style={{ fontSize: 72, fontWeight: 900, lineHeight: 0.9 }}>72</span>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 18, fontWeight: 500, marginBottom: 8 }}>元/天</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            background: accent, color: accentInk, fontSize: 11.5, fontWeight: 800,
            padding: '4px 9px', borderRadius: 999,
          }}>
            <Icon.ArrowDown size={11}/> 18%
          </div>
          <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12.5 }}>低于上周均值</span>
        </div>

        {/* mini KPIs */}
        <div style={{
          marginTop: 18, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.12)',
          display: 'flex', gap: 22,
        }}>
          {[
            { l: '已存', v: '408', u: '/ 600 元' },
            { l: '可花', v: '1.2k', u: '本月余额' },
            { l: '连击', v: '5', u: '天内未超支' },
          ].map((k) => (
            <div key={k.l}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginBottom: 2 }}>{k.l.toUpperCase()}</div>
              <div className="num" style={{ fontSize: 18, fontWeight: 800 }}>
                {k.v} <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>{k.u}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CHART card */}
      <div style={{
        margin: '0 18px 20px', background: 'rgba(255,255,255,0.45)', borderRadius: 28,
        padding: '16px 12px 8px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 8px 6px' }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'baseline' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0a0a0a' }}>消费趋势</span>
            <span style={{ fontSize: 11, color: '#9a9a96', fontWeight: 600 }}>近 9 天 · 预测 2 天</span>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {['周', '月', '年'].map((t, i) => (
              <span key={t} style={{
                fontSize: 11, fontWeight: 700,
                padding: '4px 10px', borderRadius: 999,
                background: i === 0 ? '#0a0a0a' : 'transparent',
                color: i === 0 ? '#fff' : '#bdbdb8',
              }}>{t}</span>
            ))}
          </div>
        </div>
        <MiniChart data={chartData} predicted={2} budget={90} accent={accent} height={140}/>
      </div>

      {/* QUICK ACTIONS */}
      <div style={{ padding: '0 22px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>今天做什么</h2>
        <span style={{ fontSize: 12, color: '#9a9a96', fontWeight: 600 }}>3 项</span>
      </div>

      <div style={{ padding: '0 18px 36px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <ActionRow
          tag="计划" tagBg={accent} tagColor={accentInk}
          title="还没复盘今天消费"
          desc="今天午餐 + 奶茶已经记 3 笔了"
          onClick={() => onNav('review')}
        />
        <ActionRow
          tag="建议" tagBg="#0a0a0a" tagColor="#fff"
          title="调整每日预算 ¥84 → ¥90"
          desc="按近 7 天数据，你已经超支 2 次"
          onClick={() => onNav('plan')}
        />
        <ActionRow
          tag="学习" tagBg="#f3f3f1" tagColor="#0a0a0a"
          title="3 分钟看懂「货币基金」"
          desc="不推销 · 只解释风险"
          onClick={() => onNav('risk')}
        />
      </div>

      <div style={{ height: 96 }}/>
      <BottomNav active="home" onNav={onNav} style={navStyle} accent={accent} chatOpen={chatOpen}/>
    </ScreenShell>
  );
}

function ActionRow({ tag, tagBg, tagColor, title, desc, onClick }) {
  return (
    <button onClick={onClick} className="press" style={{
      width: '100%', textAlign: 'left', border: 0, background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(28px) saturate(180%)', WebkitBackdropFilter: 'blur(28px) saturate(180%)',
      borderRadius: 22, padding: '14px 16px',
      boxShadow: '0 1px 0 rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.04)',
      display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{
            fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 999,
            background: tagBg, color: tagColor, letterSpacing: '0.04em',
          }}>{tag}</span>
        </div>
        <div style={{ fontSize: 14.5, fontWeight: 700, color: '#fff' }}>{title}</div>
        <div style={{ fontSize: 12, color: '#9a9a96', marginTop: 2 }}>{desc}</div>
      </div>
      <Icon.Chevron color="#c8c8c4"/>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// 2.  SAVING PLAN
// ═══════════════════════════════════════════════════════════════════════
function PlanScreen({ onNav, accent, accentInk = '#0a0a0a', navStyle, avatarVariant, chatOpen = false }) {
  const [style, setStyle] = useState('balanced');

  return (
    <ScreenShell label="02 Plan">
      <BackBar title="攒钱计划" onBack={() => onNav('home')}/>

      <div style={{ padding: '0 22px' }}>
        <div style={{ fontSize: 11, color: '#9a9a96', fontWeight: 700, letterSpacing: '0.12em' }}>STEP 02 / 03</div>
        <h1 className="num" style={{
          margin: '6px 0 4px', fontSize: 34, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1,
        }}>能存多少，<br/>我帮你算</h1>
        <p style={{ color: '#9a9a96', fontSize: 13.5, margin: '8px 0 22px' }}>
          告诉我你的收入和目标，我会拆成每日预算和可行性评估
        </p>
      </div>

      {/* RESULT block — already-computed plan, big number */}
      <div style={{
        margin: '0 18px 18px', borderRadius: 32, padding: '20px 22px 22px',
        background: accent, color: accentInk, position: 'relative', overflow: 'hidden',
        border: '0.5px solid rgba(255,255,255,0.20)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.28), inset 0 -1px 0 rgba(0,0,0,0.10), 0 12px 36px rgba(0,0,0,0.45)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.18em', fontWeight: 800 }}>EVERY DAY · 每日预算</div>
          <span style={{
            background: accentInk === '#ffffff' ? 'rgba(255,255,255,0.18)' : '#0a0a0a',
            color: accentInk === '#ffffff' ? '#fff' : '#fff',
            fontSize: 10, fontWeight: 800,
            padding: '4px 9px', borderRadius: 999,
          }}>✓ 可行</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginTop: 14 }}>
          <span className="num" style={{ fontSize: 92, fontWeight: 900, lineHeight: 0.85 }}>84</span>
          <span style={{ fontSize: 18, fontWeight: 600, marginBottom: 10 }}>元 / 天</span>
        </div>
        <div style={{
          marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14,
          paddingTop: 16, borderTop: `1px solid ${accentInk === '#ffffff' ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)'}`,
        }}>
          {[
            { l: '每周', v: '588', u: '元' },
            { l: '本月可花', v: '2,520', u: '元' },
            { l: '目标', v: '600', u: '元' },
          ].map(k => (
            <div key={k.l}>
              <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.55 }}>{k.l.toUpperCase()}</div>
              <div className="num" style={{ fontSize: 19, fontWeight: 800, marginTop: 2 }}>
                {k.v}<span style={{ fontSize: 10, opacity: 0.55, marginLeft: 2 }}>{k.u}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI commentary */}
      <div style={{ margin: '0 18px 16px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <Buddy size={28} variant={avatarVariant} accent={accent}/>
        <div style={{
          background: 'rgba(255,255,255,0.45)', borderRadius: '4px 18px 18px 18px',
          padding: '12px 14px', fontSize: 13.5, lineHeight: 1.55, color: '#3a3a38', flex: 1,
        }}>
          按平衡风格拆下来每天 ¥84 还挺宽裕的。重点关注 <b>外卖</b> 和 <b>奶茶</b>，
          这两项占了上月可优化部分的 60%。本周如果都不点外卖，能多存 80~120 元。
        </div>
      </div>

      {/* FORM — pre-filled */}
      <div style={{ padding: '4px 22px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>计划基础</h2>
        <span style={{ fontSize: 11, color: '#9a9a96', fontWeight: 600 }}>点击修改</span>
      </div>
      <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <FormRow label="月生活费" value="3,000" unit="元"/>
        <FormRow label="固定支出" value="1,200" unit="元 (房租 800 + 话费 50…)"/>
        <FormRow label="本月目标" value="600" unit="元 / 月"/>
        <FormRow label="剩余天数" value="16" unit="天"/>
      </div>

      {/* style picker */}
      <div style={{ padding: '12px 22px 0', fontSize: 15, fontWeight: 800 }}>风格</div>
      <div style={{ padding: '10px 18px 24px', display: 'flex', gap: 8 }}>
        {[
          { id: 'strict',   label: '严格',   sub: '更激进' },
          { id: 'balanced', label: '平衡',   sub: '推荐' },
          { id: 'relaxed',  label: '宽松',   sub: '更友好' },
        ].map(o => (
          <button key={o.id} className="press" onClick={() => setStyle(o.id)} style={{
            flex: 1, border: 0, cursor: 'pointer',
            background: style === o.id ? '#0a0a0a' : '#f3f3f1',
            color: style === o.id ? '#fff' : '#0a0a0a',
            borderRadius: 16, padding: '14px 8px',
            display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center',
          }}>
            <span style={{ fontSize: 14, fontWeight: 800 }}>{o.label}</span>
            <span style={{ fontSize: 10, opacity: 0.6, fontWeight: 600 }}>{o.sub}</span>
          </button>
        ))}
      </div>

      {/* Next action banner */}
      <div style={{
        margin: '0 18px 16px', padding: '14px 16px',
        background: 'linear-gradient(155deg, #2e2e32 0%, #18181b 100%)',
        border: '0.5px solid rgba(255,255,255,0.10)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.16), 0 8px 24px rgba(0,0,0,0.20)',
        borderRadius: 22, color: '#fff',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 18, background: accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon.Spark color={accentInk} size={18}/>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 800, letterSpacing: '0.12em' }}>本周一件事</div>
          <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 2 }}>外卖 / 奶茶累计不超过 90 元</div>
        </div>
        <Icon.Chevron color="#9a9a96"/>
      </div>

      <div style={{ height: 96 }}/>
      <BottomNav active="plan" onNav={onNav} style={navStyle} accent={accent} chatOpen={chatOpen}/>
    </ScreenShell>
  );
}

function FormRow({ label, value, unit }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.45)', borderRadius: 18, padding: '12px 16px',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <span style={{ fontSize: 12, color: '#9a9a96', fontWeight: 600, width: 76 }}>{label}</span>
      <span className="num" style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{value}</span>
      <span style={{ fontSize: 11, color: '#9a9a96', fontWeight: 500, flex: 1 }}>{unit}</span>
      <Icon.Chevron size={14} color="#c8c8c4"/>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// 3.  EXPENSE REVIEW
// ═══════════════════════════════════════════════════════════════════════
function ReviewScreen({ onNav, accent, accentInk = '#0a0a0a', navStyle, avatarVariant, chatOpen = false }) {
  const cats = [
    { key: 'nec',   tag: '必要',   amount: 18, items: ['食堂 ¥18'],                    tone: 'gray'     },
    { key: 'opt',   tag: '可优化', amount: 51, items: ['奶茶 ¥16', '外卖 ¥35'],         tone: 'soft'    },
    { key: 'imp',   tag: '冲动',   amount: 22, items: ['打车 ¥22'],                    tone: 'accent'  },
    { key: 'learn', tag: '学习',   amount: 8,  items: ['打印资料 ¥8'],                  tone: 'dark'    },
  ];
  const total = cats.reduce((s, c) => s + c.amount, 0);

  return (
    <ScreenShell label="03 Review">
      <BackBar title="今日复盘" onBack={() => onNav('home')}/>

      <div style={{ padding: '0 22px 4px' }}>
        <div style={{ fontSize: 11, color: '#9a9a96', fontWeight: 700, letterSpacing: '0.12em' }}>5 月 15 日 · 周四</div>
        <h1 className="num" style={{ margin: '4px 0 0', fontSize: 30, fontWeight: 800, letterSpacing: '-0.03em' }}>
          复盘一下今天
        </h1>
      </div>

      {/* TOTAL hero */}
      <div style={{
        margin: '18px 18px 16px', borderRadius: 28, padding: '20px 22px 22px',
        background: 'linear-gradient(155deg, #36363a 0%, #1a1a1d 100%)',
        border: '0.5px solid rgba(255,255,255,0.10)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 12px 36px rgba(0,0,0,0.22)',
        color: '#fff', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.18em', fontWeight: 800, color: 'rgba(255,255,255,0.5)' }}>TODAY · 总支出</div>
          <span style={{
            background: accent, color: accentInk, fontSize: 11, fontWeight: 800,
            padding: '4px 9px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 3,
          }}>
            <Icon.ArrowUp size={10} color={accentInk}/> 超支 ¥15
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginTop: 12 }}>
          <span className="num" style={{ fontSize: 80, fontWeight: 900, lineHeight: 0.85 }}>{total}</span>
          <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)', fontWeight: 500, marginBottom: 8 }}>元</span>
        </div>
        <div style={{ marginTop: 6, fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
          预算 ¥84 · 用掉 <b style={{ color: '#fff', fontWeight: 800 }}>{Math.round(total / 84 * 100)}%</b>
        </div>
        {/* stacked bar — grayscale + accent palette */}
        <div style={{
          height: 8, background: 'rgba(0,0,0,0.06)', borderRadius: 999,
          marginTop: 16, display: 'flex', overflow: 'hidden', gap: 2,
        }}>
          {cats.map(c => {
            const fill = c.key === 'nec'  ? 'rgba(255,255,255,0.92)'
                       : c.key === 'opt'  ? 'rgba(255,255,255,0.55)'
                       : c.key === 'imp'  ? accent
                       :                    'rgba(255,255,255,0.25)';
            return (
              <div key={c.key} style={{ width: `${c.amount / total * 100}%`, background: fill }}/>
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
          {cats.map(c => {
            const fill = c.key === 'nec'  ? 'rgba(255,255,255,0.92)'
                       : c.key === 'opt'  ? 'rgba(255,255,255,0.55)'
                       : c.key === 'imp'  ? accent
                       :                    'rgba(255,255,255,0.25)';
            return (
              <div key={c.key} style={{
                fontSize: 10, color: '#7a7a78', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: fill }}/>
                {c.tag} <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 800 }}>¥{c.amount}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI insight */}
      <div style={{ margin: '0 18px 16px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <Buddy size={28} variant={avatarVariant} accent={accent}/>
        <div style={{
          background: 'linear-gradient(155deg, #2e2e32 0%, #18181b 100%)',
          color: '#fff', borderRadius: '4px 18px 18px 18px',
          border: '0.5px solid rgba(255,255,255,0.10)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.16), 0 8px 22px rgba(0,0,0,0.20)',
          padding: '12px 14px', fontSize: 13.5, lineHeight: 1.55, flex: 1,
        }}>
          打车 ¥22 是今天最大的可避免支出 —— 那条路地铁直达只要 ¥4。
          奶茶可以隔天喝，省下的 ¥80/月 够买半个月午餐了。
          <div style={{
            marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.12)',
            fontSize: 11, color: 'rgba(255,255,255,0.5)', display: 'flex', justifyContent: 'space-between'
          }}>
            <span>明日预算 · ¥84</span>
            <span style={{ color: accent, fontWeight: 700 }}>展开建议 →</span>
          </div>
        </div>
      </div>

      {/* CATEGORY LIST */}
      <div style={{ padding: '4px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>消费明细</h2>
        <span style={{ fontSize: 11, color: '#9a9a96', fontWeight: 600 }}>{cats.length} 类 · {cats.reduce((s,c)=>s+c.items.length,0)} 笔</span>
      </div>
      <div style={{ padding: '10px 18px 30px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {cats.map(c => {
          const tile = c.tone === 'accent' ? { bg: accent,    fg: accentInk }
                     : c.tone === 'dark'   ? { bg: '#2e2e2e', fg: '#fff'     }
                     : c.tone === 'soft'   ? { bg: '#e7e7e3', fg: '#0a0a0a'  }
                     :                       { bg: '#f3f3f1', fg: '#0a0a0a'  };
          return (
            <div key={c.key} style={{
              background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(28px) saturate(180%)', WebkitBackdropFilter: 'blur(28px) saturate(180%)', borderRadius: 20, padding: '14px 16px',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8), 0 4px 18px rgba(0,0,0,0.05)', border: '0.5px solid rgba(0,0,0,0.04)',
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 14, background: tile.bg, color: tile.fg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800,
              }}>{c.tag}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: 13, fontWeight: 800 }}>{c.tag}消费</span>
                  <span className="num" style={{ fontSize: 18, fontWeight: 800 }}>¥{c.amount}</span>
                </div>
                <div style={{
                  marginTop: 4, fontSize: 12, color: '#9a9a96',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{c.items.join('  ·  ')}</div>
              </div>
            </div>
          );
        })}

        {/* add btn */}
        <button className="press" style={{
          border: '1.5px dashed rgba(0,0,0,0.10)', background: 'transparent',
          borderRadius: 20, padding: '14px', color: '#9a9a96',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          fontSize: 13, fontWeight: 700, cursor: 'pointer',
        }}>
          <Icon.Plus size={16} color="#9a9a96"/> 再记一笔
        </button>
      </div>

      <div style={{ height: 96 }}/>
      <BottomNav active="review" onNav={onNav} style={navStyle} accent={accent} chatOpen={chatOpen}/>
    </ScreenShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// 4.  RISK EDUCATION
// ═══════════════════════════════════════════════════════════════════════
function RiskScreen({ onNav, accent, accentInk = '#0a0a0a', navStyle, avatarVariant, chatOpen = false }) {
  const riskLevel = 4; // 0-4 → 低 / 中低 / 中 / 高 / 极高
  const levels = ['低', '中低', '中', '高', '极高'];

  return (
    <ScreenShell label="04 Risk">
      <BackBar title="理财风险" onBack={() => onNav('home')}/>

      <div style={{ padding: '0 22px 4px' }}>
        <div style={{ fontSize: 11, color: '#9a9a96', fontWeight: 700, letterSpacing: '0.12em' }}>NOT FINANCIAL ADVICE</div>
        <h1 className="num" style={{ margin: '4px 0 8px', fontSize: 30, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15 }}>
          不推销，<br/>只帮你看懂风险
        </h1>
      </div>

      {/* QUESTION CHIP */}
      <div style={{
        margin: '14px 18px 0',
        background: 'linear-gradient(155deg, #2e2e32 0%, #18181b 100%)',
        border: '0.5px solid rgba(255,255,255,0.10)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.16), 0 8px 22px rgba(0,0,0,0.20)',
        borderRadius: 22, padding: '14px 16px', color: '#fff',
      }}>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 800, letterSpacing: '0.16em' }}>你问</div>
        <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>我能不能拿生活费买虚拟货币？</div>
      </div>

      {/* RISK GAUGE */}
      <div style={{
        margin: '14px 18px 16px', borderRadius: 28, padding: '22px 22px 18px',
        background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(28px) saturate(180%)', WebkitBackdropFilter: 'blur(28px) saturate(180%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8), 0 4px 18px rgba(0,0,0,0.05)', border: '0.5px solid rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#9a9a96', letterSpacing: '0.16em' }}>风险等级</div>
          <span style={{
            background: accent, color: accentInk, fontSize: 11, fontWeight: 800,
            padding: '4px 9px', borderRadius: 999,
          }}>学生不适合</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginTop: 6 }}>
          <span className="num" style={{ fontSize: 64, fontWeight: 900, lineHeight: 0.85, color: '#fff' }}>极高</span>
          <span style={{ fontSize: 13, color: '#9a9a96', fontWeight: 600, marginBottom: 8 }}>5 / 5 级</span>
        </div>

        {/* gauge — grayscale → accent */}
        <div style={{ marginTop: 18, display: 'flex', gap: 4 }}>
          {levels.map((_, i) => {
            const tones = ['#dededa', '#b8b8b3', '#7c7c78', '#3e3e3c', accent];
            return (
              <div key={i} style={{
                flex: 1, height: 8, borderRadius: 999,
                background: i <= riskLevel ? tones[i] : '#f3f3f1',
              }}/>
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          {levels.map((l, i) => (
            <span key={l} style={{
              fontSize: 10, fontWeight: 700,
              color: i === riskLevel ? '#0a0a0a' : '#c8c8c4',
            }}>{l}</span>
          ))}
        </div>
      </div>

      {/* AI explanation */}
      <div style={{ margin: '0 18px 16px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <Buddy size={28} variant={avatarVariant} accent={accent}/>
        <div style={{
          background: 'rgba(255,255,255,0.45)', borderRadius: '4px 18px 18px 18px',
          padding: '14px 16px', fontSize: 13.5, lineHeight: 1.6, color: '#0a0a0a', flex: 1,
        }}>
          直接说结论：<b>不能。</b>不是道德判断，是数学问题 ——
          <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 13, color: '#3a3a38' }}>
            <li style={{ marginBottom: 4 }}>日内 30~50% 波动属于常态</li>
            <li style={{ marginBottom: 4 }}>生活费 = 不可承受损失的钱</li>
            <li>你需要的是「亏完不影响下个月吃饭」的余钱</li>
          </ul>
        </div>
      </div>

      {/* Reason cards */}
      <div style={{ padding: '0 22px', fontSize: 15, fontWeight: 800, marginBottom: 10 }}>该问之前先想</div>
      <div style={{ padding: '0 18px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          { n: 1, t: '损失上限',  d: '极端情况会归零，能接受这笔钱完全消失吗？' },
          { n: 2, t: '应急备份',  d: '生活费是用来吃饭住宿的，没有冗余金' },
          { n: 3, t: '资产配置',  d: '高风险资产应 ≤ 总余钱的 5%，不是 100%' },
        ].map(r => (
          <div key={r.n} style={{
            background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(28px) saturate(180%)', WebkitBackdropFilter: 'blur(28px) saturate(180%)', borderRadius: 20, padding: '14px 16px',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8), 0 4px 18px rgba(0,0,0,0.05)', border: '0.5px solid rgba(0,0,0,0.04)',
            display: 'flex', alignItems: 'flex-start', gap: 14,
          }}>
            <span className="num" style={{
              fontSize: 24, fontWeight: 900, color: '#c8c8c4', width: 26, flexShrink: 0,
            }}>0{r.n}</span>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 800 }}>{r.t}</div>
              <div style={{ fontSize: 12, color: '#9a9a96', marginTop: 3 }}>{r.d}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Suggestion */}
      <div style={{
        margin: '8px 18px 16px', padding: '14px 16px', background: accent,
        borderRadius: 22, color: accentInk,
        border: '0.5px solid rgba(255,255,255,0.20)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22), 0 8px 22px rgba(0,0,0,0.35)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <Icon.Spark color={accentInk} size={20}/>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 800, opacity: 0.55, letterSpacing: '0.12em' }}>建议</div>
          <div style={{ fontSize: 13, fontWeight: 700, marginTop: 1 }}>先存够 3 个月生活费，再考虑投资</div>
        </div>
      </div>

      {/* disclaimer */}
      <div style={{ padding: '4px 22px 0', fontSize: 10.5, color: '#bdbdb8', textAlign: 'center', lineHeight: 1.5 }}>
        🔒 本回答仅供理财教育参考，不构成任何投资建议
      </div>

      <div style={{ height: 96 }}/>
      <BottomNav active="risk" onNav={onNav} style={navStyle} accent={accent} chatOpen={chatOpen}/>
    </ScreenShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// 5.  CHAT
// ═══════════════════════════════════════════════════════════════════════
function ChatScreen({ onNav, accent, accentInk = '#0a0a0a', avatarVariant }) {
  return (
    <ScreenShell label="05 Chat" bg="transparent">
      {/* header */}
      <div style={{
        background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(28px) saturate(180%)', WebkitBackdropFilter: 'blur(28px) saturate(180%)', padding: '4px 16px 14px',
        boxShadow: '0 1px 0 rgba(0,0,0,0.04)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={() => onNav('home')} className="press" style={{
          width: 36, height: 36, borderRadius: 18, border: 0, background: 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginLeft: -8,
        }}>
          <Icon.Back size={22} color="#fff"/>
        </button>
        <Buddy size={40} variant={avatarVariant} accent={accent}/>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 800 }}>攒钱搭子</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: '#16b86c' }}/>
            <span style={{ fontSize: 11, color: '#9a9a96', fontWeight: 600 }}>在线 · 不推销产品</span>
          </div>
        </div>
        <button className="press" style={{
          width: 36, height: 36, borderRadius: 18, border: 0, background: 'rgba(255,255,255,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="2.4" strokeLinecap="round">
            <circle cx="12" cy="6" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="18" r="1.4"/>
          </svg>
        </button>
      </div>

      {/* messages */}
      <div style={{ padding: '16px 14px 16px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ textAlign: 'center', fontSize: 10, color: '#bdbdb8', fontWeight: 600, marginBottom: 14 }}>
          5 月 15 日 14:08
        </div>

        <ChatBubble role="assistant" accent={accent}>
          你好呀 👋 我是你的攒钱搭子。<br/>我能做三件事：
          <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 13.5 }}>
            <li>拆攒钱目标 · 算每日预算</li>
            <li>复盘消费 · 找可优化项</li>
            <li>解释理财风险 · 不推销产品</li>
          </ul>
        </ChatBubble>

        <ChatBubble role="user">今天食堂18，奶茶16，外卖35，打车22</ChatBubble>

        <ChatBubble role="assistant" accent={accent}>
          我数了一下，今天总共花了 <b>¥91</b> —— 比预算 ¥84 超了 7 块。
        </ChatBubble>

        {/* result card inside chat */}
        <div style={{ marginLeft: 40, marginBottom: 14 }}>
          <div style={{
            background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(28px) saturate(180%)', WebkitBackdropFilter: 'blur(28px) saturate(180%)', borderRadius: 22, padding: '14px 16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)', maxWidth: 280,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#9a9a96', letterSpacing: '0.14em' }}>今日支出</div>
              <span style={{
                background: accent, color: accentInk, fontSize: 10, fontWeight: 800,
                padding: '3px 8px', borderRadius: 999,
              }}>超 ¥7</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, marginTop: 6 }}>
              <span className="num" style={{ fontSize: 38, fontWeight: 900, lineHeight: 0.9 }}>91</span>
              <span style={{ fontSize: 13, color: '#9a9a96', fontWeight: 600, marginBottom: 4 }}>元</span>
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[
                { t: '必要',   v: 18, bg: '#f3f3f1', fg: '#0a0a0a' },
                { t: '可优化', v: 51, bg: '#e7e7e3', fg: '#0a0a0a' },
                { t: '冲动',   v: 22, bg: accent,    fg: accentInk  },
              ].map(p => (
                <span key={p.t} style={{
                  fontSize: 11, fontWeight: 700, padding: '5px 10px', borderRadius: 999,
                  background: p.bg, color: p.fg,
                }}>{p.t} ¥{p.v}</span>
              ))}
            </div>
            <button onClick={() => onNav('review')} className="press" style={{
              marginTop: 12, width: '100%', border: '0.5px solid rgba(255,255,255,0.14)', cursor: 'pointer',
              background: 'rgba(0,0,0,0.06)', color: '#0a0a0a', fontSize: 12.5, fontWeight: 700,
              padding: '10px', borderRadius: 14,
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.16)',
            }}>展开复盘 →</button>
          </div>
        </div>

        <ChatBubble role="assistant" accent={accent}>
          最大的浪费是<b>打车 ¥22</b> —— 这条路地铁只要 ¥4。
          明天能省下来就回到预算线 👍
        </ChatBubble>

        {/* typing */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 14 }}>
          <Buddy size={32} variant={avatarVariant} accent={accent}/>
          <div style={{
            background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(28px) saturate(180%)', WebkitBackdropFilter: 'blur(28px) saturate(180%)', borderRadius: '20px 20px 20px 6px',
            padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            display: 'flex', gap: 4, alignItems: 'center',
          }}>
            {[0,1,2].map(i => (
              <span key={i} style={{
                width: 6, height: 6, borderRadius: 999, background: '#c8c8c4',
                animation: `bounce 1.2s ${i*150}ms infinite ease-in-out`,
              }}/>
            ))}
          </div>
        </div>
      </div>

      {/* chips + input */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(28px) saturate(180%)', WebkitBackdropFilter: 'blur(28px) saturate(180%)', padding: '10px 14px 30px',
        boxShadow: '0 -1px 0 rgba(0,0,0,0.04)',
      }}>
        <div style={{
          display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8,
        }}>
          {['帮我算每日预算', '今天能买基金吗', '存 600 难吗'].map(c => (
            <span key={c} style={{
              fontSize: 12, fontWeight: 600, padding: '7px 12px',
              borderRadius: 999, background: 'rgba(255,255,255,0.45)', color: '#3a3a38',
              whiteSpace: 'nowrap', flexShrink: 0,
            }}>{c}</span>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            flex: 1, background: 'rgba(255,255,255,0.45)', borderRadius: 22, padding: '12px 16px',
            color: '#9a9a96', fontSize: 14,
          }}>有什么想问的…</div>
          <button className="press" style={{
            width: 44, height: 44, borderRadius: 22, border: 0,
            background: accent, color: accentInk,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}>
            <Icon.Send size={18}/>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%,80%,100% { transform: translateY(0); opacity: 0.5; }
          40% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </ScreenShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// 6.  PROFILE · 我的
// ═══════════════════════════════════════════════════════════════════════
function ProfileScreen({ onNav, accent, accentInk = '#0a0a0a', navStyle, avatarVariant, chatOpen = false }) {
  return (
    <ScreenShell label="06 Profile">
      <div style={{ padding: '0 22px 4px' }}>
        <div style={{ fontSize: 11, color: '#9a9a96', fontWeight: 700, letterSpacing: '0.16em' }}>ACCOUNT</div>
        <h1 className="num" style={{ margin: '4px 0 18px', fontSize: 34, fontWeight: 800, letterSpacing: '-0.03em' }}>
          我的
        </h1>
      </div>

      {/* USER CARD */}
      <div style={{
        margin: '0 18px 16px',
        background: 'linear-gradient(155deg, #36363a 0%, #1a1a1d 100%)',
        border: '0.5px solid rgba(255,255,255,0.10)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 12px 36px rgba(0,0,0,0.22)',
        borderRadius: 26,
        padding: '18px 18px', color: '#fff',
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <Buddy size={56} variant={avatarVariant} accent={accent}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 800 }}>同学</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>本地账户 · 无需登录</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 10.5, fontWeight: 800, padding: '4px 9px', borderRadius: 999,
              background: 'rgba(255,255,255,0.12)', color: '#fff',
            }}>非营销认证</span>
            <span style={{
              fontSize: 10.5, fontWeight: 800, padding: '4px 9px', borderRadius: 999,
              background: accent, color: accentInk,
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}>
              <Icon.Flame size={10} color={accentInk}/> 理性消费 12 天
            </span>
          </div>
        </div>
      </div>

      {/* TOP STATS — 3 cards */}
      <div style={{ padding: '0 18px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {[
          { v: '47', l: '攒钱天数', s: '连击 12' },
          { v: '189', l: '复盘次数', s: '本月 23' },
          { v: '72', l: '日均消费', s: '元 / 天' },
        ].map(s => (
          <div key={s.l} style={{
            background: 'rgba(255,255,255,0.45)', borderRadius: 20, padding: '14px 10px',
            textAlign: 'center',
          }}>
            <div className="num" style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1 }}>{s.v}</div>
            <div style={{ fontSize: 11, color: '#0a0a0a', fontWeight: 700, marginTop: 6 }}>{s.l}</div>
            <div style={{ fontSize: 10, color: '#9a9a96', marginTop: 1 }}>{s.s}</div>
          </div>
        ))}
      </div>

      {/* FINANCIAL PROFILE */}
      <div style={{ padding: '0 22px 8px', fontSize: 16, fontWeight: 800 }}>财务画像</div>
      <div style={{ padding: '0 18px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6 }}>
        {[
          { v: '3,000', l: '月生活费' },
          { v: '1,800', l: '可支配' },
          { v: '600', l: '攒钱目标' },
          { v: '平衡', l: '风格' },
        ].map(s => (
          <div key={s.l} style={{
            background: 'rgba(255,255,255,0.45)', borderRadius: 16, padding: '12px 6px',
            textAlign: 'center',
          }}>
            <div className="num" style={{ fontSize: 16, fontWeight: 900, letterSpacing: '-0.03em' }}>{s.v}</div>
            <div style={{ fontSize: 10, color: '#9a9a96', marginTop: 4, fontWeight: 600 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* SETTINGS */}
      <div style={{ padding: '0 22px 8px', fontSize: 16, fontWeight: 800 }}>设置</div>
      <div style={{ padding: '0 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          { Ic: Icon.Target,  title: '攒钱计划',   desc: '¥84 / 天 · 平衡模式',     to: 'plan' },
          { Ic: Icon.Sliders, title: '消费分类规则', desc: '4 类已配置 · 自定义关键词', to: null },
          { Ic: Icon.Bell,    title: '提醒',       desc: '每晚 21:00 复盘提醒',     to: null,
            trailing: <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 999, background: accent, color: accentInk }}>开</span> },
          { Ic: Icon.Shield,  title: '隐私与数据', desc: '所有数据存在本地 · 不上传', to: null },
          { Ic: Icon.Help,    title: '帮助与反馈', desc: '常见问题 · 联系搭子',     to: null },
        ].map((s, i) => (
          <button key={i} onClick={() => s.to && onNav(s.to)} className="press" style={{
            width: '100%', textAlign: 'left', border: 0, background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(28px) saturate(180%)', WebkitBackdropFilter: 'blur(28px) saturate(180%)',
            borderRadius: 20, padding: '12px 14px', cursor: 'pointer',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8), 0 4px 18px rgba(0,0,0,0.05)', border: '0.5px solid rgba(0,0,0,0.04)',
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: 12,
              background: 'rgba(0,0,0,0.06)',
              border: '0.5px solid rgba(255,255,255,0.14)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <s.Ic size={18} color="#fff"/>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 800 }}>{s.title}</div>
              <div style={{ fontSize: 11.5, color: '#9a9a96', marginTop: 2 }}>{s.desc}</div>
            </div>
            {s.trailing ?? <Icon.Chevron color="#c8c8c4"/>}
          </button>
        ))}
      </div>

      {/* Sign out — outline button */}
      <div style={{ padding: '20px 18px 8px' }}>
        <button className="press" style={{
          width: '100%', background: 'transparent', border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: 20, padding: '14px', cursor: 'pointer',
          fontSize: 14, fontWeight: 700, color: '#0a0a0a',
        }}>
          清除本地数据
        </button>
      </div>

      <div style={{ padding: '12px 28px 24px', fontSize: 10, color: '#bdbdb8', textAlign: 'center', lineHeight: 1.5 }}>
        v1.0 · 本产品不推销任何金融产品<br/>所有回答仅供理财教育参考
      </div>

      <div style={{ height: 96 }}/>
      <BottomNav active="me" onNav={onNav} style={navStyle} accent={accent} chatOpen={chatOpen}/>
    </ScreenShell>
  );
}

Object.assign(window, { HomeScreen, PlanScreen, ReviewScreen, RiskScreen, ChatScreen, ProfileScreen });
