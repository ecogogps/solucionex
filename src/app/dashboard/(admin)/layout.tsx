'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Truck, Package, Building2, UserCheck, 
  Navigation, Wallet, Settings, LogOut,
  CircleDollarSign, Landmark
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pendingRetreats, setPendingRetreats] = useState(0);

  useEffect(() => {
    fetchPendingCount();

    const channel = supabase
      .channel('retreats_count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'retiro_solicitudes' }, () => {
        fetchPendingCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPendingCount = async () => {
    const { count } = await supabase
      .from('retiro_solicitudes')
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'pendiente');
    
    setPendingRetreats(count || 0);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const navItems = [
    { href: '/dashboard', label: 'Paquetes', icon: Package },
    { href: '/dashboard/business', label: 'Empresas', icon: Building2 },
    { href: '/dashboard/operators', label: 'Operadores', icon: UserCheck },
    { href: '/dashboard/tracking', label: 'Ubicación Operador', icon: Navigation },
    { href: '/dashboard/wallets', label: 'Movimientos', icon: Wallet },
    { href: '/dashboard/settlement', label: 'Liquidación', icon: CircleDollarSign },
    { href: '/dashboard/retreats', label: 'Retiros', icon: Landmark, badge: pendingRetreats },
    { href: '/dashboard/configuration', label: 'Configuración', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background flex text-white">
      <aside className="w-64 bg-black/20 border-r border-white/10 hidden lg:flex flex-col p-6 shadow-2xl shrink-0">
        <div className="flex items-center gap-3 mb-10">
          <Truck className="h-8 w-8 text-accent" />
          <span className="text-xl font-bold tracking-tight">Solucionex</span>
        </div>
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <Button 
                  variant="ghost" 
                  className={cn(
                    "w-full justify-between gap-3 transition-colors",
                    isActive ? "bg-white/10 text-white" : "text-slate-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={cn("h-5 w-5", isActive && "text-accent")} />
                    {item.label}
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <Badge className="bg-red-600 text-white border-none h-5 px-1.5 min-w-[20px] flex items-center justify-center animate-pulse">
                      {item.badge}
                    </Badge>
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

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {children}
      </div>
    </div>
  );
}
