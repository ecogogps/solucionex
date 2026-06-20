'use client';

import { useState, useEffect } from 'react';
import { 
  Package, Loader2, MapPin, Phone, CreditCard, 
  Save, RotateCcw, Printer, Calendar, Hash, DollarSign, PackageCheck, Trash2, FileText, PhoneForwarded,
  MessageSquareOff, Truck, Copy, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, 
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PrintTemplate } from '@/components/PrintTemplate';

// Interfaz para los props
interface ManagePackageModalProps {
  pkg: any | null; 
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void; 
}

export function ManagePackageModal({ pkg, isOpen, onClose, onSuccess }: ManagePackageModalProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isReturnAlertOpen, setIsReturnAlertOpen] = useState(false);
  
  const [editFormData, setEditFormData] = useState({
    direccion: '',
    telefono: '',
    metodo_pago: '',
    nota: ''
  });

  // Estado para controlar la retroalimentación visual al copiar
  const [copied, setCopied] = useState(false);

  const { toast } = useToast();

  // Función para copiar el PIN al portapapeles
  const handleCopyPin = () => {
    if (!pkg.pin_retiro) return;
    navigator.clipboard.writeText(pkg.pin_retiro);
    setCopied(true);
    toast({
      title: "PIN Copiado",
      description: "El PIN ha sido copiado."
    });
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (pkg) {
      setEditFormData({
        direccion: pkg.direccion,
        telefono: pkg.telefono || '',
        metodo_pago: pkg.metodo_pago,
        nota: pkg.nota || ''
      });
    }
  }, [pkg]);

  // Asegura la limpieza de los pointer-events en el body tras cerrar los submodales
  useEffect(() => {
    if (!isDeleteDialogOpen && !isReturnAlertOpen) {
      const timer = setTimeout(() => {
        document.body.style.pointerEvents = '';
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isDeleteDialogOpen, isReturnAlertOpen]);

  if (!pkg) return null;

  const hasAchieved = (state: string) => pkg?.paquetes_historial?.some((h: any) => h.estado === state);
  
  const canEditDetails = !['paquete_retirado', 'en_ruta', 'llegado', 'entregado', 'entregado_novedad', 'cancelado', 'anulado_retornar'].includes(pkg.estado);
  
  const canRequestReturnToOrigin = !['buscando_operador', 'entregado', 'entregado_novedad', 'anulado_retornar'].includes(pkg.estado) && !hasAchieved('anulado_retornar');
  
  const canShowPedidoListo = !['buscando_operador', 'paquete_retirado', 'en_ruta', 'llegado', 'entregado', 'entregado_novedad', 'anulado_retornar'].includes(pkg.estado) && !hasAchieved('pedido_listo');

  const executeUpdate = async (updateData: any, successMessage: string) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase.from('paquetes').update(updateData).eq('id', pkg.id);
      if (error) throw error;
      toast({ title: "Éxito", description: successMessage });
      onSuccess();
      onClose();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: "Hubo un problema con la operación." });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdatePackage = () => executeUpdate({
    direccion: editFormData.direccion,
    telefono: editFormData.telefono,
    metodo_pago: editFormData.metodo_pago,
    nota: editFormData.nota
  }, "Los cambios se han guardado correctamente.");

  const handlePedidoListo = () => executeUpdate({ estado: 'pedido_listo' }, "El paquete ha sido marcado como 'Pedido listo'.");

  const handleVuelvaALlamar = () => executeUpdate({ 
    alerta_no_contesta: false, 
    vuelve_a_llamar: true 
  }, "Alerta inactiva");

  const handleActualizarTelefonoAlerta = () => {
    executeUpdate({
      telefono: editFormData.telefono,
      alerta_numero_equivocado: false,
      alerta_numero_actualizado: true 
    }, "Teléfono actualizado. Se solicitó al operador que vuelva a llamar.");
  };
  const confirmAnularPaquete = () => {
    setIsReturnAlertOpen(false);
    executeUpdate({ estado: 'anulado_retornar', alerta_no_contesta: false }, "El estado se ha actualizado a 'Anulado - Retornar a origen'.");
  };

  const confirmEliminarPaquete = async () => {
    setIsDeleteDialogOpen(false);
    setIsUpdating(true);
    try {
      const { error } = await supabase.from('paquetes').delete().eq('id', pkg.id);
      if (error) throw error;
      toast({ title: "Paquete eliminado", description: "El paquete ha sido borrado del sistema." });
      onSuccess();
      onClose();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el paquete." });
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pedido_listo': return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50">PEDIDO LISTO</Badge>;
      case 'entregado': return <Badge className="bg-green-500/20 text-green-400 border-green-500/50">ENTREGADO CON EXITO</Badge>;
      case 'entregado_novedad': return <Badge className="bg-green-600/20 text-green-500 border-green-600/50">ENTREGADO CON NOVEDAD</Badge>;
      case 'llegado': return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/50">Llegó al Destino</Badge>;
      case 'en_ruta': return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">En Tránsito</Badge>;
      case 'camino_a_retirar': return <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/50">En camino a retirar</Badge>;
      case 'llegado_a_origen': return <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/50">Llegado a origen</Badge>;
      case 'paquete_retirado': return <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50">Retirado de origen</Badge>;
      case 'demorado_despacho': return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/50">Demorado Despacho</Badge>;
      case 'demorado_operador': return <Badge className="bg-red-600/20 text-red-300 border-red-600/50">Demorado Operador</Badge>;
      case 'no_listo': return <Badge className="bg-red-500/20 text-red-400 border-red-500/50">No listo</Badge>;
      case 'cancelado': return <Badge className="bg-red-500/20 text-red-400 border-red-500/50">No ejecutado</Badge>;
      case 'anulado_retornar': return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50">Anulado - Retornar</Badge>;
      case 'buscando_operador': return <Badge variant="outline" className="text-accent border-accent/50 text-center">Buscando Operador</Badge>;
      default: return <Badge variant="outline" className="text-orange-400 border-orange-400/50">Pendiente</Badge>;
    }
  };

  const formatTimeEcuador = (dateStr: string) => {
    return new Intl.DateTimeFormat('es-EC', {
      timeZone: 'America/Guayaquil',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(new Date(dateStr));
  };

  const getDuration = () => {
    const finalStates = ['entregado', 'entregado_novedad', 'cancelado'];
    if (!pkg || !finalStates.includes(pkg.estado)) return null;
    
    const finalRecord = pkg.paquetes_historial
      ?.filter((h: any) => finalStates.includes(h.estado))
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

    if (!finalRecord || !pkg.created_at) return null;

    const start = new Date(pkg.created_at).getTime();
    const end = new Date(finalRecord.created_at).getTime();
    const diffMs = end - start;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 0) return '0 min';
    if (diffMins < 60) return `${diffMins} min`;
    const hrs = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hrs}h ${mins}m`;
  };

  const formatDateEcuador = (dateStr: string) => {
    return new Intl.DateTimeFormat('es-EC', {
      timeZone: 'America/Guayaquil',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date(dateStr));
  };

  const getWhatsAppUrl = (pkgData: any) => {
    const phone = (pkgData.telefono || '').replace(/^0/, '').replace(/\D/g, '');
    const nombreEmpresa = (pkgData.empresas?.nombre || '').toUpperCase();
    const trackingLink = `https://solucionexdv.vercel.app/trazabilidad-cliente?guia=${pkgData.guia_numero}`;
    
    const message = `⚠️ Paquete por recibir de 
Origen ➡️ *${nombreEmpresa}*
------------------------------
*Conoce Información y el estado de tu paquete*
${trackingLink}
*Guía N°* ${pkgData.guia_numero}
*Hora de creación:* ${formatDateEcuador(pkgData.created_at)} ${formatTimeEcuador(pkgData.created_at)}
*A pagar:* ${pkgData.metodo_pago} | ${Number(pkgData.valor_pedido).toFixed(2)}
------------------------------
📲*Un operador se comunicara con usted para coordinar la entrega*
*🚚💨*

------------------------------
*Tmax sistema de entregas*
Respaldo y Seguridad en cada Transacción.`;

    // Al usar "whatsapp://send" directamente, el sistema operativo (Windows/macOS/móvil)
    // lanzará automáticamente la aplicación de escritorio instalada (WhatsApp o WhatsApp Business).
    const baseUrl = `whatsapp://send`;

    return `${baseUrl}?phone=593${phone}&text=${encodeURIComponent(message)}`;
  };

    // NUEVA FUNCIÓN PARA EL WHATSAPP DEL OPERADOR
    const getOperatorWhatsAppUrl = (pkgData: any) => {
      if (!pkgData?.operadores?.telefono) return '';
      const phone = pkgData.operadores.telefono.replace(/^0/, '').replace(/\D/g, '');
      const nombreEmpresa = pkgData.empresas?.nombre || '';
      const message = `Soy ${nombreEmpresa}`;
      return `whatsapp://send?phone=593${phone}&text=${encodeURIComponent(message)}`;
    };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-slate-900 border-white/10 text-white sm:max-w-xl w-[95vw] max-h-[90dvh] overflow-y-auto rounded-xl print:bg-white print:text-black print:border-none print:shadow-none print:max-w-none print:w-full print:p-0">
          <div className="print:hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white text-lg md:text-xl">
                <Package className="h-5 w-5 text-accent shrink-0" /> Gestionar Paquete
              </DialogTitle>
              <p className="text-xs text-slate-400 font-normal break-all">Información de la Guía: {pkg.guia_numero}</p>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-white/5 border border-white/10 rounded-lg">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-slate-500"><Calendar className="w-3 h-3 shrink-0" /> Registro</div>
                  <div className="text-sm font-medium flex flex-wrap items-center gap-2">
                    <span>{new Date(pkg.created_at).toLocaleDateString()} {formatTimeEcuador(pkg.created_at)}</span>
                    {getDuration() && (
                      <Badge variant="outline" className="text-[10px] border-accent/20 text-accent/80 font-bold px-1.5 h-5 bg-accent/5">
                        {getDuration()}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-slate-500"><Hash className="w-3 h-3 shrink-0" /> Estado Actual</div>
                  <div className="flex flex-wrap">{getStatusBadge(pkg.estado)}</div>
                </div>
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Phone className="w-3 h-3 shrink-0" /> Teléfono
                  </div>
                  <div className="text-sm font-medium flex items-center gap-2">
                    <span className="truncate">{pkg.telefono || 'No registrado'}</span>
                    {pkg.telefono && (
                      <a 
                        href={getWhatsAppUrl(pkg)}
                        className="flex items-center justify-center bg-[#25D366] p-1.5 rounded-full hover:bg-[#128C7E] transition-colors shrink-0"
                        title="Chat por WhatsApp"
                      >
                        <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current text-white">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                      </a>
                    )}
                  </div>
                </div>
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <div className="flex items-center gap-2 text-xs text-slate-500"><DollarSign className="w-3 h-3 shrink-0" /> Valor Total</div>
                  <div className="text-2xl font-black text-accent truncate">${pkg.valor_pedido}</div>
                </div>

                {/* Sección interactiva del PIN */}
                {pkg.pin_retiro && (
                  <div className="col-span-1 sm:col-span-2 pt-2 mt-2 border-t border-white/5 flex items-center justify-between bg-accent/5 p-2 rounded-lg">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">PIN</span>
                      <span className="text-lg font-mono font-black tracking-widest text-accent">{pkg.pin_retiro}</span>
                    </div>
                    <Button 
                      type="button"
                      variant="ghost" 
                      size="sm" 
                      onClick={handleCopyPin}
                      className="h-8 text-xs gap-1.5 border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white shrink-0"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-green-400" /> Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" /> 
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>

              {pkg.alerta_no_contesta && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3 text-yellow-500">
                    <MessageSquareOff className="h-6 w-6 animate-bounce" />
                    <div>
                      <p className="text-sm font-bold">CLIENTE NO CONTESTA</p>
                      <p className="text-[10px] opacity-80">El operador reportó problemas para contactar.</p>
                    </div>
                  </div>
                  <Button 
                    onClick={handleVuelvaALlamar} 
                    className="w-full sm:w-auto bg-yellow-600 hover:bg-yellow-700 text-white font-bold gap-2 text-xs"
                    disabled={isUpdating}
                  >
                    <PhoneForwarded className="h-3.5 w-3.5" /> Vuelva a llamar
                  </Button>
                </div>
              )}

              {pkg.alerta_numero_equivocado && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex flex-col gap-3">
                  <div className="flex items-center gap-3 text-red-400">
                    <Phone className="h-6 w-6 animate-bounce shrink-0" />
                    <div>
                      <p className="text-sm font-bold">NÚMERO EQUIVOCADO</p>
                      <p className="text-[10px] opacity-80">El operador reportó que el número de contacto es incorrecto. Por favor actualízalo.</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-end gap-2 w-full pt-1">
                    <div className="flex-1 w-full space-y-1">
                      <Label className="text-[10px] text-slate-400">Confirmar número correcto</Label>
                      <Input
                        value={editFormData.telefono}
                        onChange={(e) => setEditFormData({...editFormData, telefono: e.target.value})}
                        placeholder="Escribe el número correcto..."
                        className="bg-white/5 border-white/10 text-white h-9 focus-visible:ring-red-500"
                      />
                    </div>
                    <Button
                      onClick={handleActualizarTelefonoAlerta}
                      className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-bold gap-2 text-xs h-9 px-4 shrink-0"
                      disabled={isUpdating}
                    >
                      <Save className="h-3.5 w-3.5" /> Actualizar
                    </Button>
                  </div>
                </div>
              )}

              {/* TARJETA DE OPERADOR ASIGNADO Y BOTÓN WHATSAPP */}
              {pkg.operadores?.nombres && (
                <div className="p-4 bg-white/5 border border-white/10 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3 text-accent">
                    <Truck className="h-6 w-6" />
                    <div>
                      <p className="text-sm font-bold text-white">OPERADOR ASIGNADO</p>
                      <p className="text-[10px] text-slate-400">{pkg.operadores.nombres}</p>
                    </div>
                  </div>
                  {pkg.operadores?.telefono && (
                    <Button 
                      className="w-full sm:w-auto bg-[#25D366] hover:bg-[#128C7E] text-white font-bold gap-2 text-xs h-10 px-4"
                      asChild
                    >
                      <a 
                        href={getOperatorWhatsAppUrl(pkg)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        ESCRIBIR AL OPERADOR
                      </a>
                    </Button>
                  )}
                </div>
              )}

              {!canRequestReturnToOrigin && !canEditDetails ? (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-xs text-red-400 font-medium">Este paquete no puede ser editado ni retornado a origen.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {canEditDetails ? (
                    <>
                      <div className="space-y-2">
                        <Label className="text-slate-400 flex items-center gap-2"><MapPin className="h-3 w-3 shrink-0" /> Dirección de Entrega</Label>
                        <Input value={editFormData.direccion} onChange={(e) => setEditFormData({...editFormData, direccion: e.target.value})} className="bg-white/5 border-white/10 focus-visible:ring-accent text-white" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-slate-400 flex items-center gap-2"><Phone className="h-3 w-3 shrink-0" /> Teléfono</Label>
                          <Input value={editFormData.telefono} onChange={(e) => setEditFormData({...editFormData, telefono: e.target.value})} className="bg-white/5 border-white/10 focus-visible:ring-accent text-white" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-400 flex items-center gap-2"><CreditCard className="h-3 w-3 shrink-0" /> Pago</Label>
                          <Select value={editFormData.metodo_pago} onValueChange={(v) => setEditFormData({...editFormData, metodo_pago: v})}>
                            <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-slate-800 border-white/10 text-white">
                              <SelectItem value="transferencia">Transferencia</SelectItem>
                              <SelectItem value="efectivo">Efectivo</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-400 flex items-center gap-2"><FileText className="h-3 w-3 shrink-0" /> Nota / Instrucciones</Label>
                        <Textarea 
                          value={editFormData.nota} 
                          onChange={(e) => setEditFormData({...editFormData, nota: e.target.value})} 
                          className="bg-white/5 border-white/10 focus-visible:ring-accent text-white min-h-[80px]" 
                          placeholder="Instrucciones adicionales..."
                        />
                      </div>
                    </>
                  ) : (
                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                      <p className="text-xs text-yellow-500 font-medium">La edición no está disponible, pero puedes solicitar el retorno a origen.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4 mt-2 pt-4 border-t border-white/10">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                <Button onClick={() => window.print()} variant="outline" className="w-full h-11 border-accent/50 text-accent hover:bg-accent/10 hover:text-accent shadow-none">
                  <Printer className="h-4 w-4 mr-2 shrink-0" /> <span className="truncate">Imprimir</span>
                </Button>
                {canShowPedidoListo && <Button onClick={handlePedidoListo} className="w-full h-11 bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-none" disabled={isUpdating}>{isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2 shrink-0" /> : <PackageCheck className="h-4 w-4 mr-2 shrink-0" />} <span className="truncate">Pedido listo</span></Button>}
                {canEditDetails && <Button onClick={handleUpdatePackage} className="w-full h-11 bg-accent text-primary font-bold hover:bg-accent/90 shadow-none" disabled={isUpdating}>{isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2 shrink-0" /> : <Save className="h-4 w-4 mr-2 shrink-0" />} <span className="truncate">Guardar Cambios</span></Button>}
                {canRequestReturnToOrigin && <Button onClick={() => setIsReturnAlertOpen(true)} variant="outline" className="w-full h-11 border-orange-500/50 text-orange-400 hover:bg-orange-500/10 hover:text-orange-400 shadow-none" disabled={isUpdating}>{isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2 shrink-0" /> : <RotateCcw className="h-4 w-4 mr-2 shrink-0" />} <span className="truncate">Retornar a origen</span></Button>}
              </div>
              <div className="flex flex-col-reverse sm:flex-row gap-3 w-full justify-between items-center border-t border-white/5 pt-4">
                <Button onClick={() => setIsDeleteDialogOpen(true)} variant="destructive" className="w-full sm:w-auto h-11 font-bold bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-600 hover:text-white" disabled={isUpdating}><Trash2 className="h-4 w-4 mr-2 shrink-0" /> <span className="truncate">Eliminar Paquete</span></Button>
                <Button variant="ghost" onClick={onClose} className="w-full sm:w-auto h-11 text-slate-400 hover:bg-white/5 hover:text-white">Cerrar Ventana</Button>
              </div>
            </div>
          </div>
          
          <PrintTemplate data={pkg} />

          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent className="bg-slate-900 border-white/10 text-white w-[90vw] max-w-md rounded-xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-red-500"><Trash2 className="h-5 w-5 shrink-0" /> Confirmar Eliminación</AlertDialogTitle>
                <AlertDialogDescription className="text-slate-400 text-sm">¿Estás seguro de que deseas ELIMINAR este paquete de forma definitiva?</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-2">
                <AlertDialogCancel className="bg-white/5 border-white/10 text-white h-11 mt-0">Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={confirmEliminarPaquete} className="bg-red-600 hover:bg-red-700 text-white font-bold h-11">Sí, eliminar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog open={isReturnAlertOpen} onOpenChange={setIsReturnAlertOpen}>
            <AlertDialogContent className="bg-slate-900 border-white/10 text-white w-[90vw] max-w-md rounded-xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-orange-400"><RotateCcw className="h-5 w-5 shrink-0" /> Retornar a Origen</AlertDialogTitle>
                <AlertDialogDescription className="text-slate-400 text-sm">¿Estás seguro de solicitar el retorno a origen para este pedido?</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-2">
                <AlertDialogCancel className="bg-white/5 border-white/10 text-white h-11 mt-0">Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={confirmAnularPaquete} className="bg-orange-600 hover:bg-orange-700 text-white font-bold h-11">Sí, retornar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DialogContent>
      </Dialog>
    </>
  );
}
