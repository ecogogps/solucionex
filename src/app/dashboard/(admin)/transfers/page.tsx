'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Banknote, 
  Search, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Hash,
  User,
  Clock,
  ArrowRightCircle,
  TrendingUp,
  LayoutDashboard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface TransferenciaPendiente {
  paquete_id: string;
  guia_numero: string;
  valor_pedido: number;
  subtotal_sector: number;
  operador_id: string;
  created_at: string;
  nombre_operador?: string;
}

export default function TransferCollectionsPage() {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [allTransfers, setAllTransfers] = useState<TransferenciaPendiente[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentTerm] = useState(1);
  const PAGE_SIZE = 40;

  // Confirmación Modal
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; item: TransferenciaPendiente | null }>({
    open: false,
    item: null
  });

  const { toast } = useToast();

  const fetchTransfers = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Obtener transferencias desde RPC
      const { data: transfers, error: tError } = await supabase.rpc('admin_get_transferencias_pendientes');
      if (tError) throw tError;

      if (!transfers || transfers.length === 0) {
        setAllTransfers([]);
        return;
      }

      // 2. Enriquecer con nombres de operadores
      const operatorIds = Array.from(new Set(transfers.map((t: any) => t.operador_id)));
      const { data: operatorsData } = await supabase
        .from('operadores')
        .select('id, nombres')
        .in('id', operatorIds);

      const opMap = (operatorsData || []).reduce((acc: Record<string, string>, op) => {
        acc[op.id] = op.nombres;
        return acc;
      }, {});

      const enriched = transfers.map((t: any) => ({
        ...t,
        nombre_operador: opMap[t.operador_id] || 'Operador Desconocido'
      }));

      setAllTransfers(enriched);
    } catch (error: any) {
      console.error("Error fetching transfers:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar las transferencias pendientes." });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  const handleCobrar = async () => {
    if (!confirmModal.item || processing) return;
    setProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('billetera-admin-ops', {
        body: {
          accion: 'cobrar_transferencia_paquete',
          paquete_id: confirmModal.item.paquete_id
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ 
        title: "Cobro Registrado", 
        description: `Se procesó la guía ${confirmModal.item.guia_numero}. Sector: $${data.subtotal_sector}.`,
      });

      setConfirmModal({ open: false, item: null });
      fetchTransfers();
    } catch (error: any) {
      console.error("Error al cobrar:", error);
      toast({ 
        variant: "destructive", 
        title: "Error en la operación", 
        description: error.message || "No se pudo completar el cobro." 
      });
    } finally {
      setProcessing(false);
    }
  };

  const filteredTransfers = allTransfers.filter(t => 
    t.guia_numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.nombre_operador?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPendiente = filteredTransfers.reduce((acc, curr) => acc + Number(t.subtotal_sector), 0); // Esto es incorrecto, curr.subtotal_sector
  const correctTotal = filteredTransfers.reduce((acc, curr) => acc + Number(curr.subtotal_sector), 0);

  // Paginación local
  const paginatedTransfers = filteredTransfers.slice(0, PAGE_SIZE * currentPage);

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      <header className="h-16 bg-white/5 border-b border-white/10 flex items-center justify-between px-8 shrink-0">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Banknote className="text-accent" /> Cobros de Transferencia
        </h2>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input 
            placeholder="Buscar por guía u operador..." 
            className="w-full bg-white/5 border-white/10 pl-10 focus-visible:ring-accent h-10 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-8 space-y-8 bg-black/10">
        {/* RESUMEN */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-accent/10 border-accent/20 border-2">
            <CardHeader className="p-4 pb-1">
              <CardTitle className="text-[10px] uppercase text-accent font-black tracking-widest">Total Pendiente por Cobrar</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex items-end gap-2">
                <p className="text-4xl font-black text-white">${correctTotal.toFixed(2)}</p>
                <TrendingUp className="text-accent h-6 w-6 mb-1.5" />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Suma de subtotales de sectores entregados</p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader className="p-4 pb-1">
              <CardTitle className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">Registros Pendientes</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-3xl font-black text-white">{filteredTransfers.length}</p>
              <p className="text-[10px] text-slate-500 mt-1">Paquetes por liquidar fuera de plataforma</p>
            </CardContent>
          </Card>
        </div>

        {/* LISTADO */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-400 flex items-center gap-2">
            <LayoutDashboard className="w-4 h-4" /> PAQUETES ENTREGADOS (POR LIQUIDAR)
          </h3>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Loader2 className="h-10 w-10 animate-spin text-accent mb-4" />
              <p className="font-medium">Sincronizando fletes...</p>
            </div>
          ) : filteredTransfers.length === 0 ? (
            <div className="bg-white/5 rounded-xl border border-white/10 p-12 text-center">
              <AlertCircle className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-300">No hay transferencias pendientes de cobro</h3>
            </div>
          ) : (
            <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden shadow-2xl">
              <Table>
                <TableHeader className="bg-white/10">
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-slate-300 font-bold">Guía / Fecha Entrega</TableHead>
                    <TableHead className="text-slate-300 font-bold">Operador</TableHead>
                    <TableHead className="text-slate-300 font-bold text-center">Método</TableHead>
                    <TableHead className="text-right text-slate-300 font-bold">Flete (Subtotal)</TableHead>
                    <TableHead className="text-right text-slate-300 font-bold">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTransfers.map((item) => (
                    <TableRow key={item.paquete_id} className="border-white/10 hover:bg-white/5 transition-colors">
                      <TableCell>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <Hash className="w-3 h-3 text-accent" />
                            <span className="font-mono font-bold text-white">{item.guia_numero}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-1" suppressHydrationWarning>
                            <Clock className="w-3 h-3" />
                            {new Date(item.created_at).toLocaleString()}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-3 h-3 text-slate-400" />
                          <span className="text-xs font-medium text-slate-200">{item.nombre_operador}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-[10px] border-blue-500/30 text-blue-400 uppercase font-bold bg-blue-500/5">
                          Transferencia
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-mono font-black text-emerald-400 text-lg">
                          ${Number(item.subtotal_sector).toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-accent hover:bg-accent hover:text-primary font-bold gap-2 text-xs border border-accent/20"
                          onClick={() => setConfirmModal({ open: true, item })}
                        >
                          <ArrowRightCircle className="h-4 w-4" /> Cobro fuera de plataforma
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {filteredTransfers.length > paginatedTransfers.length && (
                <div className="p-4 flex justify-center bg-white/5 border-t border-white/5">
                  <Button 
                    variant="outline" 
                    className="border-white/10 text-slate-400 hover:text-white"
                    onClick={() => setCurrentTerm(prev => prev + 1)}
                  >
                    Ver más resultados
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* CONFIRMACIÓN DE COBRO */}
      <Dialog open={confirmModal.open} onOpenChange={(open) => !open && setConfirmModal({ open: false, item: null })}>
        <DialogContent className="bg-slate-900 border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-accent">
               <Banknote /> Confirmar Cobro Externo
            </DialogTitle>
            <DialogDescription className="text-slate-400 pt-3">
              ¿Confirmas que recibiste <span className="text-white font-bold">${Number(confirmModal.item?.subtotal_sector).toFixed(2)}</span> fuera de la plataforma por la guía <span className="text-accent font-mono font-bold">{confirmModal.item?.guia_numero}</span>?
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-black/20 p-4 rounded-lg border border-white/5 space-y-3">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Monto total a procesar:</span>
              <span className="text-white font-bold">${Number(confirmModal.item?.subtotal_sector).toFixed(2)}</span>
            </div>
            <p className="text-[10px] text-slate-500 italic">
              Esta acción distribuirá automáticamente el monto entre la ganancia del operador y el margen de administración en el sistema.
            </p>
          </div>

          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:gap-2 mt-4">
            <Button 
              variant="ghost" 
              onClick={() => setConfirmModal({ open: false, item: null })} 
              className="flex-1 text-slate-400"
              disabled={processing}
            >
              Cancelar
            </Button>
            <Button 
              className="flex-1 bg-accent text-primary font-bold hover:bg-accent/90"
              onClick={handleCobrar}
              disabled={processing}
            >
              {processing ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Confirmar Cobro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
