import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Determine the base path from the <base> tag. This makes the app deployable to any sub-directory.
const getBasePath = (): string => {
    const baseHref = document.querySelector('base')?.href;
    if (baseHref) {
        const path = new URL(baseHref).pathname;
        // Remove the trailing slash if it's not the root for consistent path joining.
        return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
    }
    // Fallback for when <base> tag is not present is root.
    return '/';
};

const VITE_BASE_PATH = getBasePath();


const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    {/* Switched to HashRouter for better compatibility with static hosting environments */}
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // The base path is still needed to correctly locate the service worker file in sub-directories.
    const serviceWorkerUrl = VITE_BASE_PATH === '/' ? '/service-worker.js' : `${VITE_BASE_PATH}/service-worker.js`;
    navigator.serviceWorker.register(serviceWorkerUrl)
      .then(registration => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      })
      .catch(error => {
        console.log('ServiceWorker registration failed: ', error);
      });
  });
}
