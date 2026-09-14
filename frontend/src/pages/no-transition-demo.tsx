export default function NoTransitionDemo() {
  return (
    <div className="flex-center min-h-screen bg-gray-100">
      <div className="p-10 bg-white rounded shadow">
        <h2 className="text-2xl font-bold mb-2">No Transition Page</h2>
        <p>This page disables the animated page transition.</p>
      </div>
    </div>
  );
}

NoTransitionDemo.disableTransition = true;
 

