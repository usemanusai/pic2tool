import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

console.log('Renderer starting...');

const container = document.getElementById('root');
if (!container) {
  console.error('Root element not found');
  throw new Error('Root element not found');
}

console.log('Root element found, creating React root...');

try {
  const root = createRoot(container);
  console.log('React root created, rendering App...');
  root.render(<App />);
  console.log('App rendered successfully');
} catch (error) {
  console.error('Error rendering React app:', error);
  // Show error in the UI
  container.innerHTML = `
    <div style="padding: 20px; color: red; font-family: monospace;">
      <h2>Error loading application</h2>
      <p>${error instanceof Error ? error.message : String(error)}</p>
      <p>Check the console for more details.</p>
    </div>
  `;
}
