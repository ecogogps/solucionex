'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Truck, 
  LogOut, 
  Package, 
  ClipboardCheck, 
  Navigation, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  MapPin, 
  Phone, 
  Clock, 
  DollarSign,
  Info,
  ChevronRight,
  FileText,
  CreditCard,
  Image as ImageIcon,
  MapPinned,
  Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import Image from 'next/image';

interface PaqueteData {
  id: string;
  guia_numero: string;
  tipo: string;
  estado: string;
  direccion: string;
  telefono: string;
  valor_pedido: number;
  metodo_pago: string;
  tiempo_recogida: number;
  empresa_id: string;
  operador_id: string | null;
  nota?: string;
  imagen_url?: string;
  created_at: string;
  empresas?: {
    nombre: string;
    direccion: string;
  };
}

export default function OperatorPortal() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [availablePackages, setAvailablePackages] = useState<PaqueteData[]>([]);
  const [myDeliveries, setMyDeliveries] = useState<PaqueteData[]>([]);
  const [activeTab, setActiveTab] = useState<'disponibles' | 'mis_entregas'>('disponibles');
  const [rejectedIds, setRejectedIds] = useState<string[]>([]);
  
  // Detail Dialog State
  const [selectedPackage, setSelectedPackage] = useState<PaqueteData | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  
  const router = useRouter();
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

  // Realtime subscription
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('paquetes_realtime_op')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'paquetes' 
      }, () => {
        fetchData(userId);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchData = async (currentUserId: string) => {
    try {
      const { data, error } = await supabase
        .from('paquetes')
        .select('*, empresas(nombre, direccion)')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching data:", {
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        return;
      }

      // Disponibles: estado 'buscando_operador' y sin operador asignado
      const available = data.filter(p => p.estado === 'buscando_operador' && !p.operador_id);
      
      // Mis Entregas: asignados a mí y no entregados aún
      const mine = data.filter(p => p.operador_id === currentUserId && p.estado !== 'entregado');
      
      setAvailablePackages(available);
      setMyDeliveries(mine);

      // Update selected package if it's open to refresh data
      if (selectedPackage) {
        const updated = data.find(p => p.id === selectedPackage.id);
        if (updated) setSelectedPackage(updated);
      }
    } catch (error: any) {
      console.error("Unexpected error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (pkg: PaqueteData) => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('paquetes')
        .update({ 
          operador_id: userId, 
          estado: 'pendiente' 
        })
        .eq('id', pkg.id)
        .eq('estado', 'buscando_operador');

      if (error) throw error;

      toast({
        title: "¡Pedido Aceptado!",
        description: `El paquete ${pkg.guia_numero} ha sido añadido a tus rutas.`,
      });
      
      setActiveTab('mis_entregas');
      fetchData(userId);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error al aceptar",
        description: "Es posible que otro operador haya aceptado el pedido.",
      });
    }
  };

  const handleUpdateStatus = async (pkgId: string, newStatus: string) => {
    setUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from('paquetes')
        .update({ estado: newStatus })
        .eq('id', pkgId);

      if (error) throw error;

      const statusLabels: Record<string, string> = {
        'en_ruta': 'En Ruta',
        'llegado': 'Llegado al destino',
        'entregado': 'Entregado'
      };

      toast({
        title: "Estado actualizado",
        description: `Pedido marcado como ${statusLabels[newStatus] || newStatus.replace('_', ' ')}.`,
      });
      
      if (newStatus === 'entregado') {
        setIsDetailOpen(false);
      }
      
      if (userId) fetchData(userId);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar el estado.",
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleRejectLocal = (id: string) => {
    setRejectedIds(prev => [...prev, id]);
    toast({
      description: "Pedido ignorado de tu lista.",
    });
  };

  const openDetails = (pkg: PaqueteData) => {
    setSelectedPackage(pkg);
    setIsDetailOpen(true);
  };

  const visiblePackages = availablePackages.filter(p => !rejectedIds.includes(p.id));

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'entregado': return <Badge className="bg-green-500/20 text-green-400 border-green-500/50"><CheckCircle2 className="w-3 h-3 mr-1"/> Entregado</Badge>;
      case 'en_ruta': return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50"><Truck className="w-3 h-3 mr-1"/> En Ruta</Badge>;
      case 'llegado': return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/50"><MapPinned className="w-3 h-3 mr-1"/> He llegado</Badge>;
      case 'buscando_operador': return <Badge variant="outline" className="text-accent border-accent/50 bg-accent/10"><Loader2 className="w-3 h-3 mr-1 animate-spin"/> Buscando</Badge>;
      default: return <Badge variant="outline" className="text-orange-400 border-orange-400/50 bg-orange-400/10"><Clock className="w-3 h-3 mr-1"/> Pendiente</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background text-white flex flex-col">
      <header className="h-16 bg-white/5 border-b border-white/10 flex items-center justify-between px-6 sticky top-0 z-40 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Truck className="h-6 w-6 text-accent" />
          <span className="font-bold text-lg">Solucionex</span>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="border-accent text-accent">Operador</Badge>
          <Button variant="ghost" size="icon" onClick={() => {
            supabase.auth.signOut();
            router.push('/');
          }} className="text-red-400">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="flex-1 p-4 lg:p-6 space-y-6 pb-24">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold">
            {activeTab === 'disponibles' ? 'Solicitudes' : 'Mis Paquetes'}
          </h2>
          <p className="text-slate-400 text-sm">
            {activeTab === 'disponibles' 
              ? `${visiblePackages.length} pedidos esperando ser tomados` 
              : `Tienes ${myDeliveries.length} entregas activas`}
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-accent mb-4" />
            <p className="text-slate-400 text-sm">Sincronizando solicitudes...</p>
          </div>
        ) : activeTab === 'disponibles' ? (
          <div className="grid grid-cols-1 gap-4">
            {visiblePackages.length === 0 ? (
              <div className="bg-white/5 rounded-xl border border-white/10 p-12 text-center flex flex-col items-center">
                <Package className="h-12 w-12 text-slate-500 mb-4" />
                <h3 className="text-lg font-semibold text-white">No hay pedidos nuevos</h3>
                <p className="text-slate-400 text-sm mt-2">Mantente atento, los pedidos aparecen aquí en tiempo real.</p>
              </div>
            ) : (
              visiblePackages.map((pkg) => (
                <Card key={pkg.id} className="bg-white/5 border-white/10 hover:border-accent/30 transition-all">
                  <CardHeader className="py-3 border-b border-white/5 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-accent/10 text-accent border-accent/20 uppercase text-[10px]">
                        {pkg.tipo}
                      </Badge>
                      <span className="text-xs font-mono text-slate-400">#{pkg.guia_numero}</span>
                    </div>
                    <span className="text-accent font-bold text-lg">${pkg.valor_pedido}</span>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <Building2 className="h-4 w-4 text-accent mt-1 shrink-0" />
                        <div className="flex flex-col">
                           <span className="text-sm font-bold text-white">{pkg.empresas?.nombre || 'Empresa Aliada'}</span>
                           <span className="text-[10px] text-slate-400 italic">Recogida: {pkg.empresas?.direccion || 'Ver en mapa'}</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <MapPin className="h-4 w-4 text-accent mt-1 shrink-0" />
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase font-bold">Destino de Entrega</p>
                          <span className="text-sm font-medium line-clamp-2">{pkg.direccion}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button 
                        variant="ghost" 
                        className="flex-1 text-red-400 hover:bg-red-400/10 hover:text-red-400"
                        onClick={() => handleRejectLocal(pkg.id)}
                      >
                        <XCircle className="w-4 h-4 mr-2" /> Rechazar
                      </Button>
                      <Button 
                        className="flex-1 bg-accent text-primary font-bold hover:bg-accent/90"
                        onClick={() => handleAccept(pkg)}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" /> Aceptar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {myDeliveries.length === 0 ? (
              <div className="bg-white/5 rounded-xl border border-white/10 p-12 text-center flex flex-col items-center">
                <Navigation className="h-12 w-12 text-slate-500 mb-4" />
                <h3 className="text-lg font-semibold text-white">Sin rutas activas</h3>
                <p className="text-slate-400 text-sm mt-2">Acepta un pedido de la pestaña Solicitudes.</p>
              </div>
            ) : (
              myDeliveries.map((pkg) => (
                <Card 
                  key={pkg.id} 
                  className="bg-white/10 border-accent/20 cursor-pointer active:scale-[0.98] transition-all"
                  onClick={() => openDetails(pkg)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-accent/20 p-2 rounded-lg">
                          <Package className="h-5 w-5 text-accent" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs text-slate-400">{pkg.empresas?.nombre}</span>
                          <span className="text-sm font-bold">Guía: {pkg.guia_numero}</span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <MapPin className="h-2 w-2" /> {pkg.direccion}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="hidden sm:block">
                           {getStatusBadge(pkg.estado)}
                        </div>
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

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-white sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-accent" /> Detalles del Paquete
            </DialogTitle>
          </DialogHeader>
          
          {selectedPackage && (
            <div className="space-y-6 py-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold">Guía: {selectedPackage.guia_numero}</h3>
                  <p className="text-xs text-slate-400">{new Date(selectedPackage.created_at).toLocaleString()}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                   {getStatusBadge(selectedPackage.estado)}
                </div>
              </div>

              <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-3">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-accent shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Empresa Solicitante</p>
                    <p className="text-sm font-bold">{selectedPackage.empresas?.nombre || 'Empresa Aliada'}</p>
                    <p className="text-[10px] text-slate-400 italic">{selectedPackage.empresas?.direccion}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                  <span className="text-[10px] text-slate-500 uppercase font-bold flex items-center gap-1">
                    <DollarSign className="w-3 h-3" /> Valor
                  </span>
                  <p className="text-lg font-bold text-accent">${selectedPackage.valor_pedido}</p>
                </div>
                <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                  <span className="text-[10px] text-slate-500 uppercase font-bold flex items-center gap-1">
                    <CreditCard className="w-3 h-3" /> Pago
                  </span>
                  <p className="text-sm font-medium capitalize">{selectedPackage.metodo_pago}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-accent shrink-0 mt-1" />
                  <div>
                    <p className="text-xs text-slate-500 font-bold uppercase">Dirección de Entrega</p>
                    <p className="text-sm">{selectedPackage.direccion}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-accent shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500 font-bold uppercase">Teléfono Cliente</p>
                    <a href={`tel:${selectedPackage.telefono}`} className="text-sm font-bold text-accent underline">
                      {selectedPackage.telefono}
                    </a>
                  </div>
                </div>

                {selectedPackage.nota && (
                  <div className="flex items-start gap-3">
                    <FileText className="h-4 w-4 text-accent shrink-0 mt-1" />
                    <div>
                      <p className="text-xs text-slate-500 font-bold uppercase">Nota / Instrucciones</p>
                      <p className="text-sm italic text-slate-300">{selectedPackage.nota}</p>
                    </div>
                  </div>
                )}

                {selectedPackage.imagen_url && (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500 font-bold uppercase flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" /> Imagen de Guía
                    </p>
                    <div className="relative aspect-video rounded-lg overflow-hidden border border-white/10 bg-black">
                      <Image 
                        src={selectedPackage.imagen_url} 
                        alt="Imagen Guía" 
                        fill 
                        className="object-contain"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col gap-2 sm:flex-col">
            {selectedPackage?.estado === 'pendiente' && (
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12"
                onClick={() => handleUpdateStatus(selectedPackage.id, 'en_ruta')}
                disabled={updatingStatus}
              >
                {updatingStatus ? <Loader2 className="animate-spin mr-2" /> : <Navigation className="mr-2 h-5 w-5" />}
                Tomar y Salir a Ruta
              </Button>
            )}

            {selectedPackage?.estado === 'en_ruta' && (
              <Button 
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold h-12"
                onClick={() => handleUpdateStatus(selectedPackage.id, 'llegado')}
                disabled={updatingStatus}
              >
                {updatingStatus ? <Loader2 className="animate-spin mr-2" /> : <MapPinned className="mr-2 h-5 w-5" />}
                He llegado
              </Button>
            )}

            {(selectedPackage?.estado === 'llegado' || selectedPackage?.estado === 'en_ruta') && (
              <Button 
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-12"
                onClick={() => selectedPackage && handleUpdateStatus(selectedPackage.id, 'entregado')}
                disabled={updatingStatus}
              >
                {updatingStatus ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
                Marcar como Entregado
              </Button>
            )}

            <Button variant="ghost" onClick={() => setIsDetailOpen(false)} className="w-full text-slate-400">
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <nav className="fixed bottom-6 left-6 right-6 h-16 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl flex items-center justify-around z-50 shadow-2xl overflow-hidden px-2">
        <button 
          onClick={() => setActiveTab('disponibles')}
          className={cn(
            "flex flex-col items-center justify-center gap-1 w-full h-full transition-all relative",
            activeTab === 'disponibles' ? "text-accent" : "text-slate-400"
          )}
        >
          <Package className="h-5 w-5" />
          <span className="text-[10px] font-bold">Solicitudes</span>
          {activeTab === 'disponibles' && <div className="absolute top-0 w-8 h-1 bg-accent rounded-b-full" />}
          {availablePackages.length > 0 && activeTab !== 'disponibles' && (
            <span className="absolute top-3 right-[30%] w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
          )}
        </button>

        <button 
          onClick={() => setActiveTab('mis_entregas')}
          className={cn(
            "flex flex-col items-center justify-center gap-1 w-full h-full transition-all relative",
            activeTab === 'mis_entregas' ? "text-accent" : "text-slate-400"
          )}
        >
          <ClipboardCheck className="h-5 w-5" />
          <span className="text-[10px] font-bold">Mis Paquetes</span>
          {activeTab === 'mis_entregas' && <div className="absolute top-0 w-8 h-1 bg-accent rounded-b-full" />}
          {myDeliveries.length > 0 && (
            <Badge className="absolute top-2 right-[25%] h-4 w-4 p-0 flex items-center justify-center bg-accent text-primary text-[8px] font-bold">
              {myDeliveries.length}
            </Badge>
          )}
        </button>
      </nav>
    </div>
  );
}
