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
  LayoutDashboard,
  ChevronLeft,
  ChevronRight
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
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

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

      // Ordenar por fecha (más recientes primero)
      const sorted = enriched.sort((a: any, b: any) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setAllTransfers(sorted);
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

  // Resetear a la primera página cuando cambie la búsqueda
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

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

  const correctTotal = filteredTransfers.reduce((acc, curr) => acc + Number(curr.subtotal_sector), 0);

  // Lógica de paginación local
  const totalItems = filteredTransfers.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedTransfers = filteredTransfers.slice(startIndex, endIndex);

  // Generador de rango de páginas con elipsis (...)
  const getPaginationRange = (current: number, total: number) => {
    const range: (number | string)[] = [];
    const delta = 1; // Páginas mostradas alrededor de la página actual

    for (let i = 1; i <= total; i++) {
      if (
        i === 1 || 
        i === total || 
        (i >= current - delta && i <= current + delta)
      ) {
        range.push(i);
      } else if (range[range.length - 1] !== '...') {
        range.push('...');
      }
    }
    return range;
  };

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
              <p className="text-[10px] text-slate-500 mt-1">Suma de entregados</p>
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
              <p className="font-medium">Sincronizando ...</p>
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
                    <TableHead className="text-right text-slate-300 font-bold">(Subtotal)</TableHead>
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

              {/* BARRA DE PAGINACIÓN */}
              <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/5 border-t border-white/5">
                {/* Selector "per page" */}
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <div className="relative">
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="appearance-none bg-slate-900 border border-white/10 text-white rounded px-3 py-1.5 pr-8 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent font-mono text-sm cursor-pointer hover:bg-white/10 transition-colors"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={40}>40</option>
                      <option value={100}>100</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                      </svg>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400">per page</span>
                </div>

                {/* Controles numéricos y flechas */}
                {totalPages > 1 && (
                  <div className="flex items-center border border-white/10 rounded-lg overflow-hidden bg-white/5 h-8">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 h-full text-slate-400 hover:bg-white/5 disabled:opacity-50 disabled:pointer-events-none transition-colors border-r border-white/10 flex items-center justify-center"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    {getPaginationRange(currentPage, totalPages).map((page, index) => {
                      if (page === '...') {
                        return (
                          <span
                            key={`ellipsis-${index}`}
                            className="px-3 h-full text-slate-500 border-r border-white/10 flex items-center justify-center select-none"
                          >
                            ...
                          </span>
                        );
                      }

                      return (
                        <button
                          key={`page-${page}`}
                          onClick={() => setCurrentPage(Number(page))}
                          className={cn(
                            "px-3 h-full text-sm border-r border-white/10 last:border-r-0 flex items-center justify-center transition-colors font-medium",
                            currentPage === page
                              ? "bg-white/10 text-accent font-bold"
                              : "text-slate-400 hover:bg-white/5 hover:text-white"
                          )}
                        >
                          {page}
                        </button>
                      );
                    })}

                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-3 h-full text-slate-400 hover:bg-white/5 disabled:opacity-50 disabled:pointer-events-none transition-colors flex items-center justify-center"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
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
