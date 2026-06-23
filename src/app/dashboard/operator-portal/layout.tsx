'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Package, ClipboardCheck, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function OperatorPortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background text-white flex flex-col">
      {/* Contenido principal de las páginas */}
      <main className="flex-1">
        {children}
      </main>

      {/* Navegación inferior fija compartida */}
      <nav className="fixed bottom-6 left-6 right-6 h-16 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl flex items-center justify-around z-50 shadow-2xl overflow-hidden px-2">
        <Link 
          href="/dashboard/operator-portal"
          className={cn(
            "flex flex-col items-center justify-center gap-1 w-full h-full transition-all relative",
            pathname === '/dashboard/operator-portal' ? "text-accent" : "text-slate-400"
          )}
        >
          <Package className="h-5 w-5" />
          <span className="text-[10px] font-bold">Solicitudes</span>
          {pathname === '/dashboard/operator-portal' && (
            <div className="absolute top-0 w-8 h-1 bg-accent rounded-b-full shadow-[0_0_10px_rgba(0,255,255,0.5)]" />
          )}
        </Link>

        <Link 
          href="/dashboard/operator-portal/my-packages"
          className={cn(
            "flex flex-col items-center justify-center gap-1 w-full h-full transition-all relative",
            pathname === '/dashboard/operator-portal/my-packages' ? "text-accent" : "text-slate-400"
          )}
        >
          <ClipboardCheck className="h-5 w-5" />
          <span className="text-[10px] font-bold">Mis Paquetes</span>
          {pathname === '/dashboard/operator-portal/my-packages' && (
            <div className="absolute top-0 w-8 h-1 bg-accent rounded-b-full shadow-[0_0_10px_rgba(0,255,255,0.5)]" />
          )}
        </Link>

        <Link 
          href="/dashboard/operator-portal/my-wallet"
          className={cn(
            "flex flex-col items-center justify-center gap-1 w-full h-full transition-all relative",
            pathname === '/dashboard/operator-portal/my-wallet' ? "text-accent" : "text-slate-400"
          )}
        >
          <Wallet className="h-5 w-5" />
          <span className="text-[10px] font-bold">Billetera</span>
          {pathname === '/dashboard/operator-portal/my-wallet' && (
            <div className="absolute top-0 w-8 h-1 bg-accent rounded-b-full shadow-[0_0_10px_rgba(0,255,255,0.5)]" />
          )}
        </Link>
      </nav>
    </div>
  );
}