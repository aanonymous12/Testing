import { useEffect } from 'react';

export const usePWA = () => {
  useEffect(() => {
    // Badging API initialization (generic)
    // We could set it to 1 just to show it works, or keep it clear
    if ('setAppBadge' in navigator) {
      // (navigator as any).setAppBadge(0).catch((e: any) => console.error('Badging failed', e));
    }
  }, []);

  const setBadge = async (count?: number) => {
    if ('setAppBadge' in navigator) {
      try {
        if (count === 0) {
          await (navigator as any).clearAppBadge();
        } else {
          await (navigator as any).setAppBadge(count);
        }
      } catch (error) {
        console.error('Failed to set badge:', error);
      }
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications.');
      return false;
    }

    let permission = Notification.permission;
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    return permission === 'granted';
  };

  const sendLocalNotification = (title: string, body: string) => {
    if (Notification.permission === 'granted' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, {
          body,
          icon: 'https://www.janakpanthi.com.np/Resources/images/profile-1.jpg',
          badge: 'https://www.janakpanthi.com.np/favicon.ico',
          vibrate: [200, 100, 200]
        } as any);
      });
    }
  };

  return { setBadge, requestNotificationPermission, sendLocalNotification };
};
