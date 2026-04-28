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
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Disponibles: estado 'buscando_operador' y sin operador asignado
      const available = data.filter(p => p.estado === 'buscando_operador' && !p.operador_id);
      
      // Mis Entregas: asignados a mí y no entregados aún
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
      // Actualización atómica: solo si el estado sigue siendo 'buscando_operador'
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
        description: "Es posible que otro operador haya aceptado el pedido hace un segundo.",
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
        description: `Pedido marcado como ${newStatus.replace('_', ' ')}.`,
      });
      if (userId) fetchData(userId);
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
    toast({
      description: "Pedido ignorado de tu lista.",
    });
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
              : `Tienes ${myDeliveries.length} entregas pendientes`}
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
                        <MapPin className="h-4 w-4 text-accent mt-1 shrink-0" />
                        <span className="text-sm font-medium line-clamp-2">{pkg.direccion}</span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-400">
                        <Clock className="h-4 w-4 shrink-0" />
                        <span className="text-xs italic">Recogida: {pkg.tiempo_recogida} min</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
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
                <Card key={pkg.id} className="bg-white/10 border-accent/20">
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-accent uppercase tracking-widest">En curso</span>
                        <span className="text-base font-bold">Guía: {pkg.guia_numero}</span>
                      </div>
                      <Badge className={cn(
                        "px-2 py-0.5 text-[10px]",
                        pkg.estado === 'en_ruta' ? "bg-blue-500/20 text-blue-400" : "bg-orange-500/20 text-orange-400"
                      )}>
                        {pkg.estado.toUpperCase()}
                      </Badge>
                    </div>

                    <div className="bg-black/20 p-3 rounded-lg border border-white/5 space-y-2">
                      <div className="flex items-start gap-2 text-xs">
                        <MapPin className="h-3 w-3 text-accent shrink-0 mt-0.5" />
                        <span>{pkg.direccion}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <Phone className="h-3 w-3 text-accent shrink-0" />
                        <a href={`tel:${pkg.telefono}`} className="font-bold underline text-accent">{pkg.telefono}</a>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {pkg.estado === 'pendiente' && (
                        <Button 
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold h-9 text-xs"
                          onClick={() => handleUpdateStatus(pkg.id, 'en_ruta')}
                        >
                          Tomar y Salir
                        </Button>
                      )}
                      <Button 
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold h-9 text-xs"
                        onClick={() => handleUpdateStatus(pkg.id, 'entregado')}
                      >
                        Marcar Entregado
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