import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    const msg = error?.message || error?.toString() || '';
    const isChunkOrMimeError =
      /text\/html|Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk|is not a valid JavaScript MIME type/i.test(msg);

    if (isChunkOrMimeError && typeof window !== 'undefined') {
      const now = Date.now();
      const lastReload = parseInt(sessionStorage.getItem('pwa_chunk_auto_reload') || '0', 10);
      // Auto-reload once every 20 seconds to fetch fresh index.html with new chunk hashes
      if (now - lastReload > 20000) {
        sessionStorage.setItem('pwa_chunk_auto_reload', String(now));
        try {
          if ('caches' in window) {
            caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).finally(() => {
              window.location.reload();
            });
          } else {
            window.location.reload();
          }
        } catch (_) {
          window.location.reload();
        }
      }
    }

    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Uncaught React Error:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    try {
      if ('caches' in window) {
        caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).finally(() => {
          window.location.href = window.location.origin + window.location.pathname + '?v=' + Date.now();
        });
      } else {
        window.location.href = window.location.origin + window.location.pathname + '?v=' + Date.now();
      }
    } catch (_) {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-800">
          <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-slate-900">Application Error</h2>
            <p className="text-xs text-slate-500 font-medium">
              An unexpected error occurred while rendering the page.
            </p>
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs font-mono text-rose-700 text-left overflow-x-auto max-h-32">
              {this.state.error?.toString() || 'Unknown error'}
            </div>
            <button
              onClick={this.handleReload}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" /> Reload Portal Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
