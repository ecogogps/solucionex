'use client';

import { useState, useEffect } from 'react';
import { 
  Package, Loader2, MapPin, Phone, CreditCard, 
  Save, RotateCcw, Printer, Calendar, Hash, DollarSign, PackageCheck, Trash2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  pkg: any | null; // Puedes exportar tu interface PaqueteData y usarla aquí
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void; // Función para recargar la lista en la página principal
}

export function ManagePackageModal({ pkg, isOpen, onClose, onSuccess }: ManagePackageModalProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const[isReturnAlertOpen, setIsReturnAlertOpen] = useState(false);
  
  const[editFormData, setEditFormData] = useState({
    direccion: '',
    telefono: '',
    metodo_pago: ''
  });

  const { toast } = useToast();

  // Sincronizar el formulario cuando el paquete cambia
  useEffect(() => {
    if (pkg) {
      setEditFormData({
        direccion: pkg.direccion,
        telefono: pkg.telefono || '',
        metodo_pago: pkg.metodo_pago
      });
    }
  }, [pkg]);

  // Asegurar que se libere el puntero al desmontar o cerrar
  useEffect(() => {
    if (!isOpen && !isDeleteDialogOpen && !isReturnAlertOpen) {
      setTimeout(() => { document.body.style.pointerEvents = 'auto'; }, 300);
    }
  }, [isOpen, isDeleteDialogOpen, isReturnAlertOpen]);

  if (!pkg) return null;

  const hasAchieved = (state: string) => pkg?.paquetes_historial?.some((h: any) => h.estado === state);
  const canEditDetails = !['llegado', 'entregado', 'entregado_novedad', 'cancelado', 'anulado_retornar', 'en_ruta', 'paquete_retirado'].includes(pkg.estado);
  const canRequestReturnToOrigin = !['entregado', 'entregado_novedad', 'anulado_retornar'].includes(pkg.estado) && !hasAchieved('anulado_retornar');
  const canShowPedidoListo = !['paquete_retirado', 'en_ruta', 'llegado', 'entregado', 'entregado_novedad', 'anulado_retornar'].includes(pkg.estado) && !hasAchieved('pedido_listo');

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
    metodo_pago: editFormData.metodo_pago
  }, "Los cambios se han guardado correctamente.");

  const handlePedidoListo = () => executeUpdate({ estado: 'pedido_listo' }, "El paquete ha sido marcado como 'Pedido listo'.");
  
  const confirmAnularPaquete = () => {
    setIsReturnAlertOpen(false);
    executeUpdate({ estado: 'anulado_retornar' }, "El estado se ha actualizado a 'Anulado - Retornar a origen'.");
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
      case 'paquete_retirado': return <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50">Retirado de origen</Badge>;
      case 'demorado_despacho': return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/50">Demorado Despacho</Badge>;
      case 'demorado_operador': return <Badge className="bg-red-600/20 text-red-300 border-red-600/50">Demorado Operador</Badge>;
      case 'cancelado': return <Badge className="bg-red-500/20 text-red-400 border-red-500/50">No ejecutado</Badge>;
      case 'anulado_retornar': return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50">Anulado - Retornar</Badge>;
      case 'buscando_operador': return <Badge variant="outline" className="text-accent border-accent/50">Buscando Operador</Badge>;
      default: return <Badge variant="outline" className="text-orange-400 border-orange-400/50">Pendiente</Badge>;
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-slate-900 border-white/10 text-white sm:max-w-xl w-[95vw] rounded-xl print:bg-white print:text-black print:border-none print:shadow-none print:max-w-none print:w-full print:p-0">
          <div className="print:hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white">
                <Package className="h-5 w-5 text-accent" /> Gestionar Paquete
              </DialogTitle>
              <p className="text-xs text-slate-400 font-normal">Información de la Guía: {pkg.guia_numero}</p>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-white/5 border border-white/10 rounded-lg">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-slate-500"><Calendar className="w-3 h-3" /> Registro</div>
                  <div className="text-sm font-medium">{new Date(pkg.created_at).toLocaleDateString()}</div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-slate-500"><Hash className="w-3 h-3" /> Estado Actual</div>
                  <div>{getStatusBadge(pkg.estado)}</div>
                </div>
                <div className="space-y-2 sm:col-span-2 pt-2 border-t border-white/5">
                  <div className="flex items-center gap-2 text-xs text-slate-500"><DollarSign className="w-3 h-3" /> Valor Total</div>
                  <div className="text-2xl font-black text-accent">${pkg.valor_pedido}</div>
                </div>
              </div>

              {!canRequestReturnToOrigin && !canEditDetails ? (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-xs text-red-400 font-medium">Este paquete no puede ser editado ni retornado a origen.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {canEditDetails ? (
                    <>
                      <div className="space-y-2">
                        <Label className="text-slate-400 flex items-center gap-2"><MapPin className="h-3 w-3" /> Dirección de Entrega</Label>
                        <Input value={editFormData.direccion} onChange={(e) => setEditFormData({...editFormData, direccion: e.target.value})} className="bg-white/5 border-white/10 focus-visible:ring-accent text-white" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-slate-400 flex items-center gap-2"><Phone className="h-3 w-3" /> Teléfono</Label>
                          <Input value={editFormData.telefono} onChange={(e) => setEditFormData({...editFormData, telefono: e.target.value})} className="bg-white/5 border-white/10 focus-visible:ring-accent text-white" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-400 flex items-center gap-2"><CreditCard className="h-3 w-3" /> Pago</Label>
                          <Select value={editFormData.metodo_pago} onValueChange={(v) => setEditFormData({...editFormData, metodo_pago: v})}>
                            <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-slate-800 border-white/10 text-white">
                              <SelectItem value="transferencia">Transferencia</SelectItem>
                              <SelectItem value="efectivo">Efectivo</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
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
                <Button onClick={() => window.print()} variant="outline" className="w-full h-11 border-accent/50 text-accent hover:bg-accent/10 hover:text-accent shadow-none"><Printer className="h-4 w-4 mr-2" /> Imprimir</Button>
                {canShowPedidoListo && <Button onClick={handlePedidoListo} className="w-full h-11 bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-none" disabled={isUpdating}>{isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <PackageCheck className="h-4 w-4 mr-2" />} Pedido listo</Button>}
                {canEditDetails && <Button onClick={handleUpdatePackage} className="w-full h-11 bg-accent text-primary font-bold hover:bg-accent/90 shadow-none" disabled={isUpdating}>{isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />} Guardar Cambios</Button>}
                {canRequestReturnToOrigin && <Button onClick={() => setIsReturnAlertOpen(true)} variant="outline" className="w-full h-11 border-orange-500/50 text-orange-400 hover:bg-orange-500/10 hover:text-orange-400 shadow-none" disabled={isUpdating}>{isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RotateCcw className="h-4 w-4 mr-2" />} Retornar a origen</Button>}
              </div>
              <div className="flex flex-col-reverse sm:flex-row gap-3 w-full justify-between items-center border-t border-white/5 pt-4">
                <Button onClick={() => setIsDeleteDialogOpen(true)} variant="destructive" className="w-full sm:w-auto h-11 font-bold bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-600 hover:text-white" disabled={isUpdating}><Trash2 className="h-4 w-4 mr-2" /> Eliminar Paquete</Button>
                <Button variant="ghost" onClick={onClose} className="w-full sm:w-auto h-11 text-slate-400 hover:bg-white/5 hover:text-white">Cerrar Ventana</Button>
              </div>
            </div>
          </div>
          <PrintTemplate data={pkg} />
        </DialogContent>
      </Dialog>

      {/* Modales de Alerta */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-slate-900 border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-500"><Trash2 className="h-5 w-5" /> Confirmar Eliminación</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400 text-sm">¿Estás seguro de que deseas ELIMINAR este paquete de forma definitiva?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-white h-11">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmEliminarPaquete} className="bg-red-600 hover:bg-red-700 text-white font-bold h-11">Sí, eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isReturnAlertOpen} onOpenChange={setIsReturnAlertOpen}>
        <AlertDialogContent className="bg-slate-900 border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-orange-400"><RotateCcw className="h-5 w-5" /> Retornar a Origen</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400 text-sm">¿Estás seguro de solicitar el retorno a origen para este pedido?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-white h-11">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAnularPaquete} className="bg-orange-600 hover:bg-orange-700 text-white font-bold h-11">Sí, retornar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
