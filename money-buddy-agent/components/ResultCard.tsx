import { ResultCard as ResultCardType } from '../lib/types';

// Monochromatic style — progress bar widths for visual emphasis
const TYPE_BAR: Record<NonNullable<ResultCardType['type']>, number> = {
  primary: 70, success: 85, warning: 50, danger: 20, info: 60, neutral: 40,
};

interface Props {
  card: ResultCardType;
  index?: number;
}

export default function ResultCard({ card, index = 0 }: Props) {
  const barWidth = TYPE_BAR[card.type || 'neutral'];
  const isDanger = card.type === 'danger';
  const isSuccess = card.type === 'success';

  return (
    <div
      className="result-card bg-[#f0f0f0] rounded-2xl p-4"
      style={{ animationDelay: `${index * 0.07}s` }}
    >
      <p className="text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-2">
        {card.title}
      </p>
      <p className={`text-base font-bold leading-snug mb-2 ${
        isDanger ? 'text-red-500' : isSuccess ? 'text-black' : 'text-black'
      }`}>
        {card.value}
      </p>
      {card.subtitle && (
        <p className="text-[11px] text-gray-400 mb-2">{card.subtitle}</p>
      )}
      <div className="progress-track">
        <div
          className={`progress-fill ${isDanger ? '!bg-red-400' : ''}`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </div>
  );
}

export function ResultCardList({ cards }: { cards: ResultCardType[] }) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {cards.map((card, i) => (
        <ResultCard key={i} card={card} index={i} />
      ))}
    </div>
  );
}
