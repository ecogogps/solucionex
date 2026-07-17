'use client';

import { useRouter, usePathname } from 'next/navigation';
import { 
  Truck, 
  PlusCircle, 
  Package, 
  Settings,
  LogOut,
  Wallet,
  BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function BusinessPortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const navItems = [
    { href: '/dashboard/business-portal', label: 'Nueva Solicitud', icon: PlusCircle },
    { href: '/dashboard/business-portal/packages', label: 'Mis Paquetes', icon: Package },
    { href: '/dashboard/business-portal/stats-business', label: 'Estadísticas', icon: BarChart3 },
    { href: '/dashboard/business-portal/my-wallet', label: 'Tmax Pay', icon: Wallet },
    { href: '/dashboard/business-portal/logo', label: 'Config', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row text-white overflow-hidden">
      {/* Menú lateral (Escritorio) */}
      <aside className="hidden lg:flex w-64 bg-black/20 border-r border-white/10 flex-col p-6 shadow-2xl shrink-0">
        <div className="flex items-center gap-3 mb-10">
          <Truck className="h-8 w-8 text-accent" />
          <span className="text-xl font-bold tracking-tight">Solucionex</span>
        </div>
        <nav className="flex-1 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <Button 
                  variant="ghost" 
                  className={cn(
                    "w-full justify-start gap-3 transition-all",
                    isActive ? "bg-white/10 text-white" : "text-slate-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Icon className={cn("h-5 w-5", isActive && "text-accent")} /> {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>
        <div className="pt-6 border-t border-white/10">
          <Button variant="ghost" className="w-full justify-start gap-3 text-red-400 hover:text-red-300 hover:bg-red-400/10" onClick={handleLogout}>
            <LogOut className="h-5 w-5" /> Cerrar Sesión
          </Button>
        </div>
      </aside>

      {/* Contenedor del contenido */}
      <main className="flex-1 h-screen overflow-y-auto pb-24 lg:pb-8">
        {/* Header móvil */}
        <header className="lg:hidden flex items-center justify-between p-4 border-b border-white/10 bg-black/10 backdrop-blur-md sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <Truck className="h-6 w-6 text-accent" />
            <span className="font-bold">Solucionex</span>
          </div>
          <div className="text-xs font-medium text-slate-400 bg-white/5 px-3 py-1 rounded-full border border-white/10">
            Portal Empresa
          </div>
        </header>

        {children}
      </main>

      {/* Navegación inferior fija (Móvil) */}
      <nav className="fixed bottom-6 left-6 right-6 h-16 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl flex lg:hidden items-center justify-around z-50 shadow-2xl overflow-hidden px-2">
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
              <span className="text-[10px] font-bold">{item.label === 'Nueva Solicitud' ? 'Solicitud' : item.label === 'Estadísticas' ? 'Stats' : item.label === 'Tmax Pay' ? 'Billetera' : item.label}</span>
              {isActive && <div className="absolute top-0 w-8 h-1 bg-accent rounded-b-full shadow-[0_0_10px_rgba(0,255,255,0.5)]" />}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
