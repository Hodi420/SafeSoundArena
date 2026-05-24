function NoTransitionDemo() {
  return null;
}

(NoTransitionDemo as { disableTransition?: boolean }).disableTransition = true;

export default NoTransitionDemo;
