import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initFrontendSentry, Sentry } from './lib/sentry'

// Initialize Sentry before rendering React
initFrontendSentry();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
          <div className="max-w-md w-full p-6 border border-border rounded-xl bg-card shadow-lg text-center space-y-4">
            <h2 className="text-xl font-bold">Something went wrong</h2>
            <p className="text-sm text-muted-foreground">
              An unexpected error occurred. The incident has been reported to our engineering team.
            </p>
            {error ? (
              <pre className="text-xs bg-muted p-3 rounded-lg text-left overflow-auto max-h-32 text-destructive">
                {String(error)}
              </pre>
            ) : null}
            <button
              onClick={() => {
                resetError();
                window.location.href = "/";
              }}
              className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
            >
              Reload application
            </button>
          </div>
        </div>
      )}
    >
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>,
)
