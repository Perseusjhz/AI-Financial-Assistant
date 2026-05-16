import { ChatMessage } from '../lib/types';
import { ResultCardList } from './ResultCard';

interface Props {
  message: ChatMessage;
}

export default function ChatBubble({ message }: Props) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} items-end`}>
      {!isUser && (
        <div className="w-9 h-9 rounded-full bg-black flex items-center justify-center text-base shrink-0 shadow-sm">
          🐷
        </div>
      )}

      <div className={`flex flex-col gap-2 max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? 'bg-black text-white rounded-br-md'
              : 'bg-white text-gray-800 rounded-bl-md shadow-sm'
          }`}
        >
          {message.content}
        </div>

        {!isUser && message.cards && message.cards.length > 0 && (
          <div className="w-full">
            <ResultCardList cards={message.cards} />
          </div>
        )}
      </div>
    </div>
  );
}
