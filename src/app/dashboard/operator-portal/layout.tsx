'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Package, ClipboardCheck, Wallet, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function OperatorPortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { href: '/dashboard/operator-portal', label: 'Solicitudes', icon: Package },
    { href: '/dashboard/operator-portal/my-packages', label: 'Mis Paquetes', icon: ClipboardCheck },
    { href: '/dashboard/operator-portal/my-wallet', label: 'Billetera', icon: Wallet },
    { href: '/dashboard/operator-portal/stats', label: 'Estadísticas', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-background text-white flex flex-col">
      {/* Contenido principal de las páginas */}
      <main className="flex-1">
        {children}
      </main>

      {/* Navegación inferior fija compartida */}
      <nav className="fixed bottom-6 left-6 right-6 h-16 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl flex items-center justify-around z-50 shadow-2xl overflow-hidden px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 w-full h-full transition-all relative",
                isActive ? "text-accent" : "text-slate-400"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-bold">{item.label}</span>
              {isActive && (
                <div className="absolute top-0 w-8 h-1 bg-accent rounded-b-full shadow-[0_0_10px_rgba(0,255,255,0.5)]" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
