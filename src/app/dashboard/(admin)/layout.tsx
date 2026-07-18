'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Truck, Package, Building2, UserCheck, 
  Navigation, Wallet, Settings, LogOut,
  CircleDollarSign,
  Banknote,
  LayoutDashboard,
  BarChart3,
  Undo2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [retreatsCount, setRetreatsCount] = useState(0);

  useEffect(() => {
    fetchRetreatsCount();
    const channel = supabase
      .channel('retreats_count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'retiro_solicitudes' }, () => {
        fetchRetreatsCount();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchRetreatsCount = async () => {
    const { count } = await supabase
      .from('retiro_solicitudes')
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'pendiente');
    setRetreatsCount(count || 0);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const menuItems = [
    { href: '/dashboard', label: 'Paquetes', icon: Package },
    { href: '/dashboard/business', label: 'Empresas', icon: Building2 },
    { href: '/dashboard/operators', label: 'Operadores', icon: UserCheck },
    { href: '/dashboard/tracking', label: 'Ubicación Operador', icon: Navigation },
    { href: '/dashboard/wallets', label: 'Movimientos', icon: Wallet },
    { href: '/dashboard/settlement', label: 'Liquidación', icon: CircleDollarSign },
    { href: '/dashboard/transfers', label: 'Cobros Transf.', icon: Banknote },
    { href: '/dashboard/retreats', label: 'Retiros', icon: Undo2, badge: retreatsCount },
    { href: '/dashboard/stats-admin', label: 'Analítica', icon: BarChart3 },
    { href: '/dashboard/configuration', label: 'Configuración', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background flex text-white">
      <aside className="w-64 bg-black/20 border-r border-white/10 hidden lg:flex flex-col p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-10">
          <Truck className="h-8 w-8 text-accent" />
          <span className="text-xl font-bold tracking-tight">Solucionex</span>
        </div>
        <nav className="flex-1 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <Button 
                  variant="ghost" 
                  className={cn(
                    "w-full justify-start gap-3 transition-all relative",
                    isActive 
                      ? "bg-accent/10 text-accent font-bold" 
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Icon className={cn("h-5 w-5", isActive && "text-accent")} /> 
                  {item.label}
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                      {item.badge}
                    </span>
                  )}
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

      <div className="flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
}
