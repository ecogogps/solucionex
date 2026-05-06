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
  Building2,
  Clock,
  UserX,
  AlertTriangle,
  MessageSquareOff,
  RefreshCcw,
  Camera,
  X,
  Upload,
  Wrench,
  UserMinus,
  ArrowRightCircle,
  PackageCheck,
  MapPinned,
  CreditCard
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  paquetes_historial?: { estado: string }[];
}

export default function MyPackagesPage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [myDeliveries, setMyDeliveries] = useState<PaqueteData[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PaqueteData | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const [isPaymentChangeOpen, setIsPaymentChangeOpen] = useState(false);
  const [newPaymentMethod, setNewPaymentMethod] = useState('');
  const [paymentImage, setPaymentImage] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isReleaseConfirmOpen, setIsReleaseConfirmOpen] = useState(false);
  const [pendingReleaseReason, setPendingReleaseReason] = useState('');

  const [novedad, setNovedad] = useState('');
  const [novedadError, setNovedadError] = useState(false);
  const [pendingAction, setPendingAction] = useState<'entregado_novedad' | 'cancelado' | null>(null);
  
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
  }, [userId, selectedPackage?.id]);

  const fetchData = async (currentUserId: string) => {
    try {
      const { data, error } = await supabase
        .from('paquetes')
        .select('*, empresas(nombre, direccion), paquetes_historial(estado)')
        .eq('operador_id', currentUserId)
        .neq('estado', 'entregado')
        .neq('estado', 'entregado_novedad')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMyDeliveries(data || []);

      if (selectedPackage) {
        const updatedPackage = (data || []).find(p => p.id === selectedPackage.id);
        if (updatedPackage) setSelectedPackage(updatedPackage);
        else setIsDetailOpen(false);
      }
    } catch (error: any) {
      console.error("Error fetchData:", error);
    } finally {
      setLoading(false);
    }
  };

  const hasAchieved = (state: string) => {
    return selectedPackage?.paquetes_historial?.some(h => h.estado === state);
  };

  const handleUpdateStatus = async (pkgId: string, newStatus: string) => {
    if ((newStatus === 'cancelado' || newStatus === 'entregado_novedad') && !novedad.trim()) {
      setNovedadError(true);
      toast({ variant: "destructive", title: "Novedad requerida", description: "Debes registrar una novedad." });
      return;
    }

    setUpdatingStatus(true);
    try {
      const updatePayload: Record<string, any> = { estado: newStatus };
      if (novedad.trim()) updatePayload.novedad = novedad.trim();

      const { error } = await supabase.from('paquetes').update(updatePayload).eq('id', pkgId);
      if (error) throw error;

      toast({ title: "Estado actualizado" });
      const finalStates = ['entregado', 'entregado_novedad', 'cancelado'];
      if (finalStates.includes(newStatus)) {
        setIsDetailOpen(false);
        setNovedad('');
        setNovedadError(false);
        setPendingAction(null);
      }
      if (userId) fetchData(userId);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error al actualizar" });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleLiberateClick = (reason: string) => {
    setPendingReleaseReason(reason);
    setIsReleaseConfirmOpen(true);
  };

  const executeRelease = async () => {
    if (!selectedPackage || !pendingReleaseReason) return;

    setUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from('paquetes')
        .update({
          estado: 'buscando_operador',
          operador_id: null,
          novedad: pendingReleaseReason,
          alerta_no_contesta: false,
          alerta_cambio_pago: false
        })
        .eq('id', selectedPackage.id);

      if (error) throw error;

      toast({ title: "Paquete liberado", description: "El paquete está disponible nuevamente." });
      
      setIsReleaseConfirmOpen(false);
      setIsDetailOpen(false);
      
      document.body.style.pointerEvents = 'auto';
      
      if (userId) fetchData(userId);
    } catch (error: any) {
      console.error("Error al liberar paquete:", error);
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: "No se pudo liberar el paquete." 
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
    if (!selectedPackage || !newPaymentMethod || !paymentImage) {
      toast({ variant: "destructive", title: "Faltan datos", description: "Debes seleccionar método e imagen." });
      return;
    }
    setUpdatingStatus(true);
    try {
      const response = await fetch(paymentImage);
      const blob = await response.blob();
      const fileName = `image-metodo/pago-${selectedPackage.id}-${Date.now()}.jpg`;
      
      const { error: uploadError } = await supabase.storage.from('paquetes').upload(fileName, blob);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('paquetes').getPublicUrl(fileName);
      
      await supabase.from('paquetes').update({ 
        metodo_pago: newPaymentMethod, 
        alerta_cambio_pago: true, 
        imagen_pago_url: publicUrl 
      }).eq('id', selectedPackage.id);

      toast({ title: "Cambio de pago notificado" });
      setIsPaymentChangeOpen(false);
      setPaymentImage(null);
      if (userId) fetchData(userId);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setUpdatingStatus(false);
    }
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
      default: return <Badge variant="outline" className="text-orange-400 border-orange-400/50 bg-orange-400/10">Pendiente</Badge>;
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPaymentImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0);
      setPaymentImage(canvas.toDataURL('image/jpeg'));
      setShowCamera(false);
    }
  };

  const isFinalState = selectedPackage?.estado === 'cancelado' || selectedPackage?.estado === 'anulado_retornar';
  const canShowLiberationButtons = selectedPackage && !['llegado', 'entregado', 'entregado_novedad', 'cancelado', 'anulado_retornar'].includes(selectedPackage.estado);

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
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold">Mis Paquetes</h2>
          <p className="text-slate-400 text-sm">Tienes {myDeliveries.length} entregas activas</p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center py-20"><Loader2 className="h-10 w-10 animate-spin text-accent" /></div>
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
                  className={cn("bg-white/10 border-accent/20 cursor-pointer active:scale-[0.98] transition-all", pkg.alerta_no_contesta && "animate-pulse-yellow border-yellow-500/50")}
                  onClick={() => { setSelectedPackage(pkg); setNovedad(''); setNovedadError(false); setPendingAction(null); setIsDetailOpen(true); }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-accent/20 p-2 rounded-lg">
                          <Package className="h-5 w-5 text-accent" />
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-slate-400 font-bold">{pkg.empresas?.nombre}</span>
                            <Badge variant="outline" className="text-[9px] h-4 border-white/10 text-accent px-1 uppercase">{pkg.tipo}</Badge>
                          </div>
                          <span className="text-sm font-bold">Guía: {pkg.guia_numero}</span>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] text-slate-400 flex items-center gap-1"><MapPin className="h-2 w-2" /> {pkg.direccion}</span>
                            <span className="text-[10px] text-orange-400 flex items-center gap-1"><Clock className="h-2 w-2" /> {pkg.tiempo_recogida} min</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(pkg.estado)}
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
          setTimeout(() => {
            document.body.style.pointerEvents = 'auto';
          }, 300);
        }
      }}>
        <DialogContent className="bg-slate-900 border-white/10 text-white sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Info className="h-5 w-5 text-accent" /> Detalles del Paquete</DialogTitle></DialogHeader>
          
          {selectedPackage ? (
            <>
              <div className="space-y-6 py-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold">Guía: {selectedPackage.guia_numero}</h3>
                    <p className="text-xs text-slate-400">{isMounted ? new Date(selectedPackage.created_at).toLocaleDateString() : ''}</p>
                  </div>
                  {getStatusBadge(selectedPackage.estado)}
                </div>

                {!isFinalState && !pendingAction && (
                  <div className="flex flex-col gap-2">
                    <Button 
                      variant="outline" 
                      className={cn("h-12 w-full gap-2 border-yellow-500/50 hover:bg-transparent", selectedPackage.alerta_no_contesta ? "bg-yellow-600 text-white" : "text-yellow-500 hover:text-yellow-500")} 
                      onClick={toggleNoContesta} 
                      disabled={updatingStatus}
                    >
                      <MessageSquareOff className="w-5 h-5" /> {selectedPackage.alerta_no_contesta ? "Alerta Activada" : "Cliente no contesta"}
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-12 w-full gap-2 border-blue-500/50 text-blue-400 hover:bg-transparent hover:text-blue-400" 
                      onClick={() => { setIsPaymentChangeOpen(true); setIsDetailOpen(false); }} 
                      disabled={updatingStatus}
                    >
                      <RefreshCcw className="w-5 h-5" /> Reportar Cambio de Pago
                    </Button>
                    
                    {canShowLiberationButtons && (
                      <>
                        <Button 
                          variant="outline" 
                          className="h-12 w-full gap-2 border-orange-500/30 text-orange-400 hover:bg-transparent hover:text-orange-400" 
                          onClick={() => handleLiberateClick('Liberado por daño mecánico')}
                          disabled={updatingStatus}
                        >
                          <Wrench className="w-5 h-5" /> Daño Mecánico
                        </Button>
                        <Button 
                          variant="outline" 
                          className="h-12 w-full gap-2 border-indigo-500/30 text-indigo-400 hover:bg-transparent hover:text-indigo-400" 
                          onClick={() => handleLiberateClick('Liberado por reasignación consentida')}
                          disabled={updatingStatus}
                        >
                          <UserMinus className="w-5 h-5" /> Reasignación Consentida
                        </Button>
                      </>
                    )}
                  </div>
                )}

                <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-3">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-accent shrink-0" />
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Empresa Solicitante</p>
                      <p className="text-sm font-bold">{selectedPackage.empresas?.nombre}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                    <span className="text-[10px] text-slate-500 uppercase font-bold flex items-center gap-1"><DollarSign className="w-3 h-3" /> Valor</span>
                    <p className="text-lg font-bold text-accent">${selectedPackage.valor_pedido}</p>
                  </div>
                  <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                    <span className="text-[10px] text-slate-500 uppercase font-bold flex items-center gap-1"><CreditCard className="w-3 h-3" /> Pago</span>
                    <p className="text-sm font-medium capitalize">{selectedPackage.metodo_pago}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-accent shrink-0 mt-1" />
                    <div><p className="text-xs text-slate-500 font-bold uppercase">Dirección de Entrega</p><p className="text-sm">{selectedPackage.direccion}</p></div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-accent shrink-0" />
                    <div><p className="text-xs text-slate-500 font-bold uppercase">Teléfono Cliente</p><a href={`tel:${selectedPackage.telefono}`} className="text-sm font-bold text-accent underline">{selectedPackage.telefono}</a></div>
                  </div>
                  
                  {pendingAction && (
                    <div className="space-y-2 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                      <Label className={cn("text-xs font-bold uppercase flex items-center gap-1", novedadError ? "text-red-400" : "text-accent")}>
                        <AlertTriangle className="w-3 h-3" /> {pendingAction === 'cancelado' ? 'Motivo de No Ejecución' : 'Detalle de Novedad'}
                      </Label>
                      <Textarea 
                        placeholder="Escribe el motivo detallado aquí..." 
                        value={novedad} 
                        onChange={(e) => { setNovedad(e.target.value); if (e.target.value.trim()) setNovedadError(false); }} 
                        className={cn("bg-white/5 border text-white min-h-[100px] text-sm hover:bg-transparent", novedadError ? "border-red-500" : "border-accent/30")} 
                      />
                      <div className="flex gap-2 pt-1">
                        <Button variant="ghost" className="flex-1 text-slate-400" onClick={() => { setPendingAction(null); setNovedad(''); setNovedadError(false); }}>Cancelar</Button>
                        <Button 
                          className={cn("flex-1 font-bold", pendingAction === 'cancelado' ? "bg-red-600" : "bg-green-800")}
                          onClick={() => handleUpdateStatus(selectedPackage.id, pendingAction)}
                          disabled={updatingStatus}
                        >
                           Confirmar {pendingAction === 'cancelado' ? 'No Ejecutado' : 'Con Novedad'}
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {(isFinalState || selectedPackage.novedad) && !pendingAction && (
                    <div className="space-y-2 pt-2 bg-white/5 p-3 rounded-lg border border-white/10">
                      <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Historial de Novedad:</p>
                      <p className="text-sm italic text-slate-300">{selectedPackage.novedad || 'Sin novedades registradas.'}</p>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="flex flex-col gap-2 sm:flex-col pt-4 border-t border-white/5">
                {!isFinalState && !pendingAction && (
                  <>
                    {(selectedPackage?.estado === 'pendiente' || selectedPackage?.estado === 'pedido_listo') && !hasAchieved('camino_a_retirar') && (
                      <Button 
                        className="w-full bg-indigo-600 h-12 font-bold hover:bg-indigo-700" 
                        onClick={() => handleUpdateStatus(selectedPackage.id, 'camino_a_retirar')} 
                        disabled={updatingStatus}
                      >
                        {updatingStatus ? <Loader2 className="animate-spin mr-2" /> : <ArrowRightCircle className="mr-2 h-5 w-5" />}
                        Estoy en camino a retirar
                      </Button>
                    )}

                    {selectedPackage?.estado === 'camino_a_retirar' && !hasAchieved('paquete_retirado') && (
                      <Button 
                        className="w-full bg-cyan-600 h-12 font-bold hover:bg-cyan-700" 
                        onClick={() => handleUpdateStatus(selectedPackage.id, 'paquete_retirado')} 
                        disabled={updatingStatus}
                      >
                        {updatingStatus ? <Loader2 className="animate-spin mr-2" /> : <Package className="mr-2 h-5 w-5" />}
                        Paquete retirado de origen
                      </Button>
                    )}

                    {selectedPackage?.estado === 'paquete_retirado' && !hasAchieved('en_ruta') && (
                      <Button 
                        className="w-full bg-blue-600 h-12 font-bold hover:bg-blue-700" 
                        onClick={() => handleUpdateStatus(selectedPackage.id, 'en_ruta')} 
                        disabled={updatingStatus}
                      >
                        {updatingStatus ? <Loader2 className="animate-spin mr-2" /> : <Navigation className="mr-2 h-5 w-5" />}
                        En Transito a Destino
                      </Button>
                    )}
                    
                    {selectedPackage?.estado === 'en_ruta' && !hasAchieved('llegado') && (
                      <Button 
                        className="w-full bg-orange-600 h-12 font-bold hover:bg-orange-700" 
                        onClick={() => handleUpdateStatus(selectedPackage.id, 'llegado')} 
                        disabled={updatingStatus}
                      >
                        {updatingStatus ? <Loader2 className="animate-spin mr-2" /> : <MapPinned className="mr-2 h-5 w-5" />}
                        Paquete llego al Destino
                      </Button>
                    )}

                    {(selectedPackage?.estado === 'llegado' || selectedPackage?.estado === 'en_ruta') && (
                      <>
                        {!hasAchieved('entregado') && (
                          <Button 
                            className="w-full bg-green-600 h-12 font-bold hover:bg-green-700" 
                            onClick={() => handleUpdateStatus(selectedPackage!.id, 'entregado')} 
                            disabled={updatingStatus}
                          >
                            {updatingStatus ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
                            ENTREGADO CON EXITO
                          </Button>
                        )}
                        {!hasAchieved('entregado_novedad') && (
                          <Button 
                            className="w-full bg-green-800 h-12 font-bold hover:bg-green-900" 
                            onClick={() => setPendingAction('entregado_novedad')} 
                            disabled={updatingStatus}
                          >
                            {updatingStatus ? <Loader2 className="animate-spin mr-2" /> : <PackageCheck className="mr-2 h-5 w-5" />}
                            ENTREGADO CON NOVEDAD
                          </Button>
                        )}
                        {!hasAchieved('cancelado') && (
                          <Button 
                            className="w-full bg-red-600 h-12 font-bold hover:bg-red-700" 
                            onClick={() => setPendingAction('cancelado')} 
                            disabled={updatingStatus}
                          >
                            {updatingStatus ? <Loader2 className="animate-spin mr-2" /> : <UserX className="mr-2 h-5 w-5" />}
                            No ejecutado
                          </Button>
                        )}
                      </>
                    )}
                  </>
                )}
                
                {!pendingAction && (
                  <Button variant="ghost" onClick={() => setIsDetailOpen(false)} className="w-full h-12 text-slate-400 hover:bg-transparent">
                    Cerrar
                  </Button>
                )}
              </DialogFooter>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin mb-4" />
              <p>Cargando detalles...</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isPaymentChangeOpen} onOpenChange={(open) => {
        setIsPaymentChangeOpen(open);
        if (!open) {
          setTimeout(() => {
            document.body.style.pointerEvents = 'auto';
          }, 300);
        }
      }}>
        <DialogContent className="bg-slate-900 border-white/10 text-white sm:max-w-md">
          <DialogHeader><DialogTitle>Reportar Cambio de Pago</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nuevo Método de Pago</Label>
              <Select value={newPaymentMethod} onValueChange={setNewPaymentMethod}>
                <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent className="bg-slate-800 border-white/10 text-white">
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Evidencia de Pago</Label>
              {paymentImage ? (
                <div className="relative aspect-video rounded-lg overflow-hidden border border-white/10">
                  <img src={paymentImage} alt="Preview" className="w-full h-full object-contain" />
                  <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-6 w-6" onClick={() => setPaymentImage(null)}><X className="h-4 w-4" /></Button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Button variant="outline" className="w-full h-12 bg-white/5 border-white/10 gap-2 hover:bg-white/5" onClick={() => setShowCamera(true)}>
                    <Camera className="h-5 w-5" /> Usar Cámara
                  </Button>
                  <Button variant="outline" className="w-full h-12 bg-white/5 border-white/10 gap-2 hover:bg-white/5" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-5 w-5" /> Adjuntar Imagen
                  </Button>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="flex flex-col gap-2 sm:flex-col">
            <Button 
              className="w-full h-12 bg-accent text-primary font-bold hover:bg-accent" 
              onClick={submitPaymentChange} 
              disabled={updatingStatus || !paymentImage || !newPaymentMethod}
            >
              Confirmar Cambio
            </Button>
            <Button variant="ghost" className="w-full h-12 hover:bg-transparent" onClick={() => setIsPaymentChangeOpen(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isReleaseConfirmOpen} onOpenChange={(open) => {
        setIsReleaseConfirmOpen(open);
        if (!open) {
          setTimeout(() => {
            document.body.style.pointerEvents = 'auto';
          }, 300);
        }
      }}>
        <AlertDialogContent className="bg-slate-900 border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Confirmar Liberación</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              ¿Estás seguro de liberar este paquete? Motivo: <span className="text-accent font-bold">{pendingReleaseReason}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col gap-2 sm:flex-col">
            <AlertDialogAction 
              onClick={executeRelease}
              className="bg-red-600 hover:bg-red-700 text-white h-12 w-full"
            >
              Sí, liberar paquete
            </AlertDialogAction>
            <AlertDialogCancel 
              className="bg-white/5 border-white/10 text-white hover:bg-white/5 h-12 w-full"
            >
              Cancelar
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showCamera} onOpenChange={setShowCamera}>
        <DialogContent className="bg-slate-900 border-white/10 text-white sm:max-w-md">
          <DialogHeader><DialogTitle>Tomar Foto</DialogTitle></DialogHeader>
          <video ref={videoRef} className="w-full aspect-video rounded-md bg-black" autoPlay muted playsInline onCanPlay={() => videoRef.current?.play()} />
          <canvas ref={canvasRef} className="hidden" />
          <DialogFooter className="flex flex-col gap-2 sm:flex-col">
            <Button onClick={takePhoto} className="w-full h-12 bg-accent text-primary font-bold hover:bg-accent">Capturar</Button>
            <Button variant="ghost" className="w-full h-12 hover:bg-transparent" onClick={() => setShowCamera(false)}>Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <nav className="fixed bottom-6 left-6 right-6 h-16 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl flex items-center justify-around z-50 shadow-2xl overflow-hidden px-2">
        <button onClick={() => router.push('/dashboard/operator-portal')} className={cn("flex flex-col items-center justify-center gap-1 w-full h-full transition-all relative", pathname === '/dashboard/operator-portal' ? "text-accent" : "text-slate-400")}><Package className="h-5 w-5" /><span className="text-[10px] font-bold">Solicitudes</span>{pathname === '/dashboard/operator-portal' && <div className="absolute top-0 w-8 h-1 bg-accent rounded-b-full shadow-[0_0_10px_rgba(0,255,255,0.5)]" />}</button>
        <button onClick={() => router.push('/dashboard/operator-portal/my-packages')} className={cn("flex flex-col items-center justify-center gap-1 w-full h-full transition-all relative", pathname === '/dashboard/operator-portal/my-packages' ? "text-accent" : "text-slate-400")}><ClipboardCheck className="h-5 w-5" /><span className="text-[10px] font-bold">Mis Paquetes</span>{pathname === '/dashboard/operator-portal/my-packages' && <div className="absolute top-0 w-8 h-1 bg-accent rounded-b-full shadow-[0_0_10px_rgba(0,255,255,0.5)]" />}</button>
      </nav>
    </div>
  );
}
