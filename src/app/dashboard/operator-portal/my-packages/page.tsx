'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Truck, LogOut, Package, ClipboardCheck, Navigation, 
  Loader2, MapPin, Clock, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
// Ajusta la ruta del import acorde a tu proyecto
import { OperatorPackageModal, PaqueteData } from '@/components/OperatorPackageModal';

export default function MyPackagesPage() {
  const [loading, setLoading] = useState(true);
  const[userId, setUserId] = useState<string | null>(null);
  const[myDeliveries, setMyDeliveries] = useState<PaqueteData[]>([]);
  
  // Estado para el Modal
  const[selectedPackage, setSelectedPackage] = useState<PaqueteData | null>(null);
  const[isDetailOpen, setIsDetailOpen] = useState(false);
  
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUserId(session.user.id);
        fetchData(session.user.id);
      } else {
        router.push('/');
      }
    };
    getSession();
  }, [router]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`realtime_my_packages_${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'paquetes', filter: `operador_id=eq.${userId}` }, 
        () => { fetchData(userId); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, selectedPackage?.id]);

  const fetchData = async (currentUserId: string) => {
    try {
      const { data, error } = await supabase
        .from('paquetes')
        .select('*, empresas(nombre, direccion), paquetes_historial(estado)')
        .eq('operador_id', currentUserId)
        .neq('estado', 'entregado')
        .neq('estado', 'entregado_novedad')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMyDeliveries(data || []);

      if (selectedPackage) {
        const updatedPackage = (data ||[]).find(p => p.id === selectedPackage.id);
        if (updatedPackage) setSelectedPackage(updatedPackage);
        else setIsDetailOpen(false);
      }
    } catch (error: any) {
      console.error("Error fetchData:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pedido_listo': return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50">PEDIDO LISTO</Badge>;
      case 'entregado': return <Badge className="bg-green-500/20 text-green-400 border-green-500/50">ENTREGADO CON EXITO</Badge>;
      case 'entregado_novedad': return <Badge className="bg-green-600/20 text-green-500 border-green-600/50">ENTREGADO CON NOVEDAD</Badge>;
      case 'llegado': return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/50">Paquete llego al Destino</Badge>;
      case 'en_ruta': return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">En Transito a Destino</Badge>;
      case 'camino_a_retirar': return <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/50">En camino a retirar</Badge>;
      case 'paquete_retirado': return <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50">Paquete retirado de origen</Badge>;
      case 'demorado_despacho': return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/50">Demorado Despacho</Badge>;
      case 'demorado_operador': return <Badge className="bg-red-600/20 text-red-300 border-red-600/50">Demorado Operador</Badge>;
      case 'cancelado': return <Badge className="bg-red-500/20 text-red-400 border-red-500/50">No ejecutado</Badge>;
      case 'anulado_retornar': return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50">Anulado - Retornar</Badge>;
      default: return <Badge variant="outline" className="text-orange-400 border-orange-400/50 bg-orange-400/10">Pendiente</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background text-white flex flex-col">
      <header className="h-16 bg-white/5 border-b border-white/10 flex items-center justify-between px-6 sticky top-0 z-40 backdrop-blur-md">
        <div className="flex items-center gap-2"><Truck className="h-6 w-6 text-accent" /><span className="font-bold text-lg">Solucionex</span></div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="border-accent text-accent">Operador</Badge>
          <Button variant="ghost" size="icon" onClick={() => { supabase.auth.signOut(); router.push('/'); }} className="text-red-400"><LogOut className="h-5 w-5" /></Button>
        </div>
      </header>

      <main className="flex-1 p-4 lg:p-6 space-y-6 pb-24">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold">Mis Paquetes</h2>
          <p className="text-slate-400 text-sm">Tienes {myDeliveries.length} entregas activas</p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center py-20"><Loader2 className="h-10 w-10 animate-spin text-accent" /></div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {myDeliveries.length === 0 ? (
              <div className="bg-white/5 rounded-xl border border-white/10 p-12 text-center flex flex-col items-center">
                <Navigation className="h-12 w-12 text-slate-500 mb-4" />
                <h3 className="text-lg font-semibold text-white">Sin Paquetes activos</h3>
              </div>
            ) : (
              myDeliveries.map((pkg) => (
                <Card 
                  key={pkg.id} 
                  className={cn("bg-white/10 border-accent/20 cursor-pointer active:scale-[0.98] transition-all", pkg.alerta_no_contesta && "animate-pulse-yellow border-yellow-500/50")}
                  onClick={() => { setSelectedPackage(pkg); setIsDetailOpen(true); }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-accent/20 p-2 rounded-lg">
                          <Package className="h-5 w-5 text-accent" />
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-slate-400 font-bold">{pkg.empresas?.nombre}</span>
                            <Badge variant="outline" className="text-[9px] h-4 border-white/10 text-accent px-1 uppercase">{pkg.tipo}</Badge>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold">Guía: {pkg.guia_numero}</span>
                            <span className="text-[10px] text-slate-400 font-mono bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">
                              #{pkg.id.substring(0, 6).toUpperCase()}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] text-slate-400 flex items-center gap-1"><MapPin className="h-2 w-2" /> {pkg.direccion}</span>
                            <span className="text-[10px] text-orange-400 flex items-center gap-1"><Clock className="h-2 w-2" /> {pkg.tiempo_recogida} min</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(pkg.estado)}
                        <ChevronRight className="h-4 w-4 text-slate-500" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </main>

      {/* MODAL EXTRAIDO Y SEPARADO */}
      <OperatorPackageModal 
        isOpen={isDetailOpen}
        onOpenChange={(open) => {
          setIsDetailOpen(open);
          if (!open) {
            setTimeout(() => { document.body.style.pointerEvents = 'auto'; }, 300);
          }
        }}
        selectedPackage={selectedPackage}
        userId={userId}
        onUpdate={() => userId && fetchData(userId)}
        getStatusBadge={getStatusBadge}
      />

      <nav className="fixed bottom-6 left-6 right-6 h-16 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl flex items-center justify-around z-50 shadow-2xl overflow-hidden px-2">
        <button onClick={() => router.push('/dashboard/operator-portal')} className={cn("flex flex-col items-center justify-center gap-1 w-full h-full transition-all relative", pathname === '/dashboard/operator-portal' ? "text-accent" : "text-slate-400")}><Package className="h-5 w-5" /><span className="text-[10px] font-bold">Solicitudes</span>{pathname === '/dashboard/operator-portal' && <div className="absolute top-0 w-8 h-1 bg-accent rounded-b-full shadow-[0_0_10px_rgba(0,255,255,0.5)]" />}</button>
        <button onClick={() => router.push('/dashboard/operator-portal/my-packages')} className={cn("flex flex-col items-center justify-center gap-1 w-full h-full transition-all relative", pathname === '/dashboard/operator-portal/my-packages' ? "text-accent" : "text-slate-400")}><ClipboardCheck className="h-5 w-5" /><span className="text-[10px] font-bold">Mis Paquetes</span>{pathname === '/dashboard/operator-portal/my-packages' && <div className="absolute top-0 w-8 h-1 bg-accent rounded-b-full shadow-[0_0_10px_rgba(0,255,255,0.5)]" />}</button>
      </nav>
    </div>
  );
}
