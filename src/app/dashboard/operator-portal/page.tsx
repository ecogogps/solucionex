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
  DollarSign 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

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
  created_at: string;
}

export default function OperatorPortal() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [availablePackages, setAvailablePackages] = useState<PaqueteData[]>([]);
  const [myDeliveries, setMyDeliveries] = useState<PaqueteData[]>([]);
  const [activeTab, setActiveTab] = useState<'disponibles' | 'mis_entregas'>('disponibles');
  const [rejectedIds, setRejectedIds] = useState<string[]>([]);
  
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
      .channel('paquetes_realtime')
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
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const available = data.filter(p => p.estado === 'buscando_operador');
      const mine = data.filter(p => p.operador_id === currentUserId && p.estado !== 'entregado');
      
      setAvailablePackages(available);
      setMyDeliveries(mine);
    } catch (error: any) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (pkg: PaqueteData) => {
    if (!userId) return;

    try {
      // Intento de actualización con condición de estado para asegurar "primero en llegar"
      const { error } = await supabase
        .from('paquetes')
        .update({ 
          operador_id: userId, 
          estado: 'en_ruta' 
        })
        .eq('id', pkg.id)
        .eq('estado', 'buscando_operador'); // Solo si sigue buscando

      if (error) throw error;

      toast({
        title: "¡Pedido Aceptado!",
        description: `El paquete ${pkg.guia_numero} ahora está bajo tu responsabilidad.`,
      });
      
      setActiveTab('mis_entregas');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "No disponible",
        description: "Lo sentimos, otro operador acaba de aceptar este pedido.",
      });
    }
  };

  const handleUpdateStatus = async (pkgId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('paquetes')
        .update({ estado: newStatus })
        .eq('id', pkgId);

      if (error) throw error;

      toast({
        title: "Estado actualizado",
        description: `El pedido ha sido marcado como ${newStatus.replace('_', ' ')}.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar el estado.",
      });
    }
  };

  const handleRejectLocal = (id: string) => {
    setRejectedIds(prev => [...prev, id]);
  };

  const visiblePackages = availablePackages.filter(p => !rejectedIds.includes(p.id));

  return (
    <div className="min-h-screen bg-background text-white flex flex-col">
      <header className="h-16 bg-white/5 border-b border-white/10 flex items-center justify-between px-6 sticky top-0 z-40 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Truck className="h-6 w-6 text-accent" />
          <span className="font-bold text-lg">Solucionex</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs bg-accent/20 text-accent px-3 py-1 rounded-full border border-accent/30 font-medium">
            Operador Activo
          </span>
          <Button variant="ghost" size="icon" onClick={() => {
            supabase.auth.signOut();
            router.push('/');
          }} className="text-red-400">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="flex-1 p-4 lg:p-6 space-y-6 pb-24">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-bold">
              {activeTab === 'disponibles' ? 'Pedidos Cercanos' : 'Mis Entregas'}
            </h2>
            <p className="text-slate-400 text-sm">
              {activeTab === 'disponibles' 
                ? `${visiblePackages.length} solicitudes esperando operador` 
                : `Tienes ${myDeliveries.length} entregas en curso`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-accent mb-4" />
            <p className="text-slate-400">Sincronizando con el servidor...</p>
          </div>
        ) : activeTab === 'disponibles' ? (
          <div className="grid grid-cols-1 gap-4">
            {visiblePackages.length === 0 ? (
              <div className="bg-white/5 rounded-xl border border-white/10 p-12 text-center flex flex-col items-center">
                <div className="relative mb-4">
                  <div className="absolute inset-0 bg-accent/20 animate-ping rounded-full" />
                  <Package className="h-12 w-12 text-slate-500 relative" />
                </div>
                <h3 className="text-lg font-semibold text-white">Buscando solicitudes...</h3>
                <p className="text-slate-400 text-sm max-w-xs mt-2">
                  No hay pedidos nuevos en este momento. Mantente alerta, aparecerán aquí automáticamente.
                </p>
              </div>
            ) : (
              visiblePackages.map((pkg) => (
                <Card key={pkg.id} className="bg-white/5 border-white/10 overflow-hidden group hover:border-accent/30 transition-all">
                  <CardHeader className="bg-white/5 border-b border-white/5 flex flex-row items-center justify-between py-3">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-accent/10 text-accent border-accent/20">
                        {pkg.tipo.toUpperCase()}
                      </Badge>
                      <span className="text-xs font-mono text-slate-400">#{pkg.guia_numero}</span>
                    </div>
                    <div className="flex items-center text-accent font-bold">
                      <DollarSign className="w-4 h-4" />
                      <span>{pkg.valor_pedido}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <MapPin className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                        <div className="flex flex-col">
                          <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Destino</span>
                          <span className="text-sm font-medium">{pkg.direccion}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-slate-400" />
                        <span className="text-sm text-slate-300">Recoger en {pkg.tiempo_recogida} min</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <Button 
                        variant="outline" 
                        className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                        onClick={() => handleRejectLocal(pkg.id)}
                      >
                        <XCircle className="w-4 h-4 mr-2" /> Ignorar
                      </Button>
                      <Button 
                        className="bg-accent text-primary hover:bg-accent/90 font-bold"
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
                <h3 className="text-lg font-semibold text-white">No tienes rutas activas</h3>
                <p className="text-slate-400 text-sm mt-2">
                  Ve a la pestaña de disponibles para aceptar tu primer pedido.
                </p>
                <Button 
                  variant="outline" 
                  className="mt-6 border-accent text-accent hover:bg-accent/10"
                  onClick={() => setActiveTab('disponibles')}
                >
                  Ver Pedidos
                </Button>
              </div>
            ) : (
              myDeliveries.map((pkg) => (
                <Card key={pkg.id} className="bg-white/10 border-accent/20 shadow-[0_0_20px_rgba(0,255,255,0.05)]">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-accent">ENTREGA ACTIVA</span>
                        <span className="text-lg font-bold">Guía: {pkg.guia_numero}</span>
                      </div>
                      <Badge className={cn(
                        "px-3 py-1",
                        pkg.estado === 'en_ruta' ? "bg-blue-500/20 text-blue-400" : "bg-orange-500/20 text-orange-400"
                      )}>
                        {pkg.estado.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>

                    <div className="p-4 bg-black/20 rounded-lg space-y-3 border border-white/5">
                      <div className="flex items-start gap-3">
                        <MapPin className="h-5 w-5 text-accent shrink-0" />
                        <span className="text-sm">{pkg.direccion}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-accent shrink-0" />
                        <a href={`tel:${pkg.telefono}`} className="text-sm font-bold underline">{pkg.telefono}</a>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {pkg.estado === 'pendiente' && (
                        <Button 
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold"
                          onClick={() => handleUpdateStatus(pkg.id, 'en_ruta')}
                        >
                          Marcar En Ruta
                        </Button>
                      )}
                      <Button 
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold"
                        onClick={() => handleUpdateStatus(pkg.id, 'entregado')}
                      >
                        Finalizar Entrega
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </main>

      <nav className="fixed bottom-6 left-6 right-6 h-16 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl flex items-center justify-around z-50 shadow-2xl overflow-hidden px-2">
        <button 
          onClick={() => setActiveTab('disponibles')}
          className={cn(
            "flex flex-col items-center justify-center gap-1 w-full h-full transition-all relative",
            activeTab === 'disponibles' ? "text-accent" : "text-slate-400"
          )}
        >
          <Package className="h-5 w-5" />
          <span className="text-[10px] font-bold">Disponibles</span>
          {activeTab === 'disponibles' && <div className="absolute top-0 w-8 h-1 bg-accent rounded-b-full shadow-[0_0_10px_rgba(0,255,255,0.5)]" />}
          {availablePackages.length > 0 && activeTab !== 'disponibles' && (
            <span className="absolute top-2 right-[30%] w-2 h-2 bg-red-500 rounded-full animate-pulse" />
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
          <span className="text-[10px] font-bold">Mis Rutas</span>
          {activeTab === 'mis_entregas' && <div className="absolute top-0 w-8 h-1 bg-accent rounded-b-full shadow-[0_0_10px_rgba(0,255,255,0.5)]" />}
          {myDeliveries.length > 0 && (
            <Badge className="absolute top-2 right-[30%] h-4 w-4 p-0 flex items-center justify-center bg-accent text-primary text-[8px]">
              {myDeliveries.length}
            </Badge>
          )}
        </button>

        <button className="flex flex-col items-center justify-center gap-1 w-full h-full text-slate-400">
          <Navigation className="h-5 w-5" />
          <span className="text-[10px] font-bold">Mapa</span>
        </button>
      </nav>
    </div>
  );
}
