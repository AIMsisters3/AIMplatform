import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import ErrorBoundary from './Components/ErrorBoundary.jsx';
import './index.css';

// Nothing previously caught a render-phase error anywhere in the app —
// React's default behavior is to unmount the whole tree, leaving a
// genuinely blank white page with no message and no way to recover
// short of a manual reload. This was almost certainly part of what the
// admin publishing flow's "blank screen" symptom actually was (on top
// of the specific publish-flow fixes in UploadContent.jsx itself) —
// this boundary catches it here, application-wide, not just there.
function TopLevelErrorFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 text-center">
      <div>
        <h1 className="text-xl font-semibold text-ink mb-2">Something went wrong</h1>
        <p className="text-sm text-ink/50 mb-6">
          Please reload the page. If you were in the middle of something, your work may still be saved as a draft.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2.5 rounded-full bg-brand-gradient text-white font-semibold text-sm"
        >
          Reload Page
        </button>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary fallback={<TopLevelErrorFallback />}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
