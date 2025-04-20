import React from 'react';
import { PageTransition } from '../components/PageTransition';
import { AnimatedCard } from '../components/AnimatedCard';
import { IconButton } from '../components/IconButton';
import { ButtonGroup } from '../components/ButtonGroup';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { SkeletonCard } from '../components/SkeletonCard';
import { AnimatedSection } from '../components/AnimatedSection';
import { DarkModeToggle } from '../components/DarkModeToggle';
import { useToast } from '../components/ToastContext';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { motion } from 'framer-motion';

const items = [
  { id: 1, title: 'First Card', desc: 'This is the first animated card.' },
  { id: 2, title: 'Second Card', desc: 'This is the second animated card.' },
  { id: 3, title: 'Third Card', desc: 'This is the third animated card.' },
];

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0 }
};

const AnimationDemo: React.FC = () => {
  const { ref, controls } = useScrollAnimation();
  const [loading, setLoading] = React.useState(false);
  const { showToast } = useToast();

  React.useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <PageTransition>
      <main className="relative flex-center min-h-screen bg-lightbg dark:bg-darkbg px-2 sm:px-4" aria-label="Animation Demo Main Content">
        {/* Top right controls */}
        <div className="absolute top-4 right-4 flex items-center z-20">
          <button
            onClick={() => showToast('This is a toast notification!', 'success')}
            className="mr-2 px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Show toast notification"
          >
            Show Toast
          </button>
          <DarkModeToggle />
        </div>
        <section className="w-full max-w-4xl py-8">
          <header>
            <h1 className="text-3xl font-bold mb-6 text-center">Animation Demo</h1>
          </header>

          {/* Enhanced Button Showcase */}
          <nav className="mb-8 flex-center" aria-label="Demo Actions">
            <ButtonGroup>
              <IconButton ariaLabel="Like" title="Like" primary>👍</IconButton>
              <IconButton ariaLabel="Delete" title="Delete" danger>🗑️</IconButton>
              <IconButton ariaLabel="Active" title="Active" active>✅</IconButton>
              <IconButton ariaLabel="Default" title="Default">🔔</IconButton>
            </ButtonGroup>
          </nav>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1,2,3].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : (
            <div ref={ref} className="grid-container">
              {items.map((item, index) => (
                <motion.div
                  key={item.id}
                  variants={cardVariants}
                  initial="hidden"
                  animate={controls}
                  transition={{ duration: 0.4, delay: index * 0.15 }}
                >
                  <AnimatedCard>
                    <h2 className="text-xl font-semibold mb-2">{item.title}</h2>
                    <p className="text-gray-600">{item.desc}</p>
                  </AnimatedCard>
                </motion.div>
              ))}
            </div>
          )}
        </section>
        {/* Animated Section Example */}
        <AnimatedSection className="mt-16 bg-lightbg-surface dark:bg-darkbg-surface rounded-lg shadow-lg p-8 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold mb-2">Animated Section</h2>
          <p className="text-gray-600">
            This section animates into view as you scroll down the page. Use <code>AnimatedSection</code> to add scroll-based transitions to any section or element in your app for a lively, modern feel.
          </p>
        </AnimatedSection>
      </main>
    </PageTransition>
  );
};

export default AnimationDemo;
