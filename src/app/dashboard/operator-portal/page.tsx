'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
  Volume2,
  VolumeX,
  X
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
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playNotificationSound = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio('/sounds/solicitudesnuevas.mp3');
    }
    audioRef.current.muted = false;
    audioRef.current.play().catch(() => {});
  }, []);
  
  useEffect(() => {
    const audio = new Audio('/sounds/solicitudesnuevas.mp3');
    audioRef.current = audio;
  
    // Verifica al montar si Chrome ya permite autoplay
    audio.muted = true;
    audio.play()
      .then(() => {
        audio.pause();
        audio.muted = false;
        setIsAudioEnabled(true); // Chrome lo permite, oculta el botón
      })
      .catch(() => {
        setIsAudioEnabled(false); // Bloqueado, muestra el botón
        // Fallback: desbloquear en primer click
        const unlock = () => {
          audio.muted = true;
          audio.play().then(() => {
            audio.muted = false;
            setIsAudioEnabled(true);
            window.removeEventListener('click', unlock);
          }).catch(() => {});
        };
        window.addEventListener('click', unlock);
        return () => window.removeEventListener('click', unlock);
      });
  }, []);

  const fetchData = useCallback(async (currentUserId: string) => {
    try {
      // 1. Obtener IDs de paquetes ya rechazados por este operador
      const { data: rejections } = await supabase
        .from('operador_rechazos')
        .select('paquete_id')
        .eq('operador_id', currentUserId);
      
      const dbRejectedIds = (rejections || []).map(r => r.paquete_id);
      setRejectedIds(dbRejectedIds);

      // Obtener empresas exclusivas donde este operador está asignado
      const { data: asignaciones } = await supabase
      .from('empresa_operadores')
      .select('empresa_id')
      .eq('operador_id', currentUserId);

      const empresasAsignadas = (asignaciones || []).map(a => a.empresa_id);

      // Obtener empresas exclusivas que NO incluyen a este operador
      const { data: empresasExclusivas } = await supabase
      .from('empresas')
      .select('id')
      .eq('operadores_exclusivos', true);

      const idsExcluidas = (empresasExclusivas || [])
      .map(e => e.id)
      .filter(id => !empresasAsignadas.includes(id));

      let query = supabase
      .from('paquetes')
      .select('*, empresas(nombre, direccion)')
      .in('estado', ['buscando_operador', 'pedido_listo'])
      .is('operador_id', null);

      // Excluir paquetes de empresas exclusivas donde no está asignado
      if (idsExcluidas.length > 0) {
      query = query.not('empresa_id', 'in', `(${idsExcluidas.join(',')})`);
      }

      if (dbRejectedIds.length > 0) {
      query = query.not('id', 'in', `(${dbRejectedIds.join(',')})`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setAvailablePackages(data || []);
    } catch (error: any) {
      console.error("Error fetching available packages:", error);
    } finally {
      setLoading(false);
    }
  }, []);

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
  }, [router, fetchData]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('paquetes_realtime_solicitudes')
      .on(
        'postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'paquetes' 
        }, 
        (payload) => {
          if (payload.eventType === 'INSERT') {
            playNotificationSound();
          }
          if (payload.eventType === 'UPDATE' && !payload.new.operador_id && (payload.new.estado === 'buscando_operador' || payload.new.estado === 'pedido_listo')) {
            playNotificationSound();
          }
          fetchData(userId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchData, playNotificationSound]);

  const handleAccept = async (pkg: PaqueteData) => {
    if (!userId) return;
  
    let ubicacion = null;
    if (navigator.geolocation) {
      ubicacion = await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            resolve({ latitud: pos.coords.latitude, longitud: pos.coords.longitude });
          },
          (error) => {
            // Esto te permitirá ver el motivo del fallo en la consola del navegador (F12)
            console.warn("Fallo al obtener ubicación:", error.code, error.message);
            resolve(null);
          },
          { 
            enableHighAccuracy: false, // Cambiado a false para que sea más rápido usando Wi-Fi/red celular
            timeout: 10000            // Incrementado a 10 segundos
          }
        );
      });
    } else {
      console.warn("El navegador no soporta geolocalización o no está en un entorno HTTPS seguro.");
    }
  
    // Si consideras que la ubicación es obligatoria para aceptar, puedes agregar esta validación:
    if (!ubicacion) {
      toast({
        variant: "destructive",
        title: "Ubicación requerida",
        description: "No se pudo obtener tu ubicación actual. Asegúrate de activar el GPS y dar permisos.",
      });
      return; // Detiene el proceso si no se pudo capturar la latitud/longitud
    }
  
    try {
      const updateData: any = { 
        operador_id: userId, 
        estado: 'pendiente',
        ubicacion_pendiente: ubicacion // Al validar arriba que no sea null, nos aseguramos de que siempre se envíe
      };
  
      const { data, error } = await supabase
        .from('paquetes')
        .update(updateData)
        .eq('id', pkg.id)
        .in('estado', ['buscando_operador', 'pedido_listo'])
        .is('operador_id', null)
        .select();
  
      if (error) throw error;
  
      if (!data || data.length === 0) {
        throw new Error("Este pedido ya ha sido aceptado por otro operador.");
      }
  
      toast({
        title: "¡Paquete Aceptado!",
        description: `El paquete ${pkg.guia_numero} ha sido añadido a tu lista con tu ubicación actual.`,
      });
      
      router.push('/dashboard/operator-portal/my-packages');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Atención",
        description: error.message || "No se pudo aceptar el pedido en este momento.",
      });
      fetchData(userId);
    }
  };

  const handleReject = async (id: string) => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('operador_rechazos')
        .insert({
          operador_id: userId,
          paquete_id: id
        });

      if (error) throw error;

      setRejectedIds(prev => [...prev, id]);
      toast({
        title: "Solicitud rechazada",
        description: "El paquete ya no aparecerá en tus solicitudes disponibles."
      });
      fetchData(userId);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo registrar el rechazo."
      });
    }
  };

  const handleManualUnlock = () => {
    playNotificationSound();
  };

  const visiblePackages = availablePackages.filter(p => !rejectedIds.includes(p.id));

  return (
    <div className="min-h-screen bg-background text-white flex flex-col">
      <header className="h-16 bg-white/5 border-b border-white/10 flex items-center justify-between px-6 sticky top-0 z-40 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Truck className="h-6 w-6 text-accent" />
          <span className="font-bold text-lg">Solucionex</span>
        </div>
        <div className="flex items-center gap-2">
          {!isAudioEnabled ? (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleManualUnlock}
              className="h-8 border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10 hover:text-yellow-400 gap-2 text-[10px] font-bold"
            >
              <VolumeX className="h-3 w-3" /> Audio Bloqueado
            </Button>
          ) : (
            <Badge variant="outline" className="border-accent/20 text-accent/50 gap-1 text-[10px]">
              <Volume2 className="h-3 w-3" /> Sonido Activo
            </Badge>
          )}
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
          <p className="text-slate-400 text-sm">Escaneando pedidos en tiempo real...</p>
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
                <p className="text-slate-500 text-sm">Te avisaremos con un sonido cuando llegue algo.</p>
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
                        onClick={() => handleReject(pkg.id)}
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
