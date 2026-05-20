'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Package, Truck, LogOut, PlusCircle, Loader2, MapPin, Edit2, 
  MessageSquareOff, RefreshCcw, ExternalLink, UserX, MapPinned
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

// Componentes modales
import { ManagePackageModal } from '@/components/ManagePackageModal';
import { TrackingModal } from '@/components/TrackingModal';
import { Cronometro } from '@/components/Cronometro';

export default function BusinessPackagesPage() {
  const [fetchingPackages, setFetchingPackages] = useState(true);
  const [misPaquetes, setMisPaquetes] = useState<any[]>([]);
  const [alertCount, setAlertCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  
  const [selectedPackage, setSelectedPackage] = useState<any | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const [trackingPackage, setTrackingPackage] = useState<any | null>(null);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);

  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'paquetes', filter: `empresa_id=eq.${userId}` }, () => fetchMisPaquetes(userId))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const fetchMisPaquetes = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from('paquetes')
        .select('*, empresas (nombre, direccion, ruc), operadores (nombres), paquetes_historial (estado, created_at)')
        .eq('empresa_id', uid)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const packages = data ||[];
      setMisPaquetes(packages);
      setAlertCount(packages.filter(p => p.alerta_no_contesta || p.alerta_cambio_pago).length);

      if (selectedPackage) {
        const updated = packages.find(p => p.id === selectedPackage.id);
        if (updated) setSelectedPackage(updated);
      }
    } catch (error: any) {
      console.error("Error fetching packages:", error);
    } finally {
      setFetchingPackages(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pedido_listo': return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50">PEDIDO LISTO</Badge>;
      case 'entregado': return <Badge className="bg-green-500/20 text-green-400 border-green-500/50">ENTREGADO CON EXITO</Badge>;
      case 'entregado_novedad': return <Badge className="bg-green-600/20 text-green-500 border-green-600/50">ENTREGADO CON NOVEDAD</Badge>;
      case 'llegado': return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/50">Llegó al Destino</Badge>;
      case 'en_ruta': return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">En Tránsito</Badge>;
      case 'camino_a_retirar': return <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/50">En camino a retirar</Badge>;
      case 'llegado_a_origen': return <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/50">Llegado a origen</Badge>;
      case 'paquete_retirado': return <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50">Retirado de origen</Badge>;
      case 'demorado_despacho': return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/50">Demorado Despacho</Badge>;
      case 'demorado_operador': return <Badge className="bg-red-600/20 text-red-300 border-red-600/50">Demorado Operador</Badge>;
      case 'no_listo': return <Badge className="bg-red-500/20 text-red-400 border-red-500/50">No listo</Badge>;
      case 'cancelado': return <Badge className="bg-red-500/20 text-red-400 border-red-500/50">No ejecutado</Badge>;
      case 'anulado_retornar': return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50">Anulado - Retornar</Badge>;
      case 'buscando_operador': return <Badge variant="outline" className="text-accent border-accent/50">Buscando Operador</Badge>;
      default: return <Badge variant="outline" className="text-orange-400 border-orange-400/50">Pendiente</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row text-white overflow-hidden print:bg-white print:text-black">
      <aside className="hidden lg:flex w-64 bg-black/20 border-r border-white/10 flex-col p-6 shadow-2xl print:hidden">
        <div className="flex items-center gap-3 mb-10"><Truck className="h-8 w-8 text-accent" /><span className="text-xl font-bold tracking-tight">Solucionex</span></div>
        <nav className="flex-1 space-y-2">
          <Link href="/dashboard/business-portal"><Button variant="ghost" className="w-full justify-start gap-3 text-slate-400 hover:text-white hover:bg-white/5"><PlusCircle className="h-5 w-5" /> Nueva Solicitud</Button></Link>
          <Link href="/dashboard/business-portal/packages" className="relative">
            <Button variant="ghost" className="w-full justify-start gap-3 bg-white/10 text-white"><Package className="h-5 w-5 text-accent" /> Mis Paquetes</Button>
            {alertCount > 0 && <span className="absolute right-4 top-1/2 -translate-y-1/2 bg-red-500 text-white text-[10px] font-bold h-5 w-5 flex items-center justify-center rounded-full animate-bounce">{alertCount}</span>}
          </Link>
        </nav>
        <Button variant="ghost" className="w-full justify-start gap-3 text-red-400" onClick={() => { supabase.auth.signOut(); router.push('/'); }}><LogOut className="h-5 w-5" /> Cerrar Sesión</Button>
      </aside>

      <main className="flex-1 h-screen overflow-y-auto pb-24 lg:pb-8 print:hidden">
        <header className="lg:hidden flex items-center justify-between p-4 border-b border-white/10 bg-slate-900 sticky top-0 z-40">
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
                  <Card 
                    key={pkg.id} 
                    className={cn("bg-white/5 border-white/10 transition-all cursor-pointer group", (pkg.alerta_no_contesta || pkg.alerta_cambio_pago) && "animate-pulse-yellow border-yellow-500/40")}
                    onClick={() => { setSelectedPackage(pkg); setIsEditModalOpen(true); }}
                  >
                    <CardContent className="p-4">
                      {/* Contenedor principal: Columna en móvil, Fila en pantallas grandes */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
                        
                        {/* Izquierda: Info de la guía y Estado */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <div className="flex flex-col min-w-0">
                            <p className="font-bold text-white truncate">Guía: {pkg.guia_numero}</p>
                            <p className="text-xs text-slate-400 flex items-start gap-1 mt-1">
                              <MapPin className="h-3 w-3 mt-0.5 shrink-0" /> 
                              <span className="break-words">{pkg.direccion}</span>
                            </p>
                          </div>
                          <div className="shrink-0 mt-1 sm:mt-0">
                            {getStatusBadge(pkg.estado)}
                          </div>
                        </div>

                        {/* Derecha: Cronómetro y Botones de acción */}
                        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 w-full md:w-auto">
                          <div className="w-full sm:w-auto">
                            <Cronometro 
                              paqueteId={pkg.id} 
                              estadoActual={pkg.estado}
                              tiempoRecogida={pkg.tiempo_recogida} 
                              historial={pkg.paquetes_historial ||[]}
                              retrasoEmpresa={pkg.retraso_empresa_segundos} 
                              retrasoOperador={pkg.retraso_operador_segundos} 
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-accent hover:bg-accent/10 shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                setTrackingPackage(pkg);
                                setIsTrackingOpen(true);
                              }}
                            >
                              <MapPinned className="h-4 w-4" />
                            </Button>
                            <div className="flex items-center gap-2 ml-1 shrink-0">
                              <p className="text-lg font-bold text-accent">${pkg.valor_pedido}</p>
                              <Edit2 className="h-4 w-4 text-slate-500" />
                            </div>
                          </div>
                        </div>
                        
                      </div>

                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2 pt-1">
                          {pkg.alerta_no_contesta && <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/50 text-[10px] gap-1"><MessageSquareOff className="w-3 h-3" /> CLIENTE NO CONTESTA</Badge>}
                          {pkg.alerta_cambio_pago && (
                            <div className="flex items-center gap-2">
                              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50 text-[10px] gap-1"><RefreshCcw className="w-3 h-3" /> CAMBIO DE PAGO</Badge>
                              {pkg.imagen_pago_url && <a href={pkg.imagen_pago_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-accent flex items-center gap-1 hover:underline" onClick={(e) => e.stopPropagation()}><ExternalLink className="w-3 h-3" /> Ver Comprobante</a>}
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

      <ManagePackageModal 
        pkg={selectedPackage} 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        onSuccess={() => { if (userId) fetchMisPaquetes(userId); }}
      />

      <TrackingModal 
        isOpen={isTrackingOpen}
        onClose={() => setIsTrackingOpen(false)}
        paqueteId={trackingPackage?.id || ''}
        guiaNumero={trackingPackage?.guia_numero || ''}
      />

      <nav className="fixed bottom-6 left-6 right-6 h-16 bg-slate-800 border border-white/20 rounded-2xl flex lg:hidden items-center justify-around z-50 shadow-2xl overflow-hidden px-2">
        <Link href="/dashboard/business-portal" className={cn("flex flex-col items-center justify-center gap-1 w-full h-full relative", pathname === '/dashboard/business-portal' ? "text-accent" : "text-slate-400")}><PlusCircle className="h-5 w-5" /><span className="text-[10px] font-bold">Solicitud</span></Link>
        <Link href="/dashboard/business-portal/packages" className={cn("flex flex-col items-center justify-center gap-1 w-full h-full relative", pathname === '/dashboard/business-portal/packages' ? "text-accent" : "text-slate-400")}><Package className="h-5 w-5" /><span className="text-[10px] font-bold">Paquetes</span>{alertCount > 0 && <span className="absolute top-2 right-4 bg-red-500 text-white text-[8px] h-4 w-4 flex items-center justify-center rounded-full animate-bounce">{alertCount}</span>}{pathname === '/dashboard/business-portal/packages' && <div className="absolute top-0 w-8 h-1 bg-accent rounded-b-full shadow-[0_0_10px_rgba(0,255,255,0.5)]" />}</Link>
        <button onClick={() => { supabase.auth.signOut(); router.push('/'); }} className="flex flex-col items-center justify-center gap-1 w-full h-full text-red-400"><LogOut className="h-5 w-5" /> Cerrar Sesión</button>
      </nav>
    </div>
  );
}
