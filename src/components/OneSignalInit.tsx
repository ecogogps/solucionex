'use client';

import { useEffect } from 'react';

export default function OneSignalInit() {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
    script.defer = true;
    document.head.appendChild(script);

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function(OneSignal: any) {
      try {
        // Solo intentamos inicializar si el dominio coincide con el configurado en OneSignal
        // Esto evita el error de consola en ambientes de desarrollo o workstations
        if (window.location.hostname === 'solucionexdv.vercel.app') {
          await OneSignal.init({
            appId: '64ec4f91-28b2-4a11-8ea9-8e2562593c0e',
            notifyButton: { enable: true },
          });
        } else {
          console.warn('OneSignal: Dominio actual no autorizado para esta App ID. Se omite la inicialización para evitar errores.');
        }
      } catch (error) {
        // Capturamos el error para evitar que la aplicación muestre un overlay de error de NextJS
        console.error('Error al inicializar OneSignal:', error);
      }
    });
  }, []);

  return null;
}
