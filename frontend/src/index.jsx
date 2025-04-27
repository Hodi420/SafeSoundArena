import React from 'react';
import { createRoot } from 'react-dom/client';
import UserEntryPoint from './ui/UserEntryPoint';

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<UserEntryPoint />);
