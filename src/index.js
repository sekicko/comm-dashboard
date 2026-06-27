import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './calendar-styles.css';
import App from './App';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found.');
}

const root = ReactDOM.createRoot(rootElement);

try {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  console.error('Failed to render app:', error);
  rootElement.innerHTML = `
    <div style="font-family: Arial, sans-serif; padding: 24px; color: #0f172a;">
      <h2>Something went wrong</h2>
      <p>${error.message || 'The application could not start.'}</p>
    </div>
  `;
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => registration.unregister());
  }).catch(() => {
    // ignore service worker cleanup errors
  });
}
