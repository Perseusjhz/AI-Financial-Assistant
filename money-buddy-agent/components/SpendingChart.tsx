import { useMemo, useState } from 'react';

interface DayPoint { label: string; amount: number; predicted: boolean; isToday?: boolean; }

// Matching Analysis.tsx: cubic bezier with midpoint control
function makePath(pts: { x: number; y: number }[]): string {
  return pts.map((p, i) => {
    if (i === 0) return `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    const prev = pts[i - 1];
    const cpx = ((prev.x + p.x) / 2).toFixed(1);
    return `C ${cpx} ${prev.y.toFixed(1)} ${cpx} ${p.y.toFixed(1)} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }).join(' ');
}

function weightedAvg(amounts: number[]): number {
  if (!amounts.length) return 70;
  let ws = 0, wt = 0;
  amounts.forEach((a, i) => { const w = Math.pow(1.5, i); ws += a * w; wt += w; });
  return Math.round(ws / wt);
}

interface Props {
  history: Array<{ date: string; amount: number }>;
  dailyBudget?: number;
}

export default function SpendingChart({ history, dailyBudget }: Props) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const { data, isDemo } = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const thisMonth = todayStr.slice(0, 7);
    const year = today.getFullYear(), month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayDate = today.getDate();

    const monthHist = [...history]
      .filter(h => h.date.startsWith(thisMonth))
      .sort((a, b) => a.date.localeCompare(b.date));

    if (!monthHist.length) return { data: [] as DayPoint[], isDemo: true };

    const map = new Map(monthHist.map(h => [h.date, h.amount]));
    const pred = weightedAvg(monthHist.map(h => h.amount));

    const pts: DayPoint[] = [];
    for (let d = 1; d <= todayDate; d++) {
      const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      pts.push({ label: String(d), amount: map.get(ds) ?? pred, predicted: false, isToday: d === todayDate });
    }
    for (let d = todayDate + 1; d <= Math.min(daysInMonth, todayDate + 6); d++) {
      pts.push({ label: String(d), amount: pred, predicted: true });
    }
    return { data: pts, isDemo: false };
  }, [history]);

  if (isDemo || data.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-2">
        <p className="text-3xl">📊</p>
        <p className="text-sm text-gray-400 font-medium">完成消费复盘后显示</p>
      </div>
    );
  }

  // ── SVG ───────────────────────────────────────────────────────────────────
  const W = 320, H = 160;
  const PAD = { top: 20, right: 10, bottom: 28, left: 10 };
  const plotW = W - PAD.left - PAD.right, plotH = H - PAD.top - PAD.bottom;

  const amounts = data.map(d => d.amount);
  const minVal = Math.min(...amounts) * 0.82;
  const maxVal = Math.max(...amounts) * 1.2;

  const toX = (i: number) => PAD.left + (i / (data.length - 1)) * plotW;
  const toY = (v: number) => PAD.top + plotH - ((v - minVal) / (maxVal - minVal)) * plotH;

  const allPts = data.map((d, i) => ({ x: toX(i), y: toY(d.amount) }));
  const splitAt = data.findIndex(d => d.predicted);
  const actualPts = splitAt === -1 ? allPts : allPts.slice(0, splitAt);
  const predPts   = splitAt > 0 ? allPts.slice(splitAt - 1) : [];

  const actualPath = makePath(actualPts);
  const predPath   = predPts.length >= 2 ? makePath(predPts) : '';
  const baseline   = toY(minVal) + 1;
  const fillPath   = actualPts.length >= 2
    ? `${actualPath} L ${actualPts.at(-1)!.x},${baseline} L ${PAD.left},${baseline} Z`
    : '';

  const budgetY = dailyBudget ? toY(dailyBudget) : null;
  const showLabel = (i: number) => {
    if (data.length <= 10) return true;
    const d = parseInt(data[i].label);
    return d === 1 || d % 5 === 0 || i === data.length - 1;
  };

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ overflow: 'visible' }}
    >
      <defs>
        <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#000" stopOpacity="0.09" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.005" />
        </linearGradient>
      </defs>

      {/* Horizontal grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map(t => (
        <line key={t}
          x1={PAD.left} y1={PAD.top + t * plotH}
          x2={W - PAD.right} y2={PAD.top + t * plotH}
          stroke="#e5e5e5" strokeWidth="1" strokeDasharray="4 4"
        />
      ))}

      {/* Budget reference */}
      {budgetY != null && budgetY > PAD.top && budgetY < H - PAD.bottom && (
        <line x1={PAD.left} y1={budgetY} x2={W - PAD.right} y2={budgetY}
          stroke="#999" strokeWidth="1" strokeDasharray="3,3" />
      )}

      {/* Fill */}
      {fillPath && <path d={fillPath} fill="url(#cg)" />}

      {/* Actual line */}
      {actualPts.length >= 2 && (
        <path d={actualPath} fill="none" stroke="#000" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round"
          className="animate-chart-draw"
          style={{ strokeDasharray: 1200, strokeDashoffset: 0 }}
        />
      )}

      {/* Predicted dashed */}
      {predPath && (
        <path d={predPath} fill="none" stroke="#bbb" strokeWidth="1.8"
          strokeDasharray="5,4" strokeLinecap="round" />
      )}

      {/* Interactive dots */}
      {actualPts.map((pt, i) => (
        <g key={`d${i}`} onClick={() => setActiveIdx(activeIdx === i ? null : i)} style={{ cursor: 'pointer' }}>
          {/* Tap target */}
          <circle cx={pt.x} cy={pt.y} r="12" fill="transparent" />
          {/* Dot */}
          <circle
            cx={pt.x} cy={pt.y}
            r={activeIdx === i ? 6.5 : (data[i].isToday ? 5.5 : 4)}
            fill={activeIdx === i ? '#000' : (data[i].isToday ? '#000' : '#fff')}
            stroke="#000"
            strokeWidth={activeIdx === i ? 0 : 2.2}
            style={{ transition: 'all 0.18s' }}
          />
          {/* Today ring */}
          {data[i].isToday && activeIdx !== i && (
            <circle cx={pt.x} cy={pt.y} r="9" fill="#000" fillOpacity="0.1" />
          )}
          {/* Tooltip */}
          {activeIdx === i && (
            <g className="animate-bubble-in">
              <rect x={pt.x - 26} y={pt.y - 34} width={52} height={22} rx={6} fill="#000" />
              <text x={pt.x} y={pt.y - 18}
                textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#fff"
                fontFamily="Inter,-apple-system,sans-serif">
                ¥{data[i].amount}
              </text>
            </g>
          )}
        </g>
      ))}

      {/* Predicted dots (skip join point) */}
      {predPts.slice(1).map((pt, i) => (
        <circle key={`p${i}`} cx={pt.x} cy={pt.y} r="3"
          fill="#fff" stroke="#bbb" strokeWidth="1.5" />
      ))}

      {/* Day labels */}
      {data.map((d, i) => showLabel(i) && (
        <text key={`l${i}`}
          x={toX(i)} y={H - 4}
          textAnchor="middle"
          fill={activeIdx === i ? '#000' : (d.predicted ? '#ccc' : '#aaa')}
          fontSize={data.length > 14 ? '9' : '10'}
          fontWeight={activeIdx === i ? '700' : '500'}
          fontFamily="Inter,-apple-system,sans-serif"
        >
          {data.length > 14 ? `${d.label}日` : d.label}
        </text>
      ))}
    </svg>
  );
}
