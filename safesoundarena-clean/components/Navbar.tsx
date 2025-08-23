import Link from 'next/link';
import { useState } from 'react';

export default function Navbar({ onOpenCustomizer }: { onOpenCustomizer: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <nav className="w-full border-b border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-black/40 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-semibold tracking-wide">
            SafeSoundArena
          </Link>
          <div className="hidden md:flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
            <Link href="/leaderboard">Leaderboard</Link>
            <Link href="/jail">Jail</Link>
            <Link href="/license">License</Link>
            <a href="https://github.com/" target="_blank" rel="noreferrer">GitHub</a>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 rounded-md border text-sm hover:bg-gray-50 dark:hover:bg-gray-900" onClick={onOpenCustomizer}>
            Theme
          </button>
          <button className="md:hidden px-3 py-1.5 rounded-md border text-sm" onClick={() => setOpen(!open)}>Menu</button>
        </div>
      </div>
      {open && (
        <div className="md:hidden px-4 pb-3 flex flex-col gap-2 text-sm border-t border-gray-100 dark:border-gray-800">
          <Link href="/leaderboard">Leaderboard</Link>
          <Link href="/jail">Jail</Link>
          <Link href="/license">License</Link>
        </div>
      )}
    </nav>
  );
}


