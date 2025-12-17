import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryClient, idbPersister } from './services/queryClient';
import { ErrorBoundary } from './components/ErrorBoundary';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Determine the base path from the <base> tag.
const getBasePath = (): string => {
    const baseHref = document.querySelector('base')?.href;
    if (baseHref) {
        const path = new URL(baseHref).pathname;
        return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
    }
    return '/';
};

const VITE_BASE_PATH = getBasePath();

const enableMocking = async () => {
    // Enable mocks if explicit query param exists 'http://.../?mock=true'
    const urlParams = new URLSearchParams(window.location.search);
    const mockEnabled = urlParams.get('mock') === 'true';
    
    if (mockEnabled) {
        console.log('Mocking enabled via query parameter.');
        const { worker } = await import('./mocks/browser');
        // By default, do not warn about unhandled requests to avoid noise from non-API assets
        return worker.start({
            onUnhandledRequest: 'bypass',
        });
    }
}

const root = ReactDOM.createRoot(rootElement);

enableMocking().then(() => {
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: idbPersister }}>
          <HashRouter>
            <App />
          </HashRouter>
        </PersistQueryClientProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
});

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const serviceWorkerUrl = VITE_BASE_PATH === '/' ? '/service-worker.js' : `${VITE_BASE_PATH}/service-worker.js`;
    navigator.serviceWorker.register(serviceWorkerUrl)
      .then(registration => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      })
      .catch(error => {
        // Fail silently
      });
  });
}