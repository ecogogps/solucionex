'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Truck, 
  LogOut, 
  Package, 
  ClipboardCheck, 
  Navigation, 
  Loader2, 
  CheckCircle2, 
  MapPin, 
  Phone, 
  DollarSign,
  Info,
  ChevronRight,
  FileText,
  CreditCard,
  MapPinned,
  Building2,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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

export default function MyPackagesPage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [myDeliveries, setMyDeliveries] = useState<PaqueteData[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PaqueteData | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  useEffect(() => {
    setIsMounted(true);
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
        { 
          event: '*', 
          schema: 'public', 
          table: 'paquetes',
          filter: `operador_id=eq.${userId}`
        }, 
        () => {
          fetchData(userId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, selectedPackage?.id]);

  const fetchData = async (currentUserId: string) => {
    try {
      const { data, error } = await supabase
        .from('paquetes')
        .select('*, empresas(nombre, direccion)')
        .eq('operador_id', currentUserId)
        .neq('estado', 'entregado')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching my packages:", JSON.stringify(error, null, 2));
        return;
      }

      const packages = data || [];
      setMyDeliveries(packages);

      if (selectedPackage) {
        const updatedPackage = packages.find(p => p.id === selectedPackage.id);
        if (updatedPackage) {
          setSelectedPackage(updatedPackage);
        } else {
          setIsDetailOpen(false);
        }
      }
    } catch (error: any) {
      console.error("Unexpected error:", error);
    } finally {
      setLoading(false);
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
        description: `Pedido marcado como ${statusLabels[newStatus] || newStatus}.`,
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

  const openDetails = (pkg: PaqueteData) => {
    setSelectedPackage(pkg);
    setIsDetailOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'entregado': return <Badge className="bg-green-500/20 text-green-400 border-green-500/50"><CheckCircle2 className="w-3 h-3 mr-1"/> Entregado</Badge>;
      case 'en_ruta': return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50"><Truck className="w-3 h-3 mr-1"/> En Ruta</Badge>;
      case 'llegado': return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/50"><MapPinned className="w-3 h-3 mr-1"/> He llegado</Badge>;
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
          <h2 className="text-2xl font-bold">Mis Paquetes</h2>
          <p className="text-slate-400 text-sm">
            Tienes {myDeliveries.length} entregas activas
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-accent mb-4" />
            <p className="text-slate-400 text-sm">Cargando tus rutas...</p>
          </div>
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
                          <span className="text-xs text-slate-400 font-bold">{pkg.empresas?.nombre || 'Empresa Aliada'}</span>
                          <span className="text-sm font-bold">Guía: {pkg.guia_numero}</span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <MapPin className="h-2 w-2" /> {pkg.direccion}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div>
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
                  <p className="text-xs text-slate-400">
                    {isMounted ? new Date(selectedPackage.created_at).toLocaleDateString() : ''}
                  </p>
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
                      <CreditCard className="w-3 h-3" /> Imagen de Guía
                    </p>
                    <div className="relative aspect-video rounded-lg overflow-hidden border border-white/10 bg-black">
                      <Image 
                        src={selectedPackage.imagen_url} 
                        alt="Imagen Guía" 
                        fill 
                        className="object-contain"
                        unoptimized
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
