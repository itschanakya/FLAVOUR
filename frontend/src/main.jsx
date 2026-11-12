import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Handle Vite dynamic import chunk failures gracefully
window.addEventListener('vite:preloadError', (event) => {
  console.warn('Vite dynamic import preload error, auto-reloading to fetch latest assets:', event);
  window.location.reload();
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('SW registration:', err);
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
