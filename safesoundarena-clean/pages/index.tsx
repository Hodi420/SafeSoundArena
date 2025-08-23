import Layout from '../components/Layout';
import Link from 'next/link';

export default function Home() {
  return (
    <Layout>
      <section className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Welcome to SafeSoundArena</h1>
        <p className="text-gray-600 dark:text-gray-300 max-w-2xl">
          A secure, community-driven arena with live leaderboards, jail events, and license verification.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card title="Leaderboards" desc="Top scores by category" href="/leaderboard" />
          <Card title="Jail" desc="Live jail events & status" href="/jail" />
          <Card title="License" desc="Verify your license" href="/license" />
        </div>
      </section>
    </Layout>
  );
}

function Card({ title, desc, href }: { title: string; desc: string; href: string }) {
  return (
    <Link href={href} className="block p-5 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-blue-500 transition-colors">
      <div className="font-semibold">{title}</div>
      <div className="text-sm text-gray-600 dark:text-gray-400">{desc}</div>
    </Link>
  );
}
