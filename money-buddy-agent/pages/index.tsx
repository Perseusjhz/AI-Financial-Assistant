import Head from 'next/head';

export default function Home() {
  return (
    <>
      <Head>
        <title>攒钱搭子 AI</title>
        <meta name="description" content="面向大学生的理财陪伴智能体" />
      </Head>
      <style jsx global>{`
        html, body, #__next {
          width: 100%;
          height: 100%;
          margin: 0;
          background: #0f0f10;
          overflow: hidden;
        }
      `}</style>
      <iframe
        title="攒钱搭子 AI"
        src="/agent-money/Money%20Buddy%20Redesign.html"
        style={{
          display: 'block',
          width: '100vw',
          height: '100vh',
          border: 0,
          background: '#0f0f10',
        }}
      />
    </>
  );
}
