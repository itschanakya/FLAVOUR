import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Monkey-patch fetch to automatically prepend VITE_API_BASE_URL to all /api/ requests
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  let [resource, config] = args;
  
  if (typeof resource === 'string' && resource.startsWith('/api/')) {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
    resource = baseUrl + resource;
  }
  
  return originalFetch(resource, config);
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
