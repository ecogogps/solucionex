'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Package, 
  Truck, 
  LogOut, 
  PlusCircle, 
  Loader2,
  MapPin,
  Clock,
  CheckCircle2,
  MapPinned,
  UserX,
  MessageSquareOff,
  RefreshCcw,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface PaqueteData {
  id: string;
  guia_numero: string;
  tipo: string;
  estado: string;
  direccion: string;
  valor_pedido: number;
  created_at: string;
  novedad?: string;
  alerta_no_contesta?: boolean;
  alerta_cambio_pago?: boolean;
  imagen_pago_url?: string;
}

export default function BusinessPackagesPage() {
  const [fetchingPackages, setFetchingPackages] = useState(true);
  const [misPaquetes, setMisPaquetes] = useState<PaqueteData[]>([]);
  const [alertCount, setAlertCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUserId(session.user.id);
        fetchMisPaquetes(session.user.id);
      } else {
        router.push('/');
      }
    };
    getSession();
  }, [router]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('paquetes_empresa_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'paquetes', filter: `empresa_id=eq.${userId}` },
        () => fetchMisPaquetes(userId)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const fetchMisPaquetes = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from('paquetes')
        .select('*')
        .eq('empresa_id', uid)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const packages = data || [];
      setMisPaquetes(packages);
      
      // Contar alertas activas
      const count = packages.filter(p => p.alerta_no_contesta || p.alerta_cambio_pago).length;
      setAlertCount(count);

    } catch (error: any) {
      console.error("Error fetching packages:", error);
    } finally {
      setFetchingPackages(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'entregado': return <Badge className="bg-green-500/20 text-green-400 border-green-500/50">Entregado</Badge>;
      case 'llegado': return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/50">Llegado</Badge>;
      case 'en_ruta': return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">En Ruta</Badge>;
      case 'cancelado': return <Badge className="bg-red-500/20 text-red-400 border-red-500/50">Cancelado</Badge>;
      case 'buscando_operador': return <Badge variant="outline" className="text-accent border-accent/50">Buscando</Badge>;
      default: return <Badge variant="outline" className="text-orange-400 border-orange-400/50">Pendiente</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row text-white overflow-hidden">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex w-64 bg-black/20 border-r border-white/10 flex-col p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-10">
          <Truck className="h-8 w-8 text-accent" />
          <span className="text-xl font-bold tracking-tight">Solucionex</span>
        </div>
        <nav className="flex-1 space-y-2">
          <Link href="/dashboard/business-portal">
            <Button variant="ghost" className="w-full justify-start gap-3 text-slate-400 hover:text-white hover:bg-white/5">
              <PlusCircle className="h-5 w-5" /> Nueva Solicitud
            </Button>
          </Link>
          <Link href="/dashboard/business-portal/packages" className="relative">
            <Button variant="ghost" className="w-full justify-start gap-3 bg-white/10 text-white">
              <Package className="h-5 w-5 text-accent" /> Mis Paquetes
            </Button>
            {alertCount > 0 && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 bg-red-500 text-white text-[10px] font-bold h-5 w-5 flex items-center justify-center rounded-full animate-bounce">
                {alertCount}
              </span>
            )}
          </Link>
        </nav>
        <Button variant="ghost" className="w-full justify-start gap-3 text-red-400" onClick={() => { supabase.auth.signOut(); router.push('/'); }}>
          <LogOut className="h-5 w-5" /> Cerrar Sesión
        </Button>
      </aside>

      <main className="flex-1 h-screen overflow-y-auto pb-24 lg:pb-8">
        <header className="lg:hidden flex items-center justify-between p-4 border-b border-white/10 bg-black/10 backdrop-blur-md sticky top-0 z-40">
          <div className="flex items-center gap-2"><Truck className="h-6 w-6 text-accent" /><span className="font-bold">Solucionex</span></div>
          <div className="text-xs font-medium text-slate-400 bg-white/5 px-3 py-1 rounded-full border border-white/10">Portal Empresa</div>
        </header>

        <div className="p-4 lg:p-8 flex justify-center">
          <div className="w-full max-w-2xl space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Mis Paquetes</h2>
              {alertCount > 0 && <Badge className="bg-red-500/20 text-red-400 border-red-500/50 animate-pulse">{alertCount} ALERTAS ACTIVAS</Badge>}
            </div>

            {fetchingPackages ? (
              <div className="flex flex-col items-center py-20"><Loader2 className="h-8 w-8 animate-spin text-accent mb-4" /><p className="text-slate-400">Cargando...</p></div>
            ) : misPaquetes.length === 0 ? (
              <div className="bg-white/5 rounded-xl border border-white/10 p-12 text-center"><Package className="h-12 w-12 text-slate-500 mx-auto mb-4" /><h3 className="text-lg font-semibold">Sin paquetes</h3></div>
            ) : (
              <div className="space-y-4">
                {misPaquetes.map((pkg) => (
                  <Card key={pkg.id} className={cn(
                    "bg-white/5 border-white/10 transition-all",
                    (pkg.alerta_no_contesta || pkg.alerta_cambio_pago) && "animate-pulse-yellow border-yellow-500/40"
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-white">Guía: {pkg.guia_numero}</p>
                          {getStatusBadge(pkg.estado)}
                        </div>
                        <p className="text-lg font-bold text-accent">${pkg.valor_pedido}</p>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs text-slate-400 flex items-center gap-1"><MapPin className="h-3 w-3" /> {pkg.direccion}</p>
                        
                        {/* Indicadores de Alerta */}
                        <div className="flex flex-wrap gap-2 pt-1">
                          {pkg.alerta_no_contesta && (
                            <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/50 text-[10px] gap-1">
                              <MessageSquareOff className="w-3 h-3" /> CLIENTE NO CONTESTA
                            </Badge>
                          )}
                          {pkg.alerta_cambio_pago && (
                            <div className="flex items-center gap-2">
                              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50 text-[10px] gap-1">
                                <RefreshCcw className="w-3 h-3" /> CAMBIO DE PAGO
                              </Badge>
                              {pkg.imagen_pago_url && (
                                <a href={pkg.imagen_pago_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-accent flex items-center gap-1 hover:underline">
                                  <ExternalLink className="w-3 h-3" /> Ver Comprobante
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {pkg.novedad && <p className="text-xs text-red-400 italic mt-2"><UserX className="inline h-3 w-3 mr-1" /> {pkg.novedad}</p>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Nav Mobile */}
      <nav className="fixed bottom-6 left-6 right-6 h-16 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl flex lg:hidden items-center justify-around z-50 shadow-2xl">
        <Link href="/dashboard/business-portal" className={cn("flex flex-col items-center justify-center gap-1 w-full h-full relative", pathname === '/dashboard/business-portal' ? "text-accent" : "text-slate-400")}>
          <PlusCircle className="h-5 w-5" /><span className="text-[10px] font-bold">Solicitud</span>
        </Link>
        <Link href="/dashboard/business-portal/packages" className={cn("flex flex-col items-center justify-center gap-1 w-full h-full relative", pathname === '/dashboard/business-portal/packages' ? "text-accent" : "text-slate-400")}>
          <Package className="h-5 w-5" /><span className="text-[10px] font-bold">Paquetes</span>
          {alertCount > 0 && <span className="absolute top-2 right-4 bg-red-500 text-white text-[8px] h-4 w-4 flex items-center justify-center rounded-full animate-bounce">{alertCount}</span>}
          {pathname === '/dashboard/business-portal/packages' && <div className="absolute top-0 w-8 h-1 bg-accent rounded-b-full shadow-[0_0_10px_rgba(0,255,255,0.5)]" />}
        </Link>
        <button onClick={() => { supabase.auth.signOut(); router.push('/'); }} className="flex flex-col items-center justify-center gap-1 w-full h-full text-red-400">
          <LogOut className="h-5 w-5" /><span className="text-[10px] font-bold">Salir</span>
        </button>
      </nav>
    </div>
  );
}