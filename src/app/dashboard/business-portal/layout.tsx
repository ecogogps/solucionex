'use client';

import { useRouter, usePathname } from 'next/navigation';
import { 
  Truck, 
  PlusCircle, 
  Package, 
  Settings,
  LogOut,
  Wallet
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

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row text-white overflow-hidden">
      {/* Menú lateral (Escritorio) */}
      <aside className="hidden lg:flex w-64 bg-black/20 border-r border-white/10 flex-col p-6 shadow-2xl shrink-0">
        <div className="flex items-center gap-3 mb-10">
          <Truck className="h-8 w-8 text-accent" />
          <span className="text-xl font-bold tracking-tight">Solucionex</span>
        </div>
        <nav className="flex-1 space-y-2">
          <Link href="/dashboard/business-portal">
            <Button 
              variant="ghost" 
              className={cn(
                "w-full justify-start gap-3 transition-all",
                pathname === '/dashboard/business-portal' ? "bg-white/10 text-white" : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
            >
              <PlusCircle className={cn("h-5 w-5", pathname === '/dashboard/business-portal' && "text-accent")} /> Nueva Solicitud
            </Button>
          </Link>
          <Link href="/dashboard/business-portal/packages">
            <Button 
              variant="ghost" 
              className={cn(
                "w-full justify-start gap-3 transition-all",
                pathname === '/dashboard/business-portal/packages' ? "bg-white/10 text-white" : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
            >
              <Package className={cn("h-5 w-5", pathname === '/dashboard/business-portal/packages' && "text-accent")} /> Mis Paquetes
            </Button>
          </Link>
          <Link href="/dashboard/business-portal/my-wallet">
            <Button 
              variant="ghost" 
              className={cn(
                "w-full justify-start gap-3 transition-all",
                pathname === '/dashboard/business-portal/my-wallet' ? "bg-white/10 text-white" : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
            >
              <Wallet className={cn("h-5 w-5", pathname === '/dashboard/business-portal/my-wallet' && "text-accent")} /> Tmax Pay
            </Button>
          </Link>
          <Link href="/dashboard/business-portal/logo">
            <Button 
              variant="ghost" 
              className={cn(
                "w-full justify-start gap-3 transition-all",
                pathname === '/dashboard/business-portal/logo' ? "bg-white/10 text-white" : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
            >
              <Settings className={cn("h-5 w-5", pathname === '/dashboard/business-portal/logo' && "text-accent")} /> Configuración
            </Button>
          </Link>
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
        <Link href="/dashboard/business-portal" className={cn("flex flex-col items-center justify-center gap-1 w-full h-full transition-all relative", pathname === '/dashboard/business-portal' ? "text-accent" : "text-slate-400")}>
          <PlusCircle className="h-5 w-5" />
          <span className="text-[10px] font-bold">Solicitud</span>
          {pathname === '/dashboard/business-portal' && <div className="absolute top-0 w-8 h-1 bg-accent rounded-b-full shadow-[0_0_10px_rgba(0,255,255,0.5)]" />}
        </Link>
        <Link href="/dashboard/business-portal/packages" className={cn("flex flex-col items-center justify-center gap-1 w-full h-full transition-all relative", pathname === '/dashboard/business-portal/packages' ? "text-accent" : "text-slate-400")}>
          <Package className="h-5 w-5" />
          <span className="text-[10px] font-bold">Paquetes</span>
          {pathname === '/dashboard/business-portal/packages' && <div className="absolute top-0 w-8 h-1 bg-accent rounded-b-full shadow-[0_0_10px_rgba(0,255,255,0.5)]" />}
        </Link>
        <Link href="/dashboard/business-portal/my-wallet" className={cn("flex flex-col items-center justify-center gap-1 w-full h-full transition-all relative", pathname === '/dashboard/business-portal/my-wallet' ? "text-accent" : "text-slate-400")}>
          <Wallet className="h-5 w-5" />
          <span className="text-[10px] font-bold">Billetera</span>
          {pathname === '/dashboard/business-portal/my-wallet' && <div className="absolute top-0 w-8 h-1 bg-accent rounded-b-full shadow-[0_0_10px_rgba(0,255,255,0.5)]" />}
        </Link>
        <Link href="/dashboard/business-portal/logo" className={cn("flex flex-col items-center justify-center gap-1 w-full h-full transition-all relative", pathname === '/dashboard/business-portal/logo' ? "text-accent" : "text-slate-400")}>
          <Settings className="h-5 w-5" />
          <span className="text-[10px] font-bold">Config</span>
          {pathname === '/dashboard/business-portal/logo' && <div className="absolute top-0 w-8 h-1 bg-accent rounded-b-full shadow-[0_0_10px_rgba(0,255,255,0.5)]" />}
        </Link>
      </nav>
    </div>
  );
}