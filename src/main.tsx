import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary';
import { SettingsProvider } from './context/SettingsContext';
import './index.css';

// Register Service Worker (Production Only)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      console.log('SW registered: ', registration);
      
      // Check for updates periodically
      const updateInterval = setInterval(() => {
        if (registration) {
          registration.update().catch(err => {
            // Silently fail as updates might fail in certain browser states
            console.debug('SW update skipped or failed:', err);
          });
        }
      }, 1000 * 60 * 60); // Every hour

      return () => clearInterval(updateInterval);
    }).catch((registrationError) => {
      console.log('SW registration failed: ', registrationError);
    });
  });

  // Handle updates properly
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <SettingsProvider>
        <BrowserRouter>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </BrowserRouter>
      </SettingsProvider>
    </HelmetProvider>
  </StrictMode>,
);
