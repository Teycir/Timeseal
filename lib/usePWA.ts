'use client';

import { useEffect } from 'react';

export function usePWA() {
  useEffect(() => {
    // Unregister service worker if it exists
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => registration.unregister());
      }).catch((error) => {
        console.error('Failed to unregister service worker:', error);
      });
    }
  }, []);

  return {};
}
