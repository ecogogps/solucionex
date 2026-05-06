'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Truck, 
  LogOut, 
  Package, 
  ClipboardCheck, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  MapPin, 
  Building2,
  Clock,
  MapPinned,
  ArrowRightCircle,
  PackageCheck,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
  valor_pedido: number;
  empresa_id: string;
  operador_id: string | null;
  created_at: string;
  empresas?: {
    nombre: string;
    direccion: string;
  };
}

export default function SolicitudesPage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [availablePackages, setAvailablePackages] = useState<PaqueteData[]>([]);
  const [rejectedIds, setRejectedIds] = useState<string[]>([]);
  
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUserId(session.user.id);
        fetchData();
      } else {
        router.push('/');
      }
    };
    getSession();
  }, [router]);

  useEffect(() => {
    const channel = supabase
      .channel('paquetes_realtime_solicitudes')
      .on(
        'postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'paquetes' 
        }, 
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    try {
      const { data, error } = await supabase
        .from('paquetes')
        .select('*, empresas(nombre, direccion)')
        .in('estado', ['buscando_operador', 'pedido_listo'])
        .is('operador_id', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching available packages:", JSON.stringify(error, null, 2));
        return;
      }

      setAvailablePackages(data || []);
    } catch (error: any) {
      console.error("Unexpected error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (pkg: PaqueteData) => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('paquetes')
        .update({ 
          operador_id: userId, 
          estado: 'pendiente' 
        })
        .eq('id', pkg.id)
        .in('estado', ['buscando_operador', 'pedido_listo'])
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error("Este pedido ya ha sido aceptado por otro operador.");
      }

      toast({
        title: "¡Paquete Aceptado!",
        description: `El paquete ${pkg.guia_numero} ha sido añadido.`,
      });
      
      router.push('/dashboard/operator-portal/my-packages');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "No disponible",
        description: error.message || "No se pudo aceptar el pedido en este momento.",
      });
      fetchData();
    }
  };

  const handleRejectLocal = (id: string) => {
    setRejectedIds(prev => [...prev, id]);
    toast({
      description: "Paquete ignorado de tu lista.",
    });
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
      default: return <Badge variant="outline" className="text-accent border-accent/50 bg-accent/10">Buscando Operador</Badge>;
    }
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
          <h2 className="text-2xl font-bold">Solicitudes Disponibles</h2>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-accent mb-4" />
            <p className="text-slate-400 text-sm">Sincronizando solicitudes...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {visiblePackages.length === 0 ? (
              <div className="bg-white/5 rounded-xl border border-white/10 p-12 text-center flex flex-col items-center">
                <Package className="h-12 w-12 text-slate-500 mb-4" />
                <h3 className="text-lg font-semibold text-white">No hay paquetes nuevos</h3>
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
        )}
      </main>

      <nav className="fixed bottom-6 left-6 right-6 h-16 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl flex items-center justify-around z-50 shadow-2xl overflow-hidden px-2">
        <button 
          onClick={() => router.push('/dashboard/operator-portal')}
          className={cn(
            "flex flex-col items-center justify-center gap-1 w-full h-full transition-all relative",
            pathname === '/dashboard/operator-portal' ? "text-accent" : "text-slate-400"
          )}
        >
          <Package className="h-5 w-5" />
          <span className="text-[10px] font-bold">Solicitudes</span>
          {pathname === '/dashboard/operator-portal' && <div className="absolute top-0 w-8 h-1 bg-accent rounded-b-full shadow-[0_0_10px_rgba(0,255,255,0.5)]" />}
        </button>

        <button 
          onClick={() => router.push('/dashboard/operator-portal/my-packages')}
          className={cn(
            "flex flex-col items-center justify-center gap-1 w-full h-full transition-all relative",
            pathname === '/dashboard/operator-portal/my-packages' ? "text-accent" : "text-slate-400"
          )}
        >
          <ClipboardCheck className="h-5 w-5" />
          <span className="text-[10px] font-bold">Mis Paquetes</span>
          {pathname === '/dashboard/operator-portal/my-packages' && <div className="absolute top-0 w-8 h-1 bg-accent rounded-b-full shadow-[0_0_10px_rgba(0,255,255,0.5)]" />}
        </button>
      </nav>
    </div>
  );
}
