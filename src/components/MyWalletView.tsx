'use client';

import { useState, useEffect } from 'react';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  History, 
  ExternalLink, 
  Loader2, 
  Calendar,
  AlertCircle,
  CircleDollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { getSignedComprobanteUrl } from '@/lib/storage-helpers';

interface BilleteraInfo {
  perfil_id: string;
  rol: 'admin' | 'empresa' | 'operador';
  efectivo_caja: number;
  cash_acumulado: number;
  por_acreditar: number;
  balance_digital_app: number;
  saldo_efectivo: number;
  tasa_pendiente: number;
}

interface Movimiento {
  id: string;
  tipo: 'paquete' | 'cobro' | 'pago' | 'ajuste';
  descripcion: string;
  monto: number;
  comprobante_url?: string;
  created_at: string;
}

const LIMIT = 20;

export function MyWalletView({ rol }: { rol: 'empresa' | 'operador' }) {
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [wallet, setWallet] = useState<BilleteraInfo | null>(null);
  const [movements, setMovements] = useState<Movimiento[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const { toast } = useToast();

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // 1. Obtener mi billetera
      const { data: walletData, error: wError } = await supabase.rpc('get_mi_billetera');
      if (wError) throw wError;
      setWallet(walletData || null);

      // 2. Obtener movimientos iniciales
      const { data: movsData, error: mError } = await supabase.rpc('get_mis_movimientos', { 
        p_limit: LIMIT, 
        p_offset: 0 
      });
      if (mError) throw mError;
      
      setMovements(movsData || []);
      setHasMore((movsData || []).length === LIMIT);
    } catch (error: any) {
      console.error("Error fetching wallet data:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo sincronizar tu información financiera." });
    } finally {
      setLoading(false);
    }
  };

  const loadMoreMovements = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const newOffset = offset + LIMIT;
    
    try {
      const { data, error } = await supabase.rpc('get_mis_movimientos', { 
        p_limit: LIMIT, 
        p_offset: newOffset 
      });
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setMovements(prev => [...prev, ...data]);
        setOffset(newOffset);
        setHasMore(data.length === LIMIT);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error loading more movements:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleViewComprobante = async (path: string) => {
    try {
      const url = await getSignedComprobanteUrl(path);
      window.open(url, '_blank');
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo cargar el comprobante." });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Loader2 className="h-10 w-10 animate-spin text-accent mb-4" />
        <p className="font-medium">Sincronizando billetera...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Cards de Saldo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* POR ACREDITAR */}
        <Card className={cn(
          "bg-white/5 border-white/10 transition-all",
          Number(wallet?.por_acreditar || 0) > 0 && "border-red-500/30 bg-red-500/5 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
        )}>
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase text-slate-500 font-bold tracking-widest flex items-center gap-2">
              <ArrowUpRight className={cn("w-3 h-3", Number(wallet?.por_acreditar || 0) > 0 ? "text-red-400" : "text-slate-500")} />
              Por Acreditar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={cn(
              "text-3xl font-black",
              Number(wallet?.por_acreditar || 0) > 0 ? "text-red-400" : "text-white"
            )}>
              ${Number(wallet?.por_acreditar || 0).toFixed(2)}
            </p>
            <p className="text-[10px] text-slate-500 mt-1">Ganancia pendiente de pago</p>
          </CardContent>
        </Card>

        {/* CASH ACUMULADO */}
        <Card className={cn(
          "bg-white/5 border-white/10 transition-all",
          Number(wallet?.cash_acumulado || 0) > 0 && "border-orange-500/30 bg-orange-500/5 shadow-[0_0_15px_rgba(249,115,22,0.1)]"
        )}>
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase text-slate-500 font-bold tracking-widest flex items-center gap-2">
              <ArrowDownLeft className={cn("w-3 h-3", Number(wallet?.cash_acumulado || 0) > 0 ? "text-orange-400" : "text-slate-500")} />
              Cash Acumulado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={cn(
              "text-3xl font-black",
              Number(wallet?.cash_acumulado || 0) > 0 ? "text-orange-400" : "text-white"
            )}>
              ${Number(wallet?.cash_acumulado || 0).toFixed(2)}
            </p>
            <p className="text-[10px] text-slate-500 mt-1">
              {rol === 'empresa' ? 'Pendiente por cobrar (Efectivo)' : 'Efectivo en mano por entregar'}
            </p>
          </CardContent>
        </Card>

        {/* SALDO PAGADO */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase text-slate-500 font-bold tracking-widest flex items-center gap-2">
              <CircleDollarSign className="w-3 h-3 text-slate-500" />
              Saldo Pagado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-slate-400">
              ${Number(wallet?.saldo_efectivo || 0).toFixed(2)}
            </p>
            <p className="text-[10px] text-slate-500 mt-1">Total liquidado históricamente</p>
          </CardContent>
        </Card>

        {/* TASA PENDIENTE (Solo Empresa) */}
        {rol === 'empresa' && (
          <Card className={cn(
            "bg-white/5 border-white/10 transition-all",
            Number(wallet?.tasa_pendiente || 0) > 0 && "border-yellow-500/30 bg-yellow-500/5 shadow-[0_0_15px_rgba(234,179,8,0.1)]"
          )}>
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] uppercase text-slate-500 font-bold tracking-widest flex items-center gap-2">
                <AlertCircle className={cn("w-3 h-3", Number(wallet?.tasa_pendiente || 0) > 0 ? "text-yellow-400" : "text-slate-500")} />
                Tasa Pendiente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={cn(
                "text-3xl font-black",
                Number(wallet?.tasa_pendiente || 0) > 0 ? "text-yellow-400" : "text-white"
              )}>
                ${Number(wallet?.tasa_pendiente || 0).toFixed(2)}
              </p>
              <p className="text-[10px] text-slate-500 mt-1">Pendiente de cobro por Solucionex</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Mensaje Contextual */}
      <div className="space-y-2">
        {Number(wallet?.cash_acumulado || 0) > 0 && (
          <div className={cn(
            "p-4 rounded-xl border flex items-center gap-3",
            rol === 'empresa' 
              ? "bg-blue-500/10 border-blue-500/20 text-blue-300" 
              : "bg-orange-500/10 border-orange-500/20 text-orange-300"
          )}>
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium">
              {rol === 'empresa' 
                ? `Tienes $${Number(wallet?.cash_acumulado).toFixed(2)} pendientes por cobrar de tus operadores en efectivo.`
                : `Debes entregar $${Number(wallet?.cash_acumulado).toFixed(2)} en efectivo a tu empresa.`}
            </p>
          </div>
        )}
        {Number(wallet?.por_acreditar || 0) > 0 && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 p-4 rounded-xl flex items-center gap-3">
            <CircleDollarSign className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium">
              Solucionex te debe $${Number(wallet?.por_acreditar).toFixed(2)} por tus envíos completados.
            </p>
          </div>
        )}
      </div>

      {/* Historial de Movimientos */}
      <div className="space-y-4">
        <h3 className="text-lg font-black flex items-center gap-2">
          <History className="h-5 w-5 text-accent" /> Historial de Movimientos
        </h3>

        {movements.length === 0 ? (
          <div className="bg-white/5 rounded-xl border border-white/10 p-12 text-center">
            <History className="h-12 w-12 text-slate-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white">Aún no tienes movimientos</h3>
            <p className="text-slate-400 text-sm mt-1">Tus transacciones financieras aparecerán aquí.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {movements.map((mov) => (
              <div key={mov.id} className="bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:bg-white/10 transition-colors">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "p-2 rounded-lg shrink-0",
                    mov.tipo === 'paquete' ? "bg-blue-500/10" :
                    mov.tipo === 'cobro' ? "bg-orange-500/10" :
                    mov.tipo === 'pago' ? "bg-green-500/10" : "bg-purple-500/10"
                  )}>
                    <Badge variant="outline" className={cn(
                      "text-[9px] border-0 p-0 font-black tracking-tighter uppercase",
                      mov.tipo === 'paquete' ? "text-blue-400" :
                      mov.tipo === 'cobro' ? "text-orange-400" :
                      mov.tipo === 'pago' ? "text-green-400" : "text-purple-400"
                    )}>
                      {mov.tipo}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-200 leading-tight">{mov.descripcion}</p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500" suppressHydrationWarning>
                      <Calendar className="w-3 h-3" />
                      {new Date(mov.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-0 border-white/5 pt-3 sm:pt-0">
                  {mov.comprobante_url && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 text-[10px] gap-1.5 text-accent hover:bg-accent/10 font-bold"
                      onClick={() => handleViewComprobante(mov.comprobante_url!)}
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Comprobante
                    </Button>
                  )}
                  <p className={cn(
                    "font-mono font-black text-lg min-w-[80px] text-right",
                    Number(mov.monto) > 0 ? "text-emerald-400" : "text-red-400"
                  )}>
                    {Number(mov.monto) > 0 ? '+' : ''}{Number(mov.monto).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}

            {hasMore && (
              <Button 
                variant="outline" 
                className="w-full h-12 border-white/10 text-slate-400 hover:text-white hover:bg-white/5" 
                onClick={loadMoreMovements}
                disabled={loadingMore}
              >
                {loadingMore ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <History className="w-4 h-4 mr-2" />}
                Cargar más movimientos
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}