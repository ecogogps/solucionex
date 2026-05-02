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
  Image as ImageIcon
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

  // Estados para alertas
  const [isPaymentChangeOpen, setIsPaymentChangeOpen] = useState(false);
  const [newPaymentMethod, setNewPaymentMethod] = useState('');
  const [paymentImage, setPaymentImage] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
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
        const updated = (data || []).find(p => p.id === selectedPackage.id);
        if (updated) setSelectedPackage(updated);
      }
    } catch (error: any) {
      console.error("Error fetching packages:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (pkgId: string, newStatus: string) => {
    if (newStatus === 'cancelado' && !novedad.trim()) {
      setNovedadError(true);
      toast({ variant: "destructive", title: "Requerido", description: "Debes registrar una novedad." });
      return;
    }

    setUpdatingStatus(true);
    try {
      const payload: any = { estado: newStatus };
      if (newStatus === 'cancelado') payload.novedad = novedad.trim();

      const { error } = await supabase.from('paquetes').update(payload).eq('id', pkgId);
      if (error) throw error;

      toast({ title: "Actualizado", description: "El estado ha sido actualizado." });
      if (['entregado', 'cancelado'].includes(newStatus)) setIsDetailOpen(false);
      if (userId) fetchData(userId);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar." });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const toggleNoContesta = async () => {
    if (!selectedPackage) return;
    setUpdatingStatus(true);
    try {
      const newValue = !selectedPackage.alerta_no_contesta;
      const { error } = await supabase
        .from('paquetes')
        .update({ alerta_no_contesta: newValue })
        .eq('id', selectedPackage.id);

      if (error) throw error;
      toast({ 
        title: newValue ? "Alerta activada" : "Alerta desactivada", 
        description: newValue ? "Se notificó a la empresa que el cliente no contesta." : "Alerta removida." 
      });
      if (userId) fetchData(userId);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo procesar la alerta." });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const submitPaymentChange = async () => {
    if (!selectedPackage || !newPaymentMethod || !paymentImage) {
      toast({ variant: "destructive", title: "Campos incompletos", description: "Selecciona el método y adjunta una imagen." });
      return;
    }

    setUpdatingStatus(true);
    try {
      // Subir imagen
      const blob = await fetch(paymentImage).then(r => r.blob());
      const fileName = `image-metodo/pago-${selectedPackage.id}-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage.from('paquetes').upload(fileName, blob);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('paquetes').getPublicUrl(fileName);

      const { error } = await supabase
        .from('paquetes')
        .update({ 
          metodo_pago: newPaymentMethod,
          alerta_cambio_pago: true,
          imagen_pago_url: publicUrl
        })
        .eq('id', selectedPackage.id);

      if (error) throw error;

      toast({ title: "Cambio solicitado", description: "Se actualizó el método de pago y se notificó a la empresa." });
      setIsPaymentChangeOpen(false);
      setPaymentImage(null);
      if (userId) fetchData(userId);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const startCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      toast({ variant: "destructive", title: "Cámara", description: "No se pudo acceder a la cámara." });
      setShowCamera(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0);
      setPaymentImage(canvas.toDataURL('image/jpeg'));
      stopCamera();
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    }
    setShowCamera(false);
  };

  const openDetails = (pkg: PaqueteData) => {
    setSelectedPackage(pkg);
    setNovedad('');
    setNovedadError(false);
    setIsDetailOpen(true);
  };

  return (
    <div className="min-h-screen bg-background text-white flex flex-col">
      <header className="h-16 bg-white/5 border-b border-white/10 flex items-center justify-between px-6 sticky top-0 z-40 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Truck className="h-6 w-6 text-accent" />
          <span className="font-bold text-lg">Solucionex</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => { supabase.auth.signOut(); router.push('/'); }} className="text-red-400">
          <LogOut className="h-5 w-5" />
        </Button>
      </header>

      <main className="flex-1 p-4 space-y-4 pb-24">
        <h2 className="text-2xl font-bold">Mis Paquetes</h2>
        
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-accent" /></div>
        ) : (
          <div className="grid gap-3">
            {myDeliveries.map((pkg) => (
              <Card 
                key={pkg.id} 
                className={cn(
                  "bg-white/10 border-white/5 cursor-pointer transition-all",
                  pkg.alerta_no_contesta && "animate-pulse-yellow border-yellow-500/50"
                )}
                onClick={() => openDetails(pkg)}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Package className="h-5 w-5 text-accent" />
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-400">{pkg.empresas?.nombre}</span>
                      <span className="font-bold">Guía: {pkg.guia_numero}</span>
                    </div>
                  </div>
                  {pkg.alerta_no_contesta && <Badge className="bg-yellow-500 text-black text-[8px] animate-pulse">NO CONTESTA</Badge>}
                  <ChevronRight className="text-slate-500" />
                </CardContent>
              </Card>
            ))}
            {myDeliveries.length === 0 && <p className="text-center text-slate-500 py-10">No hay paquetes activos.</p>}
          </div>
        )}
      </main>

      {/* Modal Detalle */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles de Entrega</DialogTitle>
          </DialogHeader>
          
          {selectedPackage && (
            <div className="space-y-4 py-2">
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="font-bold text-accent">Guía: {selectedPackage.guia_numero}</span>
                <Badge variant="outline">{selectedPackage.estado}</Badge>
              </div>

              {/* Botones de Comunicación / Alertas */}
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant={selectedPackage.alerta_no_contesta ? "destructive" : "outline"}
                  className={cn("h-12 text-xs gap-2", selectedPackage.alerta_no_contesta && "bg-yellow-600 hover:bg-yellow-700 text-white")}
                  onClick={toggleNoContesta}
                  disabled={updatingStatus}
                >
                  <MessageSquareOff className="w-4 h-4" />
                  {selectedPackage.alerta_no_contesta ? "Quitar 'No Contesta'" : "Cliente no contesta"}
                </Button>
                <Button 
                  variant="outline" 
                  className="h-12 text-xs gap-2 border-accent/30 text-accent hover:bg-accent/10"
                  onClick={() => setIsPaymentChangeOpen(true)}
                  disabled={updatingStatus}
                >
                  <RefreshCcw className="w-4 h-4" />
                  Cambiar Pago
                </Button>
              </div>

              <div className="space-y-2 bg-white/5 p-3 rounded-lg text-sm">
                <p className="flex items-center gap-2"><MapPin className="w-3 h-3 text-accent"/> {selectedPackage.direccion}</p>
                <p className="flex items-center gap-2"><Phone className="w-3 h-3 text-accent"/> <a href={`tel:${selectedPackage.telefono}`} className="underline">{selectedPackage.telefono}</a></p>
                <p className="flex items-center gap-2 font-bold"><DollarSign className="w-3 h-3 text-accent"/> {selectedPackage.valor_pedido} ({selectedPackage.metodo_pago})</p>
              </div>

              {selectedPackage.alerta_cambio_pago && (
                <div className="bg-blue-500/10 border border-blue-500/30 p-2 rounded-md flex items-center gap-2 text-[10px] text-blue-400">
                  <RefreshCcw className="w-3 h-3" /> Cambio de pago solicitado
                </div>
              )}

              {/* Acciones de Estado */}
              <div className="space-y-2 pt-4 border-t border-white/5">
                {selectedPackage.estado === 'pendiente' && (
                  <Button className="w-full bg-blue-600 font-bold" onClick={() => handleUpdateStatus(selectedPackage.id, 'en_ruta')}>Tomar Ruta</Button>
                )}
                {selectedPackage.estado === 'en_ruta' && (
                  <Button className="w-full bg-orange-600 font-bold" onClick={() => handleUpdateStatus(selectedPackage.id, 'llegado')}>He llegado</Button>
                )}
                {(selectedPackage.estado === 'en_ruta' || selectedPackage.estado === 'llegado') && (
                  <div className="grid gap-2">
                    <Button className="bg-green-600 font-bold" onClick={() => handleUpdateStatus(selectedPackage.id, 'entregado')}>Entregado</Button>
                    <div className="space-y-2">
                      <Textarea 
                        placeholder="Novedad..." 
                        value={novedad} 
                        onChange={(e) => {setNovedad(e.target.value); setNovedadError(false);}}
                        className={cn("bg-white/5 border-white/10", novedadError && "border-red-500")}
                      />
                      <Button variant="destructive" className="w-full" onClick={() => handleUpdateStatus(selectedPackage.id, 'cancelado')}>Entrega Fallida</Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Cambio de Pago */}
      <Dialog open={isPaymentChangeOpen} onOpenChange={setIsPaymentChangeOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-white sm:max-w-md">
          <DialogHeader><DialogTitle>Solicitar Cambio de Método</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nuevo Método de Pago</Label>
              <Select value={newPaymentMethod} onValueChange={setNewPaymentMethod}>
                <SelectTrigger className="bg-white/5"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent className="bg-slate-800 text-white">
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Evidencia de Pago</Label>
              {paymentImage ? (
                <div className="relative aspect-video rounded-md overflow-hidden bg-black border border-white/10">
                  <img src={paymentImage} alt="Pago" className="w-full h-full object-contain" />
                  <Button size="icon" variant="destructive" className="absolute top-2 right-2 h-6 w-6" onClick={() => setPaymentImage(null)}><X className="w-3 h-3"/></Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 gap-2" onClick={startCamera}><Camera className="w-4 h-4"/> Foto</Button>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsPaymentChangeOpen(false)}>Cancelar</Button>
            <Button className="bg-accent text-primary font-bold" onClick={submitPaymentChange} disabled={updatingStatus}>
              {updatingStatus ? <Loader2 className="animate-spin" /> : "Enviar Solicitud"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cámara Overlay */}
      {showCamera && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col p-4">
          <video ref={videoRef} className="flex-1 rounded-lg object-cover" autoPlay playsInline muted />
          <canvas ref={canvasRef} className="hidden" />
          <div className="flex justify-around py-6">
            <Button variant="ghost" size="lg" className="rounded-full w-16 h-16 bg-white/10" onClick={stopCamera}><X className="h-8 w-8 text-red-500"/></Button>
            <Button size="lg" className="rounded-full w-20 h-20 bg-accent text-primary" onClick={capturePhoto}><Camera className="h-10 w-10"/></Button>
          </div>
        </div>
      )}

      {/* Nav Inferior */}
      <nav className="fixed bottom-6 left-6 right-6 h-16 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl flex items-center justify-around z-50 shadow-2xl overflow-hidden px-2">
        <button onClick={() => router.push('/dashboard/operator-portal')} className={cn("flex flex-col items-center justify-center gap-1 w-full h-full transition-all relative", pathname === '/dashboard/operator-portal' ? "text-accent" : "text-slate-400")}>
          <Package className="h-5 w-5" />
          <span className="text-[10px] font-bold">Solicitudes</span>
          {pathname === '/dashboard/operator-portal' && <div className="absolute top-0 w-8 h-1 bg-accent rounded-b-full" />}
        </button>
        <button onClick={() => router.push('/dashboard/operator-portal/my-packages')} className={cn("flex flex-col items-center justify-center gap-1 w-full h-full transition-all relative", pathname === '/dashboard/operator-portal/my-packages' ? "text-accent" : "text-slate-400")}>
          <ClipboardCheck className="h-5 w-5" />
          <span className="text-[10px] font-bold">Mis Paquetes</span>
          {pathname === '/dashboard/operator-portal/my-packages' && <div className="absolute top-0 w-8 h-1 bg-accent rounded-b-full" />}
        </button>
      </nav>
    </div>
  );
}