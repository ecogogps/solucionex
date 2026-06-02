
'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Truck, LogOut, Package, ClipboardCheck, Navigation, 
  Loader2, MapPin, Clock, ChevronRight, History, MapPinned, Camera, QrCode, XCircle, ArrowRightCircle,
  PhoneForwarded
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { OperatorPackageModal, PaqueteData } from '@/components/OperatorPackageModal';
import { TrackingModal } from '@/components/TrackingModal';
import { Cronometro } from '@/components/Cronometro';
import { QRScanner } from '@/components/QRScanner';
import { useToast } from '@/hooks/use-toast';

export default function MyPackagesPage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [allDeliveries, setAllDeliveries] = useState<any[]>([]);
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  const [updatingPackageId, setUpdatingPackageId] = useState<string | null>(null);
  
  const [selectedPackage, setSelectedPackage] = useState<PaqueteData | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  const [trackingPackage, setTrackingPackage] = useState<PaqueteData | null>(null);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

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
        (payload: any) => {
          // Detectamos si la empresa activó la solicitud de reintento
          if (
            payload.new && 
            payload.new.vuelve_a_llamar === true && 
            (!payload.old || payload.old.vuelve_a_llamar === false)
          ) {
            toast({
              title: "¡Vuelve a llamar al cliente!",
              description: `Guía: ${payload.new.guia_numero}. La empresa confirmó que reintentes el contacto.`,
              variant: "default"
            });
          }
          fetchData(userId);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, toast]);

  const fetchData = async (currentUserId: string) => {
    try {
      // 1. Obtener paquetes asignados
      const { data: assignedData, error: assignedError } = await supabase
        .from('paquetes')
        .select('*, empresas(nombre, direccion), operadores(nombres), paquetes_historial(estado, created_at)')
        .eq('operador_id', currentUserId)
        .order('created_at', { ascending: false });

      if (assignedError) throw assignedError;

      // 2. Obtener rechazos de hoy
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: rejectedData, error: rejectedError } = await supabase
        .from('operador_rechazos')
        .select('*, paquetes(*, empresas(nombre, direccion))')
        .eq('operador_id', currentUserId)
        .gte('created_at', today.toISOString());

      if (rejectedError) throw rejectedError;

      const formattedRejections = (rejectedData || []).map(r => ({
        ...r.paquetes,
        estado: 'rechazado_por_operador',
        created_at: r.created_at, // Usar fecha del rechazo para orden
        es_rechazo: true
      }));

      const combined = [...(assignedData || []), ...formattedRejections].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setAllDeliveries(combined);

      if (selectedPackage) {
        const updatedPackage = combined.find(p => p.id === selectedPackage.id);
        if (updatedPackage) setSelectedPackage(updatedPackage);
        else setIsDetailOpen(false);
      }
    } catch (error: any) {
      console.error("Error fetchData:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartRetire = async (pkgId: string) => {
    setUpdatingPackageId(pkgId);
    try {
      const { error } = await supabase
        .from('paquetes')
        .update({ estado: 'camino_a_retirar' })
        .eq('id', pkgId);

      if (error) throw error;

      toast({
        title: "Estado actualizado",
        description: "Ahora estás en camino a retirar el paquete."
      });

      if (userId) fetchData(userId);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error al actualizar",
        description: "No se pudo actualizar el estado."
      });
    } finally {
      setUpdatingPackageId(null);
    }
  };

  const updateLocation = async () => {
    if (!userId) return;
    setIsUpdatingLocation(true);

    if (!navigator.geolocation) {
      toast({
        variant: "destructive",
        title: "No soportado",
        description: "Tu navegador no soporta geolocalización."
      });
      setIsUpdatingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          const { error } = await supabase
            .from('operador_ubicaciones')
            .upsert({
              operador_id: userId,
              latitud: latitude,
              longitud: longitude,
              updated_at: new Date().toISOString()
            }, { onConflict: 'operador_id' });

          if (error) throw error;

          toast({
            title: "Ubicación Actualizada",
            description: "Tu ubicación ha sido enviada al administrador."
          });
        } catch (error) {
          toast({
            variant: "destructive",
            title: "Error de Envío",
            description: "No se pudo actualizar tu ubicación en el servidor."
          });
        } finally {
          setIsUpdatingLocation(false);
        }
      },
      (error) => {
        toast({
          variant: "destructive",
          title: "Permiso Denegado",
          description: "Habilita los permisos de ubicación en tu navegador."
        });
        setIsUpdatingLocation(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pedido_listo': return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50 text-center">PEDIDO LISTO</Badge>;
      case 'entregado': return <Badge className="bg-green-500/20 text-green-400 border-green-500/50 text-center">ENTREGADO CON EXITO</Badge>;
      case 'entregado_novedad': return <Badge className="bg-green-600/20 text-green-500 border-green-600/50 text-center">ENTREGADO CON NOVEDAD</Badge>;
      case 'llegado': return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/50 text-center">Llegó al Destino</Badge>;
      case 'en_ruta': return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50 text-center">En Tránsito</Badge>;
      case 'camino_a_retirar': return <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/50 text-center">En camino a retirar</Badge>;
      case 'llegado_a_origen': return <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/50 text-center">Llegado a origen</Badge>;
      case 'paquete_retirado': return <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50 text-center">Retirado de origen</Badge>;
      case 'demorado_despacho': return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/50 text-center">Demorado Despacho</Badge>;
      case 'demorado_operador': return <Badge className="bg-red-600/20 text-red-300 border-red-600/50 text-center">Demorado Operador</Badge>;
      case 'no_listo': return <Badge className="bg-red-500/20 text-red-400 border-red-500/50 text-center">AÚN NO LISTO</Badge>;
      case 'cancelado': return <Badge className="bg-red-500/20 text-red-400 border-red-500/50 text-center">No ejecutado</Badge>;
      case 'anulado_retornar': return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50 text-center">Anulado - Retornar</Badge>;
      case 'rechazado_por_operador': return <Badge className="bg-red-900/40 text-red-400 border-red-500/50 text-center uppercase">Rechazado</Badge>;
      default: return <Badge variant="outline" className="text-orange-400 border-orange-400/50 bg-orange-400/10 text-center">Pendiente</Badge>;
    }
  };

  const activeDeliveries = allDeliveries.filter(p => !p.es_rechazo && p.estado !== 'entregado' && p.estado !== 'entregado_novedad');
  
  const historyDeliveries = allDeliveries.filter(p => {
    const isCompleted = p.estado === 'entregado' || p.estado === 'entregado_novedad' || p.es_rechazo;
    if (!isCompleted) return false;
    
    const pkgDate = new Date(p.created_at);
    const today = new Date();
    return pkgDate.toDateString() === today.toDateString();
  });

  return (
    <div className="min-h-screen bg-background text-white flex flex-col">
      <header className="h-16 bg-slate-900 border-b border-white/10 flex items-center justify-between px-6 sticky top-0 z-40">
        <div className="flex items-center gap-2"><Truck className="h-6 w-6 text-accent shrink-0" /><span className="font-bold text-lg truncate">Solucionex</span></div>
        <div className="flex items-center gap-4 shrink-0">
          <Badge variant="outline" className="border-accent text-accent">Operador</Badge>
          <Button variant="ghost" size="icon" onClick={() => { supabase.auth.signOut(); router.push('/'); }} className="text-red-400 shrink-0"><LogOut className="h-5 w-5" /></Button>
        </div>
      </header>

      <main className="flex-1 p-4 lg:p-6 space-y-6 pb-24">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold">Mis Paquetes</h2>
          <p className="text-slate-400 text-sm">Gestiona tus entregas asignadas</p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center py-20"><Loader2 className="h-10 w-10 text-accent" /></div>
        ) : (
          <Tabs defaultValue="activos" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-white/5 border border-white/10 mb-6">
              <TabsTrigger value="activos" className="data-[state=active]:bg-accent data-[state=active]:text-primary font-bold gap-2">
                <Package className="h-4 w-4 shrink-0" /> <span className="truncate">Activos ({activeDeliveries.length})</span>
              </TabsTrigger>
              <TabsTrigger value="entregados" className="data-[state=active]:bg-accent data-[state=active]:text-primary font-bold gap-2">
                <History className="h-4 w-4 shrink-0" /> <span className="truncate">Hoy ({historyDeliveries.length})</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="activos" className="space-y-4 outline-none">
              {activeDeliveries.length === 0 ? (
                <div className="bg-white/5 rounded-xl border border-white/10 p-12 text-center flex flex-col items-center">
                  <Navigation className="h-12 w-12 text-slate-500 mb-4" />
                  <h3 className="text-lg font-semibold text-white">Sin paquetes activos</h3>
                  <p className="text-slate-400 text-sm mt-1">Busca nuevas solicitudes en el portal principal.</p>
                </div>
              ) : (
                activeDeliveries.map((pkg) => (
                  <Card 
                    key={pkg.id} 
                    className={cn("bg-white/10 border-accent/20 cursor-pointer active:scale-[0.98] transition-all", (pkg.alerta_no_contesta || pkg.estado === 'cancelado') && "border-red-500/50")}
                    onClick={() => { setSelectedPackage(pkg); setIsDetailOpen(true); }}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start sm:items-center gap-3">
                          <div className="bg-accent/20 p-2 rounded-lg shrink-0 mt-1 sm:mt-0">
                            <Package className="h-5 w-5 text-accent" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="text-xs text-slate-400 font-bold truncate">{pkg.empresas?.nombre}</span>
                              <Badge variant="outline" className="text-[9px] h-4 border-white/10 text-accent px-1 uppercase shrink-0">{pkg.tipo}</Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold truncate">Guía: {pkg.guia_numero}</span>
                            </div>
                            <div className="flex items-start gap-1 mt-1">
                              <MapPin className="h-3 w-3 shrink-0 text-slate-400 mt-0.5" /> 
                              <span className="text-[10px] text-slate-400 break-words">{pkg.direccion}</span>
                              </div>

                            {pkg.vuelve_a_llamar && (
                              <div className="mt-2 flex">
                                <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/50 text-[10px] gap-1 animate-pulse">
                                  <PhoneForwarded className="w-3 h-3" /> REINTENTAR LLAMADA
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 w-full md:w-auto">
                          <div className="w-full sm:w-auto">
                            <Cronometro 
                              paqueteId={pkg.id} 
                              estadoActual={pkg.estado} 
                              tiempoRecogida={pkg.tiempo_recogida}
                              historial={pkg.paquetes_historial || []}
                              retrasoEmpresa={pkg.retraso_empresa_segundos} 
                              retrasoOperador={pkg.retraso_operador_segundos} 
                              modo="operador"
                            />
                          </div>
                          <div className="flex items-center justify-end gap-2 w-full sm:w-auto shrink-0">
                            {/* Botón "Estoy en camino a retirar" condicional */}
                            {((pkg.estado === 'pendiente' || pkg.estado === 'pedido_listo') && 
                              !pkg.paquetes_historial?.some((h: any) => h.estado === 'camino_a_retirar')) && (
                              <Button 
                                size="sm"
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1 text-xs px-3 h-8 shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartRetire(pkg.id);
                                }}
                                disabled={updatingPackageId !== null}
                              >
                                {updatingPackageId === pkg.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <ArrowRightCircle className="h-3.5 w-3.5" />
                                )}
                                <span className="hidden xs:inline">Estoy en camino</span>
                              </Button>
                            )}

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
                            <div className="shrink-0">{getStatusBadge(pkg.estado)}</div>
                            <ChevronRight className="h-4 w-4 text-slate-500 shrink-0 hidden sm:block" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="entregados" className="space-y-4 outline-none">
              {historyDeliveries.length === 0 ? (
                <div className="bg-white/5 rounded-xl border border-white/10 p-12 text-center flex flex-col items-center">
                  <History className="h-12 w-12 text-slate-500 mb-4" />
                  <h3 className="text-lg font-semibold text-white">Historial de hoy vacío</h3>
                  <p className="text-slate-400 text-sm mt-1">Tus actividades finalizadas hoy aparecerán aquí.</p>
                </div>
              ) : (
                historyDeliveries.map((pkg) => (
                  <Card 
                    key={pkg.es_rechazo ? `rechazo-${pkg.id}` : pkg.id} 
                    className={cn("bg-white/5 border-white/5 opacity-80", pkg.es_rechazo && "border-red-500/10")}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start sm:items-center gap-3">
                          <div className={cn("p-2 rounded-lg shrink-0 mt-1 sm:mt-0", pkg.es_rechazo ? "bg-red-500/10" : "bg-white/10")}>
                            {pkg.es_rechazo ? <XCircle className="h-5 w-5 text-red-400" /> : <Package className="h-5 w-5 text-slate-400" />}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="text-xs text-slate-500 font-bold truncate">{pkg.empresas?.nombre}</span>
                              <span className="text-[10px] text-slate-500 uppercase shrink-0">Guía: {pkg.guia_numero}</span>
                            </div>
                            <div className="flex items-start gap-1">
                              <MapPin className="h-3 w-3 shrink-0 text-slate-400 mt-0.5" /> 
                              <span className="text-[10px] text-slate-400 break-words">{pkg.direccion}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 w-full md:w-auto">
                          {!pkg.es_rechazo && (
                            <div className="w-full sm:w-auto">
                              <Cronometro 
                                paqueteId={pkg.id} 
                                estadoActual={pkg.estado} 
                                tiempoRecogida={pkg.tiempo_recogida}
                                historial={pkg.paquetes_historial || []}
                                retrasoEmpresa={pkg.retraso_empresa_segundos} 
                                retrasoOperador={pkg.retraso_operador_segundos} 
                              />
                            </div>
                          )}
                          <div className="flex items-center justify-end gap-2 w-full sm:w-auto shrink-0">
                            {!pkg.es_rechazo && (
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
                            )}
                            <div className="shrink-0">{getStatusBadge(pkg.estado)}</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>

      <OperatorPackageModal 
        isOpen={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        selectedPackage={selectedPackage}
        userId={userId}
        onUpdate={() => userId && fetchData(userId)}
        getStatusBadge={getStatusBadge}
      />

      <TrackingModal 
        isOpen={isTrackingOpen}
        onClose={() => setIsTrackingOpen(false)}
        paqueteId={trackingPackage?.id || ''}
        guiaNumero={trackingPackage?.guia_numero || ''}
      />

      {/* Botones Flotantes */}
      <div className="fixed bottom-24 left-6 flex flex-col gap-3 z-50">
        <button
          onClick={updateLocation}
          disabled={isUpdatingLocation}
          className="h-14 w-14 bg-white/10 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center shadow-lg hover:bg-white/20 transition-all text-accent"
          title="Actualizar mi ubicación"
        >
          {isUpdatingLocation ? <Loader2 className="h-6 w-6 animate-spin" /> : <Navigation className="h-6 w-6" />}
        </button>
      </div>

      <button
        onClick={() => setIsQRScannerOpen(true)}
        className="fixed bottom-24 right-6 h-14 w-14 bg-accent rounded-full flex items-center justify-center shadow-lg z-50 hover:bg-accent/90 transition-all"
      >
        <QrCode className="h-6 w-6 text-primary" />
      </button>

      <QRScanner
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
        userId={userId || ''}
        onSuccess={() => userId && fetchData(userId)}
      />

      <nav className="fixed bottom-6 left-6 right-6 h-16 bg-slate-800 border border-white/20 rounded-2xl flex items-center justify-around z-50 shadow-2xl overflow-hidden px-2">
        <button onClick={() => router.push('/dashboard/operator-portal')} className={cn("flex flex-col items-center justify-center gap-1 w-full h-full transition-all relative", pathname === '/dashboard/operator-portal' ? "text-accent" : "text-slate-400")}><Package className="h-5 w-5 shrink-0" /><span className="text-[10px] font-bold">Solicitudes</span>{pathname === '/dashboard/operator-portal' && <div className="absolute top-0 w-8 h-1 bg-accent rounded-b-full shadow-[0_0_10px_rgba(0,255,255,0.5)]" />}</button>
        <button onClick={() => router.push('/dashboard/operator-portal/my-packages')} className={cn("flex flex-col items-center justify-center gap-1 w-full h-full transition-all relative", pathname === '/dashboard/operator-portal/my-packages' ? "text-accent" : "text-slate-400")}><ClipboardCheck className="h-5 w-5 shrink-0" /><span className="text-[10px] font-bold">Mis Paquetes</span>{pathname === '/dashboard/operator-portal/my-packages' && <div className="absolute top-0 w-8 h-1 bg-accent rounded-b-full shadow-[0_0_10px_rgba(0,255,255,0.5)]" />}</button>
      </nav>
    </div>
  );
}
