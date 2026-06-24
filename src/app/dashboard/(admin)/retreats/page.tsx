'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Landmark, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Upload, 
  X, 
  Search, 
  ExternalLink,
  AlertTriangle,
  ArrowRight,
  User,
  Calendar,
  DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { getSignedComprobanteUrl } from '@/lib/storage-helpers';

interface RequestData {
  id: string;
  perfil_id: string;
  monto: number;
  detalles: string;
  estado: 'pendiente' | 'aprobada' | 'negada';
  created_at: string;
  resolved_at?: string;
  resolved_by?: string;
  comprobante_url?: string;
  motivo_negacion?: string;
  perfiles?: { rol: string };
  nombre_solicitante?: string;
}

export default function RetreatsAdminPage() {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('pendiente');
  const [requests, setRequests] = useState<RequestData[]>([]);
  const [adminCaja, setAdminCaja] = useState(0);
  const [totalPendingAmount, setTotalPendingAmount] = useState(0);

  // Modales
  const [selectedRequest, setSelectedRequest] = useState<RequestData | null>(null);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isDenyOpen, setIsDenyOpen] = useState(false);
  
  // Forms
  const [denyReason, setDenyReason] = useState('');
  const [paymentImage, setPaymentImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Get admin wallet for caja check
      const { data: adminWallet } = await supabase.rpc('get_mi_billetera');
      setAdminCaja(Number(adminWallet?.efectivo_caja || 0));

      // 2. Get total pending sum
      const { data: pendingSum } = await supabase
        .from('retiro_solicitudes')
        .select('monto')
        .eq('estado', 'pendiente');
      
      const totalP = (pendingSum || []).reduce((acc, curr) => acc + Number(curr.monto), 0);
      setTotalPendingAmount(totalP);

      // 3. Get requests based on tab
      const { data, error } = await supabase
        .from('retiro_solicitudes')
        .select('*, perfiles(rol)')
        .eq('estado', activeTab)
        .order('created_at', { ascending: activeTab === 'pendiente' });

      if (error) throw error;

      // Enriquecer con nombres (Join manual para evitar complejidad de query recursiva)
      const enriched = await Promise.all((data || []).map(async (r) => {
        let nombre = 'Desconocido';
        if (r.perfiles?.rol === 'empresa') {
          const { data: emp } = await supabase.from('empresas').select('nombre').eq('id', r.perfil_id).single();
          nombre = emp?.nombre || nombre;
        } else if (r.perfiles?.rol === 'operador') {
          const { data: op } = await supabase.from('operadores').select('nombres').eq('id', r.perfil_id).single();
          nombre = op?.nombres || nombre;
        }
        return { ...r, nombre_solicitante: nombre };
      }));

      setRequests(enriched);
    } catch (error: any) {
      console.error("Error fetching retreats:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar las solicitudes." });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (accion: 'aprobar_retiro_solicitud' | 'negar_retiro_solicitud') => {
    if (!selectedRequest || processing) return;
    
    if (accion === 'aprobar_retiro_solicitud' && !paymentImage) {
      toast({ variant: "destructive", title: "Comprobante requerido", description: "Debes subir una evidencia del pago." });
      return;
    }

    if (accion === 'negar_retiro_solicitud' && !denyReason.trim()) {
      toast({ variant: "destructive", title: "Motivo requerido", description: "Debes indicar por qué se niega el retiro." });
      return;
    }

    setProcessing(true);
    try {
      let finalComprobanteUrl = null;

      if (paymentImage && accion === 'aprobar_retiro_solicitud') {
        const response = await fetch(paymentImage);
        const blob = await response.blob();
        const fileName = `${selectedRequest.perfil_id}/retiro-${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('comprobantes-billetera')
          .upload(fileName, blob);
        
        if (uploadError) throw uploadError;
        finalComprobanteUrl = fileName;
      }

      const { data, error } = await supabase.functions.invoke('billetera-admin-ops', {
        body: {
          accion,
          solicitud_id: selectedRequest.id,
          comprobante_url: finalComprobanteUrl,
          descripcion: accion === 'negar_retiro_solicitud' ? denyReason : `Retiro aprobado para ${selectedRequest.nombre_solicitante}`
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ 
        title: accion === 'aprobar_retiro_solicitud' ? "Retiro Aprobado" : "Retiro Negado", 
        description: "La operación se completó exitosamente." 
      });

      // Reset
      setIsApproveOpen(false);
      setIsDenyOpen(false);
      setPaymentImage(null);
      setDenyReason('');
      fetchData();
    } catch (error: any) {
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: error.message || "Ocurrió un error al procesar la solicitud." 
      });
    } finally {
      setProcessing(false);
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

  const handleViewComprobante = async (path: string) => {
    try {
      const url = await getSignedComprobanteUrl(path);
      window.open(url, '_blank');
    } catch {
      toast({ variant: "destructive", title: "Error", description: "No se pudo abrir el comprobante." });
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      <header className="h-16 bg-white/5 border-b border-white/10 flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-accent/10 p-2 rounded-lg">
            <Landmark className="h-5 w-5 text-accent" />
          </div>
          <h2 className="text-xl font-bold text-white">Solicitudes de Retiro</h2>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-8 space-y-8 bg-black/10">
        {/* SUMMARY CARD */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-accent/10 border-accent/20 border-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] uppercase text-accent font-black tracking-widest">Total por Aprobar</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-black text-white">${totalPendingAmount.toFixed(2)}</p>
              <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold">Monto acumulado de {requests.length} pendientes</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">Efectivo en Caja (Admin)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-white">${adminCaja.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="pendiente" className="data-[state=active]:bg-accent data-[state=active]:text-primary font-bold gap-2">
              <Clock className="h-4 w-4" /> Pendientes
            </TabsTrigger>
            <TabsTrigger value="aprobada" className="data-[state=active]:bg-accent data-[state=active]:text-primary font-bold gap-2">
              <CheckCircle2 className="h-4 w-4" /> Aprobadas
            </TabsTrigger>
            <TabsTrigger value="negada" className="data-[state=active]:bg-accent data-[state=active]:text-primary font-bold gap-2">
              <XCircle className="h-4 w-4" /> Negadas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pendiente">
            {loading ? (
              <div className="flex flex-col items-center py-20 text-slate-400">
                <Loader2 className="h-10 w-10 animate-spin text-accent mb-4" />
                <p>Sincronizando solicitudes...</p>
              </div>
            ) : requests.length === 0 ? (
              <div className="bg-white/5 rounded-xl border border-white/10 p-20 text-center flex flex-col items-center">
                <CheckCircle2 className="h-12 w-12 text-slate-500 mb-4" />
                <h3 className="text-lg font-semibold text-white">¡Todo al día!</h3>
                <p className="text-slate-500 text-sm">No hay solicitudes de retiro pendientes de revisión.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {requests.map((req) => (
                  <Card key={req.id} className="bg-white/5 border-white/10 hover:border-accent/30 transition-all group overflow-hidden">
                    <div className="h-1 bg-accent/20 group-hover:bg-accent transition-colors" />
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <CardTitle className="text-base font-bold text-white leading-none">{req.nombre_solicitante}</CardTitle>
                          <Badge variant="outline" className="capitalize text-[10px] border-white/10 text-slate-400">
                            {req.perfiles?.rol}
                          </Badge>
                        </div>
                        <p className="text-2xl font-black text-accent">${Number(req.monto).toFixed(2)}</p>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                        <p className="text-[10px] uppercase text-slate-500 font-bold mb-1">Detalles de Transferencia</p>
                        <p className="text-xs text-slate-300 italic whitespace-pre-wrap">{req.detalles || 'Sin detalles proporcionados'}</p>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <Calendar className="h-3 w-3" /> {new Date(req.created_at).toLocaleString()}
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button 
                          variant="outline" 
                          className="flex-1 border-red-500/20 text-red-400 hover:bg-red-500/10 font-bold h-10"
                          onClick={() => { setSelectedRequest(req); setIsDenyOpen(true); }}
                        >
                          Negar
                        </Button>
                        <Button 
                          className="flex-1 bg-accent text-primary hover:bg-accent/90 font-bold h-10"
                          onClick={() => { setSelectedRequest(req); setIsApproveOpen(true); }}
                        >
                          Aprobar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="aprobada" className="space-y-4">
            <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden shadow-2xl">
              <Table>
                <TableHeader className="bg-white/10">
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="font-bold text-slate-300">Solicitante</TableHead>
                    <TableHead className="font-bold text-slate-300">Monto</TableHead>
                    <TableHead className="font-bold text-slate-300">Aprobado el</TableHead>
                    <TableHead className="text-right font-bold text-slate-300">Evidencia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((req) => (
                    <TableRow key={req.id} className="border-white/10 hover:bg-white/5">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-white">{req.nombre_solicitante}</span>
                          <span className="text-[10px] text-slate-500 uppercase">{req.perfiles?.rol}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono font-black text-emerald-400 text-lg">${Number(req.monto).toFixed(2)}</TableCell>
                      <TableCell className="text-xs text-slate-400">
                        {req.resolved_at ? new Date(req.resolved_at).toLocaleString() : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        {req.comprobante_url && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-9 w-9 text-accent hover:bg-accent/10"
                            onClick={() => handleViewComprobante(req.comprobante_url!)}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="negada">
            <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden shadow-2xl">
              <Table>
                <TableHeader className="bg-white/10">
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="font-bold text-slate-300">Solicitante</TableHead>
                    <TableHead className="font-bold text-slate-300">Monto</TableHead>
                    <TableHead className="font-bold text-slate-300">Motivo</TableHead>
                    <TableHead className="text-right font-bold text-slate-300">Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((req) => (
                    <TableRow key={req.id} className="border-white/10 hover:bg-white/5">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-white">{req.nombre_solicitante}</span>
                          <span className="text-[10px] text-slate-500 uppercase">{req.perfiles?.rol}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono font-black text-red-400">${Number(req.monto).toFixed(2)}</TableCell>
                      <TableCell className="max-w-xs truncate text-xs text-slate-400 italic">
                        {req.motivo_negacion}
                      </TableCell>
                      <TableCell className="text-right text-xs text-slate-500">
                        {req.resolved_at ? new Date(req.resolved_at).toLocaleDateString() : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* MODAL APROBAR */}
      <Dialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" /> Aprobar Solicitud de Retiro
            </DialogTitle>
            <DialogDescription className="text-slate-400 pt-2">
              Confirmarás el pago de <span className="text-white font-bold">${selectedRequest?.monto}</span> a <span className="text-white font-bold">{selectedRequest?.nombre_solicitante}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {adminCaja < Number(selectedRequest?.monto || 0) && (
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg flex items-center gap-3 text-red-400">
                <AlertTriangle className="h-6 w-6 shrink-0" />
                <p className="text-xs font-bold uppercase leading-tight">Efectivo en caja insuficiente (${adminCaja.toFixed(2)}) para cubrir este retiro.</p>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-[10px] text-slate-500 uppercase font-bold">Evidencia de Pago (Obligatorio)</Label>
              <div className="flex gap-2">
                {paymentImage ? (
                  <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/10 group bg-black/40">
                    <img src={paymentImage} alt="Comprobante" className="w-full h-full object-contain" />
                    <button 
                      onClick={() => setPaymentImage(null)}
                      className="absolute top-2 right-2 bg-red-500 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4 text-white" />
                    </button>
                  </div>
                ) : (
                  <Button 
                    variant="outline" 
                    className="w-full h-24 border-dashed border-white/20 bg-white/5 text-slate-400 hover:text-white flex-col gap-2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-6 w-6 text-accent" /> 
                    <span className="text-xs uppercase font-bold">Subir Comprobante</span>
                  </Button>
                )}
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col gap-2 sm:flex-row">
            <Button variant="ghost" onClick={() => setIsApproveOpen(false)} className="flex-1 text-slate-400">Cancelar</Button>
            <Button 
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 font-bold h-12"
              disabled={processing || !paymentImage || adminCaja < Number(selectedRequest?.monto || 0)}
              onClick={() => handleAction('aprobar_retiro_solicitud')}
            >
              {processing ? <Loader2 className="animate-spin w-4 h-4" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
              Aprobar y Pagar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL NEGAR */}
      <Dialog open={isDenyOpen} onOpenChange={setIsDenyOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-400 flex items-center gap-2">
              <XCircle className="h-5 w-5" /> Negar Solicitud de Retiro
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Motivo de la negación (Obligatorio)</Label>
              <Textarea 
                placeholder="Indica por qué se rechaza este retiro..." 
                className="bg-white/5 border-white/10 text-white min-h-[120px] focus-visible:ring-red-500"
                value={denyReason}
                onChange={(e) => setDenyReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row">
            <Button variant="ghost" onClick={() => setIsDenyOpen(false)} className="flex-1 text-slate-400">Cancelar</Button>
            <Button 
              variant="destructive" 
              className="flex-1 font-bold h-12 bg-red-600 hover:bg-red-700"
              disabled={processing || !denyReason.trim()}
              onClick={() => handleAction('negar_retiro_solicitud')}
            >
              {processing ? <Loader2 className="animate-spin w-4 h-4" /> : <XCircle className="mr-2 h-5 w-5" />}
              Confirmar Negación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
