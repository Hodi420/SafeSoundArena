import { motion } from 'framer-motion';
import React from 'react';

const defaultVariants = {
  initial: { opacity: 0, y: 20 },
  enter: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

interface PageTransitionProps {
  children: React.ReactNode;
  variants?: any;
  transition?: any;
}

export const PageTransition: React.FC<PageTransitionProps> = ({ children, variants = defaultVariants, transition = { duration: 0.4, ease: 'easeInOut' } }) => {
  return (
    <motion.div
      initial="initial"
      animate="enter"
      exit="exit"
      variants={variants}
      transition={transition}
    >
      {children}
    </motion.div>
  );
};
