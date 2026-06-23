'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Wallet,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  CircleDollarSign,
  History,
  ExternalLink,
  Loader2,
  Calendar,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetDescription
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { getSignedComprobanteUrl } from '@/lib/storage-helpers';

interface BilleteraAdmin {
  perfil_id: string;
  rol: 'admin' | 'empresa' | 'operador';
  nombre: string;
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

export default function WalletsAdminPage() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [billeteras, setBilleteras] = useState<BilleteraAdmin[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('todos');
  
  // Detalle
  const [selectedWallet, setSelectedWallet] = useState<BilleteraAdmin | null>(null);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loadingMovs, setLoadingMovs] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
    fetchWallets();
  }, []);

  const fetchWallets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_get_todas_billeteras');
      if (error) throw error;
      setBilleteras(data || []);
    } catch (error: any) {
      console.error("Error fetching wallets:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los movimientos." });
    } finally {
      setLoading(false);
    }
  };

  const fetchMovimientos = async (perfilId: string) => {
    setLoadingMovs(true);
    try {
      const { data, error } = await supabase
        .from('billetera_movimientos')
        .select('*')
        .eq('perfil_id', perfilId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      setMovimientos(data || []);
    } catch (error) {
      console.error("Error fetching movements:", error);
    } finally {
      setLoadingMovs(false);
    }
  };

  const handleOpenDetail = (wallet: BilleteraAdmin) => {
    setSelectedWallet(wallet);
    setIsSheetOpen(true);
    fetchMovimientos(wallet.perfil_id);
  };

  const handleViewComprobante = async (path: string) => {
    if (!path) return;
    try {
      const url = await getSignedComprobanteUrl(path);
      window.open(url, '_blank');
    } catch (error) {
      console.error("Error loading signed URL:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo recuperar la imagen del comprobante."
      });
    }
  };

  const filteredWallets = billeteras.filter(w => {
    const matchSearch = w.nombre.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'todos' || w.rol === filter;
    return matchSearch && matchFilter;
  });

  const totals = billeteras.reduce((acc, curr) => {
    if (curr.rol === 'admin') {
      acc.adminCaja = curr.efectivo_caja;
    } else {
      acc.totalPorAcreditar += Number(curr.por_acreditar);
      acc.totalCashAcumulado += Number(curr.cash_acumulado);
    }
    return acc;
  }, { totalPorAcreditar: 0, totalCashAcumulado: 0, adminCaja: 0 });

  // Evitar errores de hidratación durante el renderizado inicial en el servidor
  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex text-white items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <>
      <header className="h-16 bg-white/5 border-b border-white/10 flex items-center justify-between px-8 shrink-0">
        <h2 className="text-xl font-bold text-white">Movimientos</h2>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            placeholder="Buscar por nombre..." 
            className="w-full bg-white/5 border border-white/10 rounded-md py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-accent text-white placeholder:text-slate-500" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4 text-red-400" /> Total por Acreditar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-black text-white">${totals.totalPorAcreditar.toFixed(2)}</p>
              <p className="text-[10px] text-slate-500 mt-1">Lo que la plataforma debe pagar en total</p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <ArrowDownLeft className="h-4 w-4 text-orange-400" /> Cash Acumulado Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-black text-white">${totals.totalCashAcumulado.toFixed(2)}</p>
              <p className="text-[10px] text-slate-500 mt-1">En manos de terceros a cobrar</p>
            </CardContent>
          </Card>

          <Card className="bg-accent/5 border-accent/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-accent uppercase tracking-wider flex items-center gap-2">
                <CircleDollarSign className="h-4 w-4" /> Efectivo en Caja (Admin)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-black text-accent">${totals.adminCaja.toFixed(2)}</p>
              <p className="text-[10px] text-slate-500 mt-1">Saldo líquido disponible en administración</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Tabs value={filter} onValueChange={setFilter} className="w-fit">
            <TabsList className="bg-white/5 border border-white/10">
              <TabsTrigger value="todos" className="data-[state=active]:bg-accent data-[state=active]:text-primary font-bold">Todos</TabsTrigger>
              <TabsTrigger value="empresa" className="data-[state=active]:bg-accent data-[state=active]:text-primary font-bold">Empresas</TabsTrigger>
              <TabsTrigger value="operador" className="data-[state=active]:bg-accent data-[state=active]:text-primary font-bold">Operadores</TabsTrigger>
            </TabsList>
          </Tabs>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Loader2 className="h-10 w-10 animate-spin mb-4" />
              <p>Analizando datos financieros...</p>
            </div>
          ) : filteredWallets.length === 0 ? (
            <div className="bg-white/5 rounded-xl border border-white/10 p-12 text-center">
              <Wallet className="h-12 w-12 text-slate-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold">No se encontraron billeteras</h3>
            </div>
          ) : (
            <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden shadow-2xl">
              <Table>
                <TableHeader className="bg-white/10">
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="font-bold text-slate-300">Nombre</TableHead>
                    <TableHead className="font-bold text-slate-300">Rol</TableHead>
                    <TableHead className="font-bold text-slate-300">Por Acreditar</TableHead>
                    <TableHead className="font-bold text-slate-300">Cash Acumulado</TableHead>
                    <TableHead className="font-bold text-slate-300">Saldo Efectivo</TableHead>
                    <TableHead className="text-right font-bold text-slate-300">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWallets.map((wallet) => (
                    <TableRow key={wallet.perfil_id} className="border-white/10 hover:bg-white/5 transition-colors">
                      <TableCell>
                        <span className="font-bold text-white">{wallet.nombre}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(
                          "capitalize font-bold text-[10px]",
                          wallet.rol === 'admin' ? "border-accent text-accent" : "border-slate-500 text-slate-400"
                        )}>
                          {wallet.rol}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          "font-mono font-black",
                          Number(wallet.por_acreditar) > 0 ? "text-red-400" : "text-slate-500"
                        )}>
                          ${Number(wallet.por_acreditar).toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          "font-mono font-black",
                          Number(wallet.cash_acumulado) > 0 ? "text-orange-400" : "text-slate-500"
                        )}>
                          ${Number(wallet.cash_acumulado).toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-slate-400">
                          ${Number(wallet.saldo_efectivo).toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-accent hover:bg-accent/10 font-bold gap-2"
                          onClick={() => handleOpenDetail(wallet)}
                        >
                          Ver detalle <ChevronRight className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* Detalle Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="bg-slate-900 border-white/10 text-white sm:max-w-2xl w-full p-0">
          {selectedWallet && (
            <div className="h-full flex flex-col">
              <SheetHeader className="p-6 border-b border-white/5 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <SheetTitle className="text-white text-2xl font-black">{selectedWallet.nombre}</SheetTitle>
                    <SheetDescription asChild>
                      <div className="text-slate-400 flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] uppercase border-accent text-accent">ID: {selectedWallet.perfil_id.substring(0,8)}</Badge>
                        <span>Movimientos</span>
                      </div>
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="p-6 grid grid-cols-2 gap-4 shrink-0 bg-black/20 border-b border-white/5">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-slate-500">Por Acreditar</p>
                  <p className="text-2xl font-black text-red-400">${Number(selectedWallet.por_acreditar).toFixed(2)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-slate-500">Cash Acumulado</p>
                  <p className="text-2xl font-black text-orange-400">${Number(selectedWallet.cash_acumulado).toFixed(2)}</p>
                </div>
                {selectedWallet.rol !== 'operador' && (
                  <>
                    <div className="space-y-1 border-t border-white/5 pt-3">
                      <p className="text-[10px] uppercase font-bold text-slate-500">Balance Digital App</p>
                      <p className="text-2xl font-black text-sky-400">${Number(selectedWallet.balance_digital_app ?? 0).toFixed(2)}</p>
                    </div>
                    <div className="space-y-1 border-t border-white/5 pt-3">
                      <p className="text-[10px] uppercase font-bold text-slate-500">Tasa Pendiente</p>
                      <p className="text-2xl font-black text-yellow-500">${Number(selectedWallet.tasa_pendiente ?? 0).toFixed(2)}</p>
                    </div>
                  </>
                )}
              </div>

              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="p-6 pb-2 flex items-center justify-between shrink-0">
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <History className="h-4 w-4 text-accent" /> Últimos Movimientos
                  </h4>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 text-[10px] font-bold border-accent/20 text-accent hover:bg-accent/10"
                    onClick={() => {
                      router.push(`/dashboard/settlement?perfil_id=${selectedWallet.perfil_id}`);
                    }}
                  >
                    IR A LIQUIDACIÓN
                  </Button>
                </div>

                <ScrollArea className="flex-1 px-6">
                  {loadingMovs ? (
                    <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>
                  ) : movimientos.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 text-sm">Sin movimientos registrados.</div>
                  ) : (
                    <div className="space-y-4 pb-8">
                      {movimientos.map((mov) => (
                        <div key={mov.id} className="bg-white/5 border border-white/5 rounded-lg p-3 space-y-2 group">
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <Badge className={cn(
                                "text-[9px] uppercase font-bold",
                                mov.tipo === 'paquete' ? "bg-blue-500/20 text-blue-400" :
                                mov.tipo === 'cobro' ? "bg-orange-500/20 text-orange-400" :
                                mov.tipo === 'pago' ? "bg-green-500/20 text-green-400" :
                                "bg-purple-500/20 text-purple-400"
                              )}>
                                {mov.tipo}
                              </Badge>
                              <p className="text-sm font-medium text-slate-200">{mov.descripcion}</p>
                            </div>
                            <div className="text-right">
                              <p className={cn(
                                "text-sm font-black",
                                Number(mov.monto) > 0 ? "text-emerald-400" : "text-red-400"
                              )}>
                                {Number(mov.monto) > 0 ? '+' : ''}{Number(mov.monto).toFixed(2)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-500">
                            <div className="flex items-center gap-2" suppressHydrationWarning>
                              <Calendar className="h-3 w-3" />
                              {new Date(mov.created_at).toLocaleString()}
                            </div>
                            {mov.comprobante_url && (
                              <button
                                onClick={() => handleViewComprobante(mov.comprobante_url!)}
                                className="text-accent hover:underline flex items-center gap-1 bg-transparent border-0 p-0 cursor-pointer"
                              >
                                Ver comprobante <ExternalLink className="h-2 w-2" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
