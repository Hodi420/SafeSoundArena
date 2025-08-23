import { useState } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import dynamic from 'next/dynamic';

const ThemeCustomizer = dynamic(() => import('../safesoundarena-clean/components/ThemeCustomizer'), { ssr: false });

export default function Layout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar onOpenCustomizer={() => setOpen(true)} />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">{children}</main>
      <Footer />
      <ThemeCustomizer isOpen={open} onClose={() => setOpen(false)} />
    </div>
  );
}


