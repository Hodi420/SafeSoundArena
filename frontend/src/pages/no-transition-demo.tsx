function NoTransitionDemo() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <section className="rounded-lg bg-white p-8 text-center shadow">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">No Transition Page</h1>
        <p className="text-gray-600">Animated page transitions are disabled here.</p>
      </section>
    </main>
  );
}

(NoTransitionDemo as { disableTransition?: boolean }).disableTransition = true;

export default NoTransitionDemo;
