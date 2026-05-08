'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Info, MessageSquareOff, RefreshCcw, Wrench, UserMinus, 
  Building2, DollarSign, CreditCard, Package, Clock, MapPin, 
  Phone, FileText, Image as ImageIcon, AlertTriangle, Loader2, 
  ArrowRightCircle, Navigation, MapPinned, CheckCircle2, 
  PackageCheck, UserX, Camera, X, Upload
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface PaqueteData {
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

interface OperatorPackageModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPackage: PaqueteData | null;
  userId: string | null;
  onUpdate: () => void;
  getStatusBadge: (status: string) => React.ReactNode;
}

export function OperatorPackageModal({ 
  isOpen, 
  onOpenChange, 
  selectedPackage, 
  userId, 
  onUpdate,
  getStatusBadge
}: OperatorPackageModalProps) {
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const[updatingStatus, setUpdatingStatus] = useState(false);

  // Estados de sub-modales y flujos
  const[isPaymentChangeOpen, setIsPaymentChangeOpen] = useState(false);
  const[newPaymentMethod, setNewPaymentMethod] = useState('');
  const [paymentImage, setPaymentImage] = useState<string | null>(null);
  const[showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isReleaseConfirmOpen, setIsReleaseConfirmOpen] = useState(false);
  const [pendingReleaseReason, setPendingReleaseReason] = useState('');

  const[novedad, setNovedad] = useState('');
  const [novedadError, setNovedadError] = useState(false);
  const [pendingAction, setPendingAction] = useState<'entregado_novedad' | 'cancelado' | null>(null);

  // Reset de estados al abrir/cambiar de paquete
  useEffect(() => {
    setIsMounted(true);
    if (isOpen) {
      setNovedad('');
      setNovedadError(false);
      setPendingAction(null);
      setIsPaymentChangeOpen(false);
      setIsReleaseConfirmOpen(false);
      setPendingReleaseReason('');
      setPaymentImage(null);
      setNewPaymentMethod('');
    }
  },[isOpen, selectedPackage]);

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
      const finalStates =['entregado', 'entregado_novedad', 'cancelado'];
      if (finalStates.includes(newStatus)) {
        onOpenChange(false);
      }
      if (userId) onUpdate();
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
      onOpenChange(false);
      if (userId) onUpdate();
    } catch (error: any) {
      console.error("Error al liberar paquete:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo liberar el paquete." });
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
      if (userId) onUpdate();
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
      if (userId) onUpdate();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setUpdatingStatus(false);
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

  // Convertidor de nota a listado de items
  const renderNota = (notaText?: string) => {
    if (!notaText) return null;
    
    const lines = notaText.split(/\r?\n/);
    
    // Si contiene guiones y está en la misma línea ej. "-arroz -pan -tomate"
    if (lines.length === 1 && notaText.includes('-')) {
      // Divide manteniendo el patrón de guiones que tienen espacio antes o están al principio
      const parts = notaText.split(/(?=(?:^|\s)-)/).map(p => p.trim()).filter(Boolean);
      
      if (parts.length > 1 && parts.some(p => p.startsWith('-'))) {
        return (
          <ul className="space-y-1 mt-1">
            {parts.map((p, i) => {
              const content = p.replace(/^-/, '').trim();
              if (!content) return null;
              
              return p.startsWith('-') ? (
                <li key={i} className="flex items-start gap-2 text-sm italic text-slate-300">
                  <span className="text-accent mt-[4px] text-[10px]">●</span>
                  <span>{content}</span>
                </li>
              ) : (
                <span key={i} className="block text-sm italic text-slate-300">{p}</span>
              );
            })}
          </ul>
        );
      }
    }

    // Default (Multilínea o texto normal)
    return (
      <div className="space-y-1 mt-1">
        {lines.map((line, i) => {
          const trimmedLine = line.trim();
          if (!trimmedLine) return null;
          
          const isListItem = trimmedLine.startsWith('-');
          const content = trimmedLine.replace(/^-/, '').trim();
          
          return isListItem ? (
            <div key={i} className="flex items-start gap-2 text-sm italic text-slate-300">
              <span className="text-accent mt-[4px] text-[10px]">●</span>
              <span>{content}</span>
            </div>
          ) : (
            <span key={i} className="block text-sm italic text-slate-300">{trimmedLine}</span>
          );
        })}
      </div>
    );
  };

  const isFinalState = selectedPackage?.estado === 'cancelado' || selectedPackage?.estado === 'anulado_retornar';
  const canShowLiberationButtons = selectedPackage && !['llegado_a_origen', 'paquete_retirado', 'llegado', 'entregado', 'entregado_novedad', 'cancelado', 'anulado_retornar'].includes(selectedPackage.estado);

  // WhatsApp Pre-filled message
  const getWhatsAppUrl = (pkg: PaqueteData) => {
    const phone = pkg.telefono.replace(/^0/, '').replace(/\D/g, '');
    const message = `Solucionex: ⚠️ Tienes un paquete por recibir de ➡️ ${pkg.empresas?.nombre || ''} 
------------------------------ 
INGRESE SU UBICACIÓN
📍GOOGLE MAPS📍 Para coordinar la entrega 

------------------------------ 
Total a pagar: ( ${pkg.metodo_pago} + ${pkg.valor_pedido} )

¡ YA ESTAMOS EN CAMINO !
⚡ Solucionex Delivery 
Respaldo y Seguridad en cada entrega.`;

    return `https://web.whatsapp.com/send?phone=593${phone}&text=${encodeURIComponent(message)}`;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="bg-slate-900 border-white/10 text-white sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Info className="h-5 w-5 text-accent" /> Detalles del Paquete</DialogTitle></DialogHeader>
          
          {selectedPackage ? (
            <>
              <div className="space-y-6 py-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold">Guía: {selectedPackage.guia_numero}</h3>
                      <span className="text-xs text-slate-400 font-mono uppercase bg-white/10 px-2 py-0.5 rounded-full border border-white/10">
                        #{selectedPackage.id.substring(0, 6)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{isMounted ? new Date(selectedPackage.created_at).toLocaleDateString() : ''}</p>
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
                      onClick={() => setIsPaymentChangeOpen(true)} 
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                    <span className="text-[10px] text-slate-500 uppercase font-bold flex items-center gap-1"><Package className="w-3 h-3" /> Tipo</span>
                    <p className="text-sm font-medium capitalize">{selectedPackage.tipo}</p>
                  </div>
                  <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                    <span className="text-[10px] text-slate-500 uppercase font-bold flex items-center gap-1"><Clock className="h-3 w-3" /> Recogida</span>
                    <p className="text-sm font-medium">{selectedPackage.tiempo_recogida} min</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-accent shrink-0 mt-1" />
                    <div><p className="text-xs text-slate-500 font-bold uppercase">Dirección de Entrega</p><p className="text-sm">{selectedPackage.direccion}</p></div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-accent shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs text-slate-500 font-bold uppercase">Teléfono Cliente</p>
                      <div className="flex items-center gap-2">
                        <a href={`tel:${selectedPackage.telefono}`} className="text-sm font-bold text-accent underline">{selectedPackage.telefono}</a>
                        <a 
                          href={getWhatsAppUrl(selectedPackage)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center justify-center bg-[#25D366] p-1.5 rounded-full hover:bg-[#128C7E] transition-colors"
                          title="Chat por WhatsApp"
                        >
                          <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current text-white">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                        </a>
                      </div>
                    </div>
                  </div>

                  {selectedPackage.nota && (
                    <div className="flex items-start gap-3">
                      <FileText className="h-4 w-4 text-accent shrink-0 mt-1" />
                      <div className="flex-1">
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Nota</p>
                        {renderNota(selectedPackage.nota)}
                      </div>
                    </div>
                  )}

                  {selectedPackage.imagen_url && (
                    <div className="mt-4 border border-white/10 rounded-lg p-3 bg-white/5">
                      <p className="text-xs text-slate-500 font-bold uppercase mb-2 flex items-center gap-1">
                        <ImageIcon className="w-4 h-4 text-accent" /> Imagen de Guía
                      </p>
                      <div className="relative rounded-lg overflow-hidden bg-black/50 flex justify-center">
                        <img 
                          src={selectedPackage.imagen_url} 
                          alt="Guía de paquete" 
                          className="max-h-56 w-auto object-contain rounded"
                        />
                      </div>
                    </div>
                  )}
                  
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
                      <Button className="w-full bg-indigo-600 h-12 font-bold hover:bg-indigo-700" onClick={() => handleUpdateStatus(selectedPackage.id, 'camino_a_retirar')} disabled={updatingStatus}>
                        {updatingStatus ? <Loader2 className="animate-spin mr-2" /> : <ArrowRightCircle className="mr-2 h-5 w-5" />} Estoy en camino a retirar
                      </Button>
                    )}

                    {(selectedPackage?.estado === 'camino_a_retirar' || (selectedPackage?.estado === 'pedido_listo' && hasAchieved('camino_a_retirar'))) && !hasAchieved('llegado_a_origen') && (
                      <Button className="w-full bg-amber-600 h-12 font-bold hover:bg-amber-700" onClick={() => handleUpdateStatus(selectedPackage.id, 'llegado_a_origen')} disabled={updatingStatus}>
                        {updatingStatus ? <Loader2 className="animate-spin mr-2" /> : <MapPin className="mr-2 h-5 w-5" />} Llegado a origen
                      </Button>
                    )}

                    {(selectedPackage?.estado === 'llegado_a_origen' || (selectedPackage?.estado === 'pedido_listo' && hasAchieved('llegado_a_origen'))) && !hasAchieved('paquete_retirado') && (
                      <Button className="w-full bg-cyan-600 h-12 font-bold hover:bg-cyan-700" onClick={() => handleUpdateStatus(selectedPackage.id, 'paquete_retirado')} disabled={updatingStatus}>
                        {updatingStatus ? <Loader2 className="animate-spin mr-2" /> : <Package className="mr-2 h-5 w-5" />} Paquete retirado de origen
                      </Button>
                    )}

                    {(selectedPackage?.estado === 'paquete_retirado' || (selectedPackage?.estado === 'pedido_listo' && hasAchieved('paquete_retirado'))) && !hasAchieved('en_ruta') && (
                      <Button className="w-full bg-blue-600 h-12 font-bold hover:bg-blue-700" onClick={() => handleUpdateStatus(selectedPackage.id, 'en_ruta')} disabled={updatingStatus}>
                        {updatingStatus ? <Loader2 className="animate-spin mr-2" /> : <Navigation className="mr-2 h-5 w-5" />} En Transito a Destino
                      </Button>
                    )}
                    
                    {selectedPackage?.estado === 'en_ruta' && !hasAchieved('llegado') && (
                      <Button className="w-full bg-orange-600 h-12 font-bold hover:bg-orange-700" onClick={() => handleUpdateStatus(selectedPackage.id, 'llegado')} disabled={updatingStatus}>
                        {updatingStatus ? <Loader2 className="animate-spin mr-2" /> : <MapPinned className="mr-2 h-5 w-5" />} Paquete llego al Destino
                      </Button>
                    )}

                    {(selectedPackage?.estado === 'llegado' || selectedPackage?.estado === 'en_ruta') && (
                      <>
                        {!hasAchieved('entregado') && (
                          <Button className="w-full bg-green-600 h-12 font-bold hover:bg-green-700" onClick={() => handleUpdateStatus(selectedPackage!.id, 'entregado')} disabled={updatingStatus}>
                            {updatingStatus ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2 h-5 w-5" />} ENTREGADO CON EXITO
                          </Button>
                        )}
                        {!hasAchieved('entregado_novedad') && (
                          <Button className="w-full bg-green-800 h-12 font-bold hover:bg-green-900" onClick={() => setPendingAction('entregado_novedad')} disabled={updatingStatus}>
                            {updatingStatus ? <Loader2 className="animate-spin mr-2" /> : <PackageCheck className="mr-2 h-5 w-5" />} ENTREGADO CON NOVEDAD
                          </Button>
                        )}
                        {!hasAchieved('cancelado') && (
                          <Button className="w-full bg-red-600 h-12 font-bold hover:bg-red-700" onClick={() => setPendingAction('cancelado')} disabled={updatingStatus}>
                            {updatingStatus ? <Loader2 className="animate-spin mr-2" /> : <UserX className="mr-2 h-5 w-5" />} No ejecutado
                          </Button>
                        )}
                      </>
                    )}
                  </>
                )}
                
                {!pendingAction && (
                  <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full h-12 text-slate-400 hover:bg-transparent">
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

      {/* MODAL REPORTE CAMBIO PAGO */}
      <Dialog open={isPaymentChangeOpen} onOpenChange={(open) => {
        setIsPaymentChangeOpen(open);
        if (!open) setTimeout(() => document.body.style.pointerEvents = 'auto', 300);
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
                  <Button variant="outline" className="w-full h-12 bg-white/5 border-white/10 gap-2 hover:bg-white/5" onClick={() => setShowCamera(true)}><Camera className="h-5 w-5" /> Usar Cámara</Button>
                  <Button variant="outline" className="w-full h-12 bg-white/5 border-white/10 gap-2 hover:bg-white/5" onClick={() => fileInputRef.current?.click()}><Upload className="h-5 w-5" /> Adjuntar Imagen</Button>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="flex flex-col gap-2 sm:flex-col">
            <Button className="w-full h-12 bg-accent text-primary font-bold hover:bg-accent" onClick={submitPaymentChange} disabled={updatingStatus || !paymentImage || !newPaymentMethod}>Confirmar Cambio</Button>
            <Button variant="ghost" className="w-full h-12 hover:bg-transparent" onClick={() => setIsPaymentChangeOpen(false)}>Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRMACIÓN DE LIBERACIÓN */}
      <AlertDialog open={isReleaseConfirmOpen} onOpenChange={(open) => {
        setIsReleaseConfirmOpen(open);
        if (!open) setTimeout(() => document.body.style.pointerEvents = 'auto', 300);
      }}>
        <AlertDialogContent className="bg-slate-900 border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Confirmar Liberación</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              ¿Estás seguro de liberar este paquete? Motivo: <span className="text-accent font-bold">{pendingReleaseReason}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col gap-2 sm:flex-col">
            <AlertDialogAction onClick={executeRelease} className="bg-red-600 hover:bg-red-700 text-white h-12 w-full">Sí, liberar paquete</AlertDialogAction>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/5 h-12 w-full">Cancelar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* MODAL DE CÁMARA */}
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
    </>
  );
}
