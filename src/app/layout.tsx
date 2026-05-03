import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import OneSignalInit from '@/components/OneSignalInit';

export const metadata: Metadata = {
  title: 'Solucionex - Gestión de Delivery',
  description: 'Sistema profesional de gestión de logística y entrega de paquetes.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
      <OneSignalInit />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
