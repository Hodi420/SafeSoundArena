import React from 'react';

const NoTransitionDemo = () => (
  <div className="flex-center min-h-screen bg-gray-100">
    <div className="p-10 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-2">No Transition Page</h2>
      <p>This page disables the animated page transition.</p>
    </div>
  </div>
);

<<<<<<< HEAD
(NoTransitionDemo as { disableTransition?: boolean }).disableTransition = true;
=======
(NoTransitionDemo as any).disableTransition = true;
>>>>>>> 9841034 (Initial full project commit: user/admin dashboards, tasks, notifications, MongoDB, and statistics features)

export default NoTransitionDemo;
