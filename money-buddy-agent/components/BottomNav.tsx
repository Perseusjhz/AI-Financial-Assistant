import Link from 'next/link';
import { useRouter } from 'next/router';
import { HomeIcon, BarChart2Icon, ScanLineIcon, ActivityIcon, UserIcon } from 'lucide-react';

const LEFT_TABS = [
  { path: '/',             Icon: HomeIcon,     label: '首页'  },
  { path: '/saving-plan',  Icon: BarChart2Icon, label: '攒钱'  },
];
const RIGHT_TABS = [
  { path: '/expense-review', Icon: ActivityIcon, label: '复盘' },
  { path: '/my-plans',       Icon: UserIcon,     label: '我的' },
];

export default function BottomNav() {
  const { pathname } = useRouter();

  const tab = (path: string, Icon: React.FC<{ size: number; strokeWidth: number; className?: string }>, label: string) => {
    const active = pathname === path;
    return (
      <Link
        key={path}
        href={path}
        className="flex flex-col items-center gap-1 min-w-[48px] py-1 transition-all duration-200"
      >
        <Icon
          size={22}
          strokeWidth={active ? 2.5 : 1.8}
          className={`transition-all duration-200 ${active ? 'text-black' : 'text-gray-400'}`}
        />
        <span className={`text-[10px] font-medium transition-all duration-200 ${active ? 'text-black' : 'text-gray-400'}`}>
          {label}
        </span>
      </Link>
    );
  };

  const isChat = pathname === '/chat';

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center">
      <div
        className="w-full max-w-[430px] bg-white/95 backdrop-blur-xl border-t border-gray-100 shadow-dock flex items-center justify-around px-4 py-3"
        style={{ paddingBottom: `calc(0.75rem + env(safe-area-inset-bottom, 0px))` }}
      >
        {LEFT_TABS.map(t => tab(t.path, t.Icon as any, t.label))}

        {/* Center FAB */}
        <Link
          href="/chat"
          className="flex flex-col items-center justify-center -mt-6"
        >
          <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${
            isChat ? 'bg-black scale-110 shadow-bubble' : 'bg-black shadow-bubble'
          }`}>
            <ScanLineIcon size={22} className="text-white" strokeWidth={2} />
          </div>
        </Link>

        {RIGHT_TABS.map(t => tab(t.path, t.Icon as any, t.label))}
      </div>
    </div>
  );
}
