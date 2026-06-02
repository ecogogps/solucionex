'use client';

import { useState, useEffect } from 'react';
import { 
  Package, Loader2, MapPin, Phone, CreditCard, 
  Save, RotateCcw, Printer, Calendar, Hash, DollarSign, PackageCheck, Trash2, FileText, PhoneForwarded,
  MessageSquareOff, PhoneOff
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

  const { toast } = useToast();

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

  const handleActualizarTelefono = () => executeUpdate({
    telefono: editFormData.telefono,
    alerta_numero_equivocado: false
  }, "Teléfono actualizado y alerta resuelta.");
  
  const confirmAnularPaquete = () => {
    setIsReturnAlertOpen(false);
    executeUpdate({ estado: 'anulado_retornar', alerta_no_contesta: false, alerta_numero_equivocado: false }, "El estado se ha actualizado a 'Anulado - Retornar a origen'.");
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
                  <div className="text-sm font-medium">{new Date(pkg.created_at).toLocaleDateString()}</div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-slate-500"><Hash className="w-3 h-3 shrink-0" /> Estado Actual</div>
                  <div className="flex flex-wrap">{getStatusBadge(pkg.estado)}</div>
                </div>
                <div className="space-y-2 sm:col-span-2 pt-2 border-t border-white/5">
                  <div className="flex items-center gap-2 text-xs text-slate-500"><DollarSign className="w-3 h-3 shrink-0" /> Valor Total</div>
                  <div className="text-2xl font-black text-accent truncate">${pkg.valor_pedido}</div>
                </div>
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
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg space-y-3">
                  <div className="flex items-center gap-3 text-red-500">
                    <PhoneOff className="h-6 w-6 animate-pulse" />
                    <div>
                      <p className="text-sm font-bold">NÚMERO EQUIVOCADO</p>
                      <p className="text-[10px] opacity-80">El operador reportó que el número de teléfono es incorrecto.</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Input 
                      value={editFormData.telefono} 
                      onChange={(e) => setEditFormData({...editFormData, telefono: e.target.value})} 
                      className="bg-white/5 border-red-500/30 text-white flex-1"
                      placeholder="Nuevo teléfono..."
                    />
                    <Button 
                      onClick={handleActualizarTelefono} 
                      className="bg-red-600 hover:bg-red-700 text-white font-bold"
                      disabled={isUpdating}
                    >
                      Actualizar
                    </Button>
                  </div>
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

          {/* Modales de Alerta anidados dentro de DialogContent para evitar el bloqueo de pointer-events */}
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
