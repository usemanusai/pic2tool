import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

console.log('🚀 Renderer starting...');
console.log('🌍 Environment check:', {
  isElectron: typeof window !== 'undefined' && !!window.electronAPI,
  userAgent: navigator.userAgent,
  location: window.location.href,
  windowKeys: Object.keys(window).filter(key => key.includes('electron') || key.includes('API'))
});

// Check if electronAPI is available immediately
console.log('🔍 Initial electronAPI check:', !!window.electronAPI);
if (window.electronAPI) {
  console.log('✅ electronAPI methods available:', Object.keys(window.electronAPI));
} else {
  console.log('❌ electronAPI not available on window object');
  console.log('🔍 Available window properties:', Object.keys(window).slice(0, 20));
}

const container = document.getElementById('root');
if (!container) {
  console.error('❌ Root element not found');
  throw new Error('Root element not found');
}

console.log('✅ Root element found, creating React root...');

// Add global error handlers
window.addEventListener('error', (event) => {
  console.error('🚨 Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('🚨 Unhandled promise rejection:', event.reason);
});

try {
  const root = createRoot(container);
  console.log('✅ React root created, rendering App...');

  root.render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );

  console.log('✅ App rendered successfully');

  // Add multiple checks to see when electronAPI becomes available
  [100, 500, 1000, 2000, 5000].forEach(delay => {
    setTimeout(() => {
      console.log(`🔍 App status check after ${delay}ms:`, {
        containerHasContent: container.children.length > 0,
        electronAPIAvailable: !!window.electronAPI,
        electronAPIMethods: window.electronAPI ? Object.keys(window.electronAPI).length : 0
      });
    }, delay);
  });

} catch (error) {
  console.error('❌ Error rendering React app:', error);
  // Show error in the UI
  container.innerHTML = `
    <div style="padding: 20px; color: red; font-family: monospace; background: #ffe0e0; border: 2px solid #ff6b6b; border-radius: 8px; margin: 20px;">
      <h2>🚨 Error loading application</h2>
      <p><strong>Error:</strong> ${error instanceof Error ? error.message : String(error)}</p>
      <p><strong>Stack:</strong></p>
      <pre style="background: #f8f9fa; padding: 10px; border-radius: 4px; overflow: auto;">${error instanceof Error ? error.stack : 'No stack trace available'}</pre>
      <p>Check the console for more details.</p>
      <button onclick="window.location.reload()" style="padding: 10px 20px; background: #0984e3; color: white; border: none; border-radius: 4px; cursor: pointer;">
        🔄 Reload Application
      </button>
    </div>
  `;
}
