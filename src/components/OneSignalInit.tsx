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
        if (window.location.hostname === 'solucionexdv.vercel.app') {
          await OneSignal.init({
            appId: '64ec4f91-28b2-4a11-8ea9-8e2562593c0e',
            notifyButton: { enable: false },
            autoResubscribe: true,
            promptOptions: {
              slidedown: {
                prompts: [
                  {
                    type: 'push',
                    autoPrompt: true,
                    text: {
                      actionMessage: 'Recibe notificaciones de tus entregas',
                      acceptButton: 'Permitir',
                      cancelButton: 'No',
                    },
                  }
                ]
              }
            }
          });
        } else {
          console.warn('OneSignal: Dominio actual no autorizado para esta App ID. Se omite la inicialización para evitar errores.');
        }
      } catch (error) {
        console.error('Error al inicializar OneSignal:', error);
      }
    });
  }, []);

  return null;
}
