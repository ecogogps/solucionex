'use client';

import { useState, useEffect, useRef } from 'react';
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
  Clock,
  UserX,
  AlertTriangle,
  MessageSquareOff,
  RefreshCcw,
  Camera,
  X,
  Image as ImageIcon,
  RotateCcw
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  novedad?: string;
  imagen_url?: string;
  created_at: string;
  alerta_no_contesta?: boolean;
  alerta_cambio_pago?: boolean;
  imagen_pago_url?: string;
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

  // Estados para alertas y cambio de pago
  const [isPaymentChangeOpen, setIsPaymentChangeOpen] = useState(false);
  const [newPaymentMethod, setNewPaymentMethod] = useState('');
  const [paymentImage, setPaymentImage] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estado para el campo novedad (entrega no ejecutada)
  const [novedad, setNovedad] = useState('');
  const [novedadError, setNovedadError] = useState(false);
  
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
        { event: '*', schema: 'public', table: 'paquetes', filter: `operador_id=eq.${userId}` }, 
        () => { fetchData(userId); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const fetchData = async (currentUserId: string) => {
    try {
      const { data, error } = await supabase
        .from('paquetes')
        .select('*, empresas(nombre, direccion)')
        .eq('operador_id', currentUserId)
        .neq('estado', 'entregado')
        .neq('estado', 'cancelado')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMyDeliveries(data || []);

      if (selectedPackage) {
        const updatedPackage = data?.find(p => p.id === selectedPackage.id);
        if (updatedPackage) setSelectedPackage(updatedPackage);
        else setIsDetailOpen(false);
      }
    } catch (error: any) {
      console.error("Error fetchData:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (pkgId: string, newStatus: string) => {
    if (newStatus === 'cancelado' && !novedad.trim()) {
      setNovedadError(true);
      toast({ variant: "destructive", title: "Novedad requerida" });
      return;
    }

    setUpdatingStatus(true);
    try {
      const updatePayload: Record<string, any> = { estado: newStatus };
      if (newStatus === 'cancelado' && novedad.trim()) updatePayload.novedad = novedad.trim();

      const { error } = await supabase.from('paquetes').update(updatePayload).eq('id', pkgId);
      if (error) throw error;

      toast({ title: "Estado actualizado" });
      if (newStatus === 'entregado' || newStatus === 'cancelado') setIsDetailOpen(false);
      if (userId) fetchData(userId);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error al actualizar" });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const toggleNoContesta = async () => {
    if (!selectedPackage) return;
    setUpdatingStatus(true);
    try {
      const newValue = !selectedPackage.alerta_no_contesta;
      await supabase.from('paquetes').update({ alerta_no_contesta: newValue }).eq('id', selectedPackage.id);
      toast({ title: newValue ? "Alerta activada" : "Alerta desactivada" });
      if (userId) fetchData(userId);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error" });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const submitPaymentChange = async () => {
    if (!selectedPackage || !newPaymentMethod || !paymentImage) return;
    setUpdatingStatus(true);
    try {
      const blob = await fetch(paymentImage).then(r => r.blob());
      const fileName = `image-metodo/pago-${selectedPackage.id}-${Date.now()}.jpg`;
      await supabase.storage.from('paquetes').upload(fileName, blob);
      const { data: { publicUrl } } = supabase.storage.from('paquetes').getPublicUrl(fileName);
      await supabase.from('paquetes').update({ metodo_pago: newPaymentMethod, alerta_cambio_pago: true, imagen_pago_url: publicUrl }).eq('id', selectedPackage.id);
      setIsPaymentChangeOpen(false);
      if (userId) fetchData(userId);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error" });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'entregado': return <Badge className="bg-green-500/20 text-green-400 border-green-500/50"><CheckCircle2 className="w-3 h-3 mr-1"/> Entregado</Badge>;
      case 'en_ruta': return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50"><Truck className="w-3 h-3 mr-1"/> En camino</Badge>;
      case 'llegado': return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/50"><MapPinned className="w-3 h-3 mr-1"/> He llegado</Badge>;
      case 'cancelado': return <Badge className="bg-red-500/20 text-red-400 border-red-500/50"><UserX className="w-3 h-3 mr-1"/> Entrega no ejecutada</Badge>;
      case 'anulado_retornar': return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50"><RotateCcw className="w-3 h-3 mr-1"/> Anulado - Retornar</Badge>;
      default: return <Badge variant="outline" className="text-orange-400 border-orange-400/50 bg-orange-400/10"><Clock className="w-3 h-3 mr-1"/> Pendiente</Badge>;
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
        <h2 className="text-2xl font-bold">Mis Paquetes</h2>
        {loading ? (
          <div className="flex flex-col items-center py-20"><Loader2 className="h-10 w-10 animate-spin text-accent" /></div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {myDeliveries.map((pkg) => (
              <Card 
                key={pkg.id} 
                className={cn("bg-white/10 border-accent/20 cursor-pointer", pkg.alerta_no_contesta && "animate-pulse-yellow border-yellow-500/50")}
                onClick={() => { setSelectedPackage(pkg); setIsDetailOpen(true); }}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-accent/20 p-2 rounded-lg relative"><Package className="h-5 w-5 text-accent" />{pkg.alerta_no_contesta && <span className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-500 rounded-full animate-ping" />}</div>
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-400 font-bold">{pkg.empresas?.nombre}</span>
                      <span className="text-sm font-bold">Guía: {pkg.guia_numero}</span>
                    </div>
                  </div>
                  {getStatusBadge(pkg.estado)}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-white sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Detalles del Paquete</DialogTitle></DialogHeader>
          {selectedPackage && (
            <div className="space-y-6 py-2">
              <div className="flex justify-between">{getStatusBadge(selectedPackage.estado)}</div>
              
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className={cn("h-12 text-[10px]", selectedPackage.alerta_no_contesta && "bg-red-600")} onClick={toggleNoContesta} disabled={updatingStatus}>Sin respuesta</Button>
                <Button variant="outline" className="h-12 text-[10px]" onClick={() => setIsPaymentChangeOpen(true)} disabled={updatingStatus}>Cambiar Pago</Button>
              </div>

              <div className="space-y-4">
                <div className="text-sm font-bold">{selectedPackage.empresas?.nombre}</div>
                <div className="text-sm">{selectedPackage.direccion}</div>
                <a href={`tel:${selectedPackage.telefono}`} className="text-sm text-accent underline">{selectedPackage.telefono}</a>
              </div>

              {(selectedPackage.estado === 'llegado' || selectedPackage.estado === 'en_ruta') && (
                <div className="space-y-2">
                  <Label>Novedad (requerida para entrega fallida)</Label>
                  <Textarea value={novedad} onChange={(e) => setNovedad(e.target.value)} className="bg-white/5 border-white/10" />
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex flex-col gap-2">
            {selectedPackage?.estado === 'pendiente' && <Button className="w-full bg-blue-600" onClick={() => handleUpdateStatus(selectedPackage.id, 'en_ruta')}>Salir a Ruta</Button>}
            {selectedPackage?.estado === 'en_ruta' && <Button className="w-full bg-orange-600" onClick={() => handleUpdateStatus(selectedPackage.id, 'llegado')}>He llegado</Button>}
            {(selectedPackage?.estado === 'llegado' || selectedPackage?.estado === 'en_ruta') && (
              <div className="flex flex-col gap-2 w-full">
                <Button className="w-full bg-green-600" onClick={() => handleUpdateStatus(selectedPackage!.id, 'entregado')}>Entregado</Button>
                <Button className="w-full bg-red-600" onClick={() => handleUpdateStatus(selectedPackage!.id, 'cancelado')}>No ejecutada</Button>
              </div>
            )}
            <Button variant="ghost" onClick={() => setIsDetailOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <nav className="fixed bottom-6 left-6 right-6 h-16 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl flex items-center justify-around z-50">
        <button onClick={() => router.push('/dashboard/operator-portal')} className={cn("flex flex-col items-center gap-1", pathname === '/dashboard/operator-portal' ? "text-accent" : "text-slate-400")}><Package className="h-5 w-5" /><span className="text-[10px]">Solicitudes</span></button>
        <button onClick={() => router.push('/dashboard/operator-portal/my-packages')} className={cn("flex flex-col items-center gap-1", pathname === '/dashboard/operator-portal/my-packages' ? "text-accent" : "text-slate-400")}><ClipboardCheck className="h-5 w-5" /><span className="text-[10px]">Mis Paquetes</span></button>
      </nav>
    </div>
  );
}