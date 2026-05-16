import Head from 'next/head';
import BottomNav from './BottomNav';

interface Props {
  title?: string;
  children: React.ReactNode;
  noNav?: boolean;
}

export default function Layout({ title = '攒钱搭子 AI', children, noNav = false }: Props) {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="description" content="不推销理财产品，只陪你把生活费管明白" />
        <meta name="theme-color" content="#000000" />
        <link rel="manifest" href="/manifest.json" />
      </Head>
      <div className="min-h-screen bg-white flex flex-col max-w-[430px] mx-auto">
        <main className={noNav ? '' : 'pb-24'}>{children}</main>
        {!noNav && <BottomNav />}
      </div>
    </>
  );
}
