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
        .neq('estado', 'cancelado')
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
    if (newStatus === 'cancelado') {
      if (!novedad.trim()) {
        setNovedadError(true);
        toast({
          variant: "destructive",
          title: "Novedad requerida",
          description: "Debes registrar una novedad antes de marcar como 'Entrega no ejecutada'.",
        });
        return;
      }
    }

    setUpdatingStatus(true);
    try {
      const updatePayload: Record<string, any> = { estado: newStatus };
      if (newStatus === 'cancelado' && novedad.trim()) {
        updatePayload.novedad = novedad.trim();
      }

      const { error } = await supabase
        .from('paquetes')
        .update(updatePayload)
        .eq('id', pkgId);

      if (error) throw error;

      toast({
        title: "Estado actualizado",
        description: `Paquete actualizado correctamente.`,
      });
      
      if (newStatus === 'entregado' || newStatus === 'cancelado') {
        setIsDetailOpen(false);
        setNovedad('');
        setNovedadError(false);
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
        description: newValue ? "Se notificó que el cliente no contesta." : "Alerta removida." 
      });
      if (userId) fetchData(userId);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo procesar." });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const submitPaymentChange = async () => {
    if (!selectedPackage || !newPaymentMethod || !paymentImage) {
      toast({ variant: "destructive", title: "Incompleto", description: "Selecciona método y adjunta evidencia." });
      return;
    }

    setUpdatingStatus(true);
    try {
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

      toast({ title: "Cambio solicitado", description: "Se notificó el cambio de pago." });
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
      toast({ variant: "destructive", title: "Cámara", description: "Sin acceso a cámara." });
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPaymentImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const openDetails = (pkg: PaqueteData) => {
    setSelectedPackage(pkg);
    setNovedad('');
    setNovedadError(false);
    setIsDetailOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'entregado': return <Badge className="bg-green-500/20 text-green-400 border-green-500/50"><CheckCircle2 className="w-3 h-3 mr-1"/> Entregado</Badge>;
      case 'en_ruta': return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50"><Truck className="w-3 h-3 mr-1"/> En camino</Badge>;
      case 'llegado': return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/50"><MapPinned className="w-3 h-3 mr-1"/> He llegado</Badge>;
      case 'cancelado': return <Badge className="bg-red-500/20 text-red-400 border-red-500/50"><UserX className="w-3 h-3 mr-1"/> Entrega no ejecutada</Badge>;
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
                  className={cn(
                    "bg-white/10 border-accent/20 cursor-pointer active:scale-[0.98] transition-all",
                    pkg.alerta_no_contesta && "animate-pulse-yellow border-yellow-500/50"
                  )}
                  onClick={() => openDetails(pkg)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-accent/20 p-2 rounded-lg relative">
                          <Package className="h-5 w-5 text-accent" />
                          {pkg.alerta_no_contesta && <span className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-500 rounded-full animate-ping" />}
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

      <Dialog open={isDetailOpen} onOpenChange={(open) => {
        setIsDetailOpen(open);
        if (!open) {
          setNovedad('');
          setNovedadError(false);
        }
      }}>
        <DialogContent className="bg-slate-900 border-white/10 text-white sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-accent" /> Detalles del Paquete
            </DialogTitle>
          </DialogHeader>
          
          {selectedPackage && (
            <div className="space-y-6 py-2">
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

              {/* Nuevas Alertas */}
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  className={cn(
                    "h-12 text-[10px] gap-1 transition-all",
                    selectedPackage.alerta_no_contesta ? "bg-red-600 hover:bg-red-700 text-white border-transparent" : "text-slate-400 border-white/10"
                  )}
                  onClick={toggleNoContesta}
                  disabled={updatingStatus}
                >
                  <MessageSquareOff className="w-3 h-3" />
                  {selectedPackage.alerta_no_contesta ? "Quitar 'No Contesta'" : "Sin respuesta"}
                </Button>
                <Button 
                  variant="outline" 
                  className="h-12 text-[10px] gap-1 text-accent border-accent/20 hover:bg-accent/10"
                  onClick={() => setIsPaymentChangeOpen(true)}
                  disabled={updatingStatus}
                >
                  <RefreshCcw className="w-3 h-3" />
                  Cambiar Pago
                </Button>
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

                {selectedPackage.alerta_cambio_pago && (
                  <div className="bg-blue-500/10 border border-blue-500/30 p-2 rounded-md flex items-center gap-2 text-[10px] text-blue-400">
                    <RefreshCcw className="w-3 h-3" /> Cambio de pago reportado
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

                {(selectedPackage.estado === 'llegado' || selectedPackage.estado === 'en_ruta') && (
                  <div className="space-y-2 pt-2">
                    <Label htmlFor="novedad" className={cn(
                      "text-xs font-bold uppercase flex items-center gap-1",
                      novedadError ? "text-red-400" : "text-slate-400"
                    )}>
                      <AlertTriangle className="w-3 h-3" />
                      Novedad{' '}
                      <span className="text-red-400 font-normal normal-case">(requerida para "Entrega no ejecutada")</span>
                    </Label>
                    <Textarea
                      id="novedad"
                      placeholder="Describe el motivo por el que no se pudo realizar la entrega..."
                      value={novedad}
                      onChange={(e) => {
                        setNovedad(e.target.value);
                        if (e.target.value.trim()) setNovedadError(false);
                      }}
                      className={cn(
                        "bg-white/5 border text-white min-h-[90px] resize-none placeholder:text-slate-600 text-sm",
                        novedadError 
                          ? "border-red-500 focus-visible:ring-red-500" 
                          : "border-white/10 focus-visible:ring-accent"
                      )}
                    />
                    {novedadError && (
                      <p className="text-xs text-red-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Este campo es obligatorio para registrar una entrega no ejecutada.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col gap-2 sm:flex-col pt-4 border-t border-white/5">
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
              <div className="flex flex-col gap-2 w-full">
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-12"
                  onClick={() => selectedPackage && handleUpdateStatus(selectedPackage.id, 'entregado')}
                  disabled={updatingStatus}
                >
                  {updatingStatus ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
                  Marcar como Entregado
                </Button>
                <Button 
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold h-12"
                  onClick={() => selectedPackage && handleUpdateStatus(selectedPackage.id, 'cancelado')}
                  disabled={updatingStatus}
                >
                  {updatingStatus ? <Loader2 className="animate-spin mr-2" /> : <UserX className="mr-2 h-5 w-5" />}
                  Entrega no ejecutada
                </Button>
              </div>
            )}

            <Button variant="ghost" onClick={() => setIsDetailOpen(false)} className="w-full text-slate-400">
              Cerrar
            </Button>
          </DialogFooter>
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
                  <Button variant="outline" className="flex-1 gap-2" onClick={startCamera}>
                    <Camera className="w-4 h-4"/> Foto
                  </Button>
                  <Button variant="outline" className="flex-1 gap-2" onClick={() => fileInputRef.current?.click()}>
                    <ImageIcon className="w-4 h-4"/> Adjuntar
                  </Button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleFileChange} 
                  />
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