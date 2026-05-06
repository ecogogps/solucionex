'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Package, 
  Truck, 
  LogOut, 
  PlusCircle, 
  Loader2,
  MapPin,
  Edit2,
  Phone,
  CreditCard,
  Save,
  RotateCcw,
  Printer,
  Calendar,
  Hash,
  DollarSign,
  MessageSquareOff,
  RefreshCcw,
  ExternalLink,
  UserX,
  PackageCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { PrintTemplate } from '@/components/PrintTemplate';

interface PaqueteData {
  id: string;
  guia_numero: string;
  tipo: string;
  estado: string;
  direccion: string;
  telefono: string;
  valor_pedido: number;
  metodo_pago: string;
  created_at: string;
  nota?: string;
  novedad?: string;
  alerta_no_contesta?: boolean;
  alerta_cambio_pago?: boolean;
  imagen_pago_url?: string;
  empresas?: { nombre: string };
  operadores?: { nombres: string };
}

export default function BusinessPackagesPage() {
  const [fetchingPackages, setFetchingPackages] = useState(true);
  const [misPaquetes, setMisPaquetes] = useState<PaqueteData[]>([]);
  const [alertCount, setAlertCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  
  const [selectedPackage, setSelectedPackage] = useState<PaqueteData | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editFormData, setEditFormData] = useState({
    direccion: '',
    telefono: '',
    metodo_pago: ''
  });

  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUserId(session.user.id);
        fetchMisPaquetes(session.user.id);
      } else {
        router.push('/');
      }
    };
    getSession();
  }, [router]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('paquetes_empresa_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'paquetes', filter: `empresa_id=eq.${userId}` },
        () => fetchMisPaquetes(userId)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const fetchMisPaquetes = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from('paquetes')
        .select(`
          *,
          empresas (nombre),
          operadores (nombres)
        `)
        .eq('empresa_id', uid)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const packages = data || [];
      setMisPaquetes(packages);
      
      const count = packages.filter(p => p.alerta_no_contesta || p.alerta_cambio_pago).length;
      setAlertCount(count);

      if (selectedPackage) {
        const updated = packages.find(p => p.id === selectedPackage.id);
        if (updated) setSelectedPackage(updated);
      }

    } catch (error: any) {
      console.error("Error fetching packages:", error);
    } finally {
      setFetchingPackages(false);
    }
  };

  const handleOpenEdit = (pkg: PaqueteData) => {
    setSelectedPackage(pkg);
    setEditFormData({
      direccion: pkg.direccion,
      telefono: pkg.telefono || '',
      metodo_pago: pkg.metodo_pago
    });
    setIsEditModalOpen(true);
  };

  const handleUpdatePackage = async () => {
    if (!selectedPackage) return;
    
    const restrictedForEdits = ['llegado', 'entregado', 'entregado_novedad', 'cancelado', 'anulado_retornar', 'en_ruta', 'paquete_retirado'];
    if (restrictedForEdits.includes(selectedPackage.estado)) {
      toast({
        variant: "destructive",
        title: "Edición no permitida",
        description: "Los datos de contacto no pueden modificarse en el estado actual del paquete."
      });
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('paquetes')
        .update({
          direccion: editFormData.direccion,
          telefono: editFormData.telefono,
          metodo_pago: editFormData.metodo_pago
        })
        .eq('id', selectedPackage.id);

      if (error) throw error;

      toast({
        title: "Paquete actualizado",
        description: "Los cambios se han guardado correctamente."
      });
      
      setIsEditModalOpen(false);
      if (userId) fetchMisPaquetes(userId);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron guardar los cambios."
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePedidoListo = async () => {
    if (!selectedPackage) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('paquetes')
        .update({
          estado: 'pedido_listo'
        })
        .eq('id', selectedPackage.id);

      if (error) throw error;

      toast({
        title: "Estado actualizado",
        description: "El paquete ha sido marcado como 'Pedido listo'."
      });
      
      setIsEditModalOpen(false);
      if (userId) fetchMisPaquetes(userId);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar el estado."
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAnularPaquete = async () => {
    if (!selectedPackage) return;
    
    if (!confirm('¿Estás seguro de solicitar el retorno a origen para este pedido? Esta acción es irreversible.')) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('paquetes')
        .update({
          estado: 'anulado_retornar'
        })
        .eq('id', selectedPackage.id);

      if (error) throw error;

      toast({
        title: "Retorno a origen solicitado",
        description: "El estado se ha actualizado a 'Anulado - Retornar a origen'."
      });
      
      setIsEditModalOpen(false);
      if (userId) fetchMisPaquetes(userId);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo procesar la solicitud."
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePrint = () => {
    window.print();
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
      case 'buscando_operador': return <Badge variant="outline" className="text-accent border-accent/50">Buscando Operador</Badge>;
      default: return <Badge variant="outline" className="text-orange-400 border-orange-400/50">Pendiente</Badge>;
    }
  };

  const canEditDetails = (status: string) => {
    return !['llegado', 'entregado', 'entregado_novedad', 'cancelado', 'anulado_retornar', 'en_ruta', 'paquete_retirado'].includes(status);
  };

  const canRequestReturnToOrigin = (status: string) => {
    return !['entregado', 'entregado_novedad', 'anulado_retornar'].includes(status);
  };

  const canShowPedidoListo = (status: string) => {
    const afterRetirado = ['paquete_retirado', 'en_ruta', 'llegado', 'entregado', 'entregado_novedad', 'anulado_retornar'];
    return !afterRetirado.includes(status);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row text-white overflow-hidden print:bg-white print:text-black">
      <aside className="hidden lg:flex w-64 bg-black/20 border-r border-white/10 flex-col p-6 shadow-2xl print:hidden">
        <div className="flex items-center gap-3 mb-10">
          <Truck className="h-8 w-8 text-accent" />
          <span className="text-xl font-bold tracking-tight">Solucionex</span>
        </div>
        <nav className="flex-1 space-y-2">
          <Link href="/dashboard/business-portal">
            <Button variant="ghost" className="w-full justify-start gap-3 text-slate-400 hover:text-white hover:bg-white/5">
              <PlusCircle className="h-5 w-5" /> Nueva Solicitud
            </Button>
          </Link>
          <Link href="/dashboard/business-portal/packages" className="relative">
            <Button variant="ghost" className="w-full justify-start gap-3 bg-white/10 text-white">
              <Package className="h-5 w-5 text-accent" /> Mis Paquetes
            </Button>
            {alertCount > 0 && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 bg-red-500 text-white text-[10px] font-bold h-5 w-5 flex items-center justify-center rounded-full animate-bounce">
                {alertCount}
              </span>
            )}
          </Link>
        </nav>
        <Button variant="ghost" className="w-full justify-start gap-3 text-red-400" onClick={() => { supabase.auth.signOut(); router.push('/'); }}>
          <LogOut className="h-5 w-5" /> Cerrar Sesión
        </Button>
      </aside>

      <main className="flex-1 h-screen overflow-y-auto pb-24 lg:pb-8 print:hidden">
        <header className="lg:hidden flex items-center justify-between p-4 border-b border-white/10 bg-black/10 backdrop-blur-md sticky top-0 z-40">
          <div className="flex items-center gap-2"><Truck className="h-6 w-6 text-accent" /><span className="font-bold">Solucionex</span></div>
          <div className="text-xs font-medium text-slate-400 bg-white/5 px-3 py-1 rounded-full border border-white/10">Portal Empresa</div>
        </header>

        <div className="p-4 lg:p-8 flex justify-center">
          <div className="w-full max-w-2xl space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Mis Paquetes</h2>
              {alertCount > 0 && <Badge className="bg-red-500/20 text-red-400 border-red-500/50 animate-pulse">{alertCount} ALERTAS ACTIVAS</Badge>}
            </div>

            {fetchingPackages ? (
              <div className="flex flex-col items-center py-20"><Loader2 className="h-8 w-8 animate-spin text-accent mb-4" /><p className="text-slate-400">Cargando...</p></div>
            ) : misPaquetes.length === 0 ? (
              <div className="bg-white/5 rounded-xl border border-white/10 p-12 text-center"><Package className="h-12 w-12 text-slate-500 mx-auto mb-4" /><h3 className="text-lg font-semibold">Sin paquetes</h3></div>
            ) : (
              <div className="space-y-4">
                {misPaquetes.map((pkg) => (
                  <Card 
                    key={pkg.id} 
                    className={cn(
                      "bg-white/5 border-white/10 transition-all cursor-pointer group",
                      (pkg.alerta_no_contesta || pkg.alerta_cambio_pago) && "animate-pulse-yellow border-yellow-500/40"
                    )}
                    onClick={() => handleOpenEdit(pkg)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-white">Guía: {pkg.guia_numero}</p>
                          {getStatusBadge(pkg.estado)}
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-lg font-bold text-accent">${pkg.valor_pedido}</p>
                          <Edit2 className="h-4 w-4 text-slate-500" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs text-slate-400 flex items-center gap-1"><MapPin className="h-3 w-3" /> {pkg.direccion}</p>
                        
                        <div className="flex flex-wrap gap-2 pt-1">
                          {pkg.alerta_no_contesta && (
                            <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/50 text-[10px] gap-1">
                              <MessageSquareOff className="w-3 h-3" /> CLIENTE NO CONTESTA
                            </Badge>
                          )}
                          {pkg.alerta_cambio_pago && (
                            <div className="flex items-center gap-2">
                              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50 text-[10px] gap-1">
                                <RefreshCcw className="w-3 h-3" /> CAMBIO DE PAGO
                              </Badge>
                              {pkg.imagen_pago_url && (
                                <a 
                                  href={pkg.imagen_pago_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-[10px] text-accent flex items-center gap-1 hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ExternalLink className="w-3 h-3" /> Ver Comprobante
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {pkg.novedad && <p className="text-xs text-red-400 italic mt-2"><UserX className="inline h-3 w-3 mr-1" /> {pkg.novedad}</p>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-white sm:max-w-xl w-[95vw] rounded-xl print:bg-white print:text-black print:border-none print:shadow-none print:max-w-none print:w-full print:p-0">
          <div className="print:hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-accent" /> Gestionar Paquete
              </DialogTitle>
              <DialogTitle className="text-xs text-slate-400 font-normal">
                Información de la Guía: {selectedPackage?.guia_numero}
              </DialogTitle>
            </DialogHeader>

            {selectedPackage && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-white/5 border border-white/10 rounded-lg">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Calendar className="w-3 h-3" /> Registro
                    </div>
                    <div className="text-sm font-medium">{new Date(selectedPackage.created_at).toLocaleDateString()}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Hash className="w-3 h-3" /> Estado Actual
                    </div>
                    <div>{getStatusBadge(selectedPackage.estado)}</div>
                  </div>
                  <div className="space-y-2 sm:col-span-2 pt-2 border-t border-white/5">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <DollarSign className="w-3 h-3" /> Valor Total
                    </div>
                    <div className="text-2xl font-black text-accent">${selectedPackage.valor_pedido}</div>
                  </div>
                </div>

                {!canRequestReturnToOrigin(selectedPackage.estado) && !canEditDetails(selectedPackage.estado) ? (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-xs text-red-400 font-medium">
                      Este paquete no puede ser editado ni retornado a origen. Estado: <span className="font-bold uppercase">{selectedPackage.estado.replace('_', ' ')}</span>
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {canEditDetails(selectedPackage.estado) ? (
                      <>
                        <div className="space-y-2">
                          <Label className="text-slate-400 flex items-center gap-2">
                            <MapPin className="h-3 w-3" /> Dirección de Entrega
                          </Label>
                          <Input 
                            value={editFormData.direccion} 
                            onChange={(e) => setEditFormData({...editFormData, direccion: e.target.value})}
                            className="bg-white/5 border-white/10 focus-visible:ring-accent"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-slate-400 flex items-center gap-2">
                              <Phone className="h-3 w-3" /> Teléfono
                            </Label>
                            <Input 
                              value={editFormData.telefono} 
                              onChange={(e) => setEditFormData({...editFormData, telefono: e.target.value})}
                              className="bg-white/5 border-white/10 focus-visible:ring-accent"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-slate-400 flex items-center gap-2">
                              <CreditCard className="h-3 w-3" /> Pago
                            </Label>
                            <Select 
                              value={editFormData.metodo_pago} 
                              onValueChange={(v) => setEditFormData({...editFormData, metodo_pago: v})}
                            >
                              <SelectTrigger className="bg-white/5 border-white/10">
                                <SelectValue />
                              </SelectTrigger>
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
                        <p className="text-xs text-yellow-500 font-medium">
                          La edición de dirección y teléfono ya no está disponible, pero aún puedes solicitar el retorno a origen si lo requieres.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="flex flex-col sm:flex-row gap-3 border-t border-white/5 pt-4">
              <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full">
                <Button 
                  onClick={handlePrint} 
                  variant="outline"
                  className="flex-1 border-accent/50 text-accent h-12 hover:bg-transparent shadow-none"
                >
                  <Printer className="h-4 w-4 mr-2" /> Imprimir
                </Button>
                
                {selectedPackage && (
                  <>
                    {canShowPedidoListo(selectedPackage.estado) && (
                      <Button 
                        onClick={handlePedidoListo} 
                        className="flex-1 bg-emerald-600 text-white font-bold h-12 shadow-none hover:bg-emerald-700"
                        disabled={isUpdating}
                      >
                        {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <PackageCheck className="h-4 w-4 mr-2" />}
                        Pedido listo
                      </Button>
                    )}
                    {canEditDetails(selectedPackage.estado) && (
                      <Button 
                        onClick={handleUpdatePackage} 
                        className="flex-1 bg-accent text-primary font-bold h-12 shadow-none hover:bg-accent"
                        disabled={isUpdating}
                      >
                        {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        Guardar
                      </Button>
                    )}
                    {canRequestReturnToOrigin(selectedPackage.estado) && (
                      <Button 
                        onClick={handleAnularPaquete} 
                        variant="outline"
                        className="flex-1 border-red-500/50 text-red-400 h-12 hover:bg-transparent shadow-none"
                        disabled={isUpdating}
                      >
                        {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RotateCcw className="h-4 w-4 mr-2" />}
                        Retornar a origen
                      </Button>
                    )}
                  </>
                )}
              </div>
              <Button 
                variant="ghost" 
                onClick={() => setIsEditModalOpen(false)} 
                className="w-full sm:w-auto text-slate-400 hover:bg-transparent shadow-none px-4 h-12"
              >
                Cerrar
              </Button>
            </DialogFooter>
          </div>

          {selectedPackage && <PrintTemplate data={selectedPackage} />}
        </DialogContent>
      </Dialog>

      <nav className="fixed bottom-6 left-6 right-6 h-16 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl flex lg:hidden items-center justify-around z-50 shadow-2xl overflow-hidden px-2">
        <Link href="/dashboard/business-portal" className={cn("flex flex-col items-center justify-center gap-1 w-full h-full relative", pathname === '/dashboard/business-portal' ? "text-accent" : "text-slate-400")}>
          <PlusCircle className="h-5 w-5" /><span className="text-[10px] font-bold">Solicitud</span>
        </Link>
        <Link href="/dashboard/business-portal/packages" className={cn("flex flex-col items-center justify-center gap-1 w-full h-full relative", pathname === '/dashboard/business-portal/packages' ? "text-accent" : "text-slate-400")}>
          <Package className="h-5 w-5" /><span className="text-[10px] font-bold">Paquetes</span>
          {alertCount > 0 && <span className="absolute top-2 right-4 bg-red-500 text-white text-[8px] h-4 w-4 flex items-center justify-center rounded-full animate-bounce">{alertCount}</span>}
          {pathname === '/dashboard/business-portal/packages' && <div className="absolute top-0 w-8 h-1 bg-accent rounded-b-full shadow-[0_0_10px_rgba(0,255,255,0.5)]" />}
        </Link>
        <button onClick={() => { supabase.auth.signOut(); router.push('/'); }} className="flex flex-col items-center justify-center gap-1 w-full h-full text-red-400">
          <LogOut className="h-5 w-5" /><span className="text-[10px] font-bold">Salir</span>
        </button>
      </nav>
    </div>
  );
}
