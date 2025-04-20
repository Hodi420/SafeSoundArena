import Link from 'next/link';

export default function About() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-purple-50 text-gray-900">
      <section className="w-full bg-gradient-to-r from-blue-100 to-purple-100 border-b border-blue-200 py-10 px-4 text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-extrabold text-blue-700 mb-3">About SafeSoundArena</h1>
        <p className="text-lg md:text-xl text-gray-700 mb-2 max-w-2xl mx-auto">SafeSoundArena is a modern questing platform where you can embark on adventures, join guilds, and earn Pi rewards. Our mission is to make learning, gaming, and earning fun and accessible for everyone.</p>
      </section>
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-purple-700 mb-4">🌟 Our Vision</h2>
          <p className="text-gray-700 mb-4">We believe in empowering users through interactive quests, community-driven guilds, and real rewards powered by Pi Network. Whether you’re a gamer, learner, or pioneer, there’s a place for you here.</p>
          <h2 className="text-2xl font-bold text-blue-700 mb-4">🚀 Join the Adventure</h2>
          <p className="text-gray-700 mb-4">Start your journey by exploring quests, joining a guild, or connecting your Pi wallet. Have questions? <Link href="/contact" className="text-blue-600 hover:underline">Contact us</Link> any time!</p>
        </div>
        <div className="text-center">
          <Link href="/" className="btn-primary px-8 py-3 rounded-full shadow hover:scale-105 focus:ring-2 focus:ring-blue-400 transition">
            ← Back to Home
          </Link>
        </div>
      </main>
    </div>
  );
}
