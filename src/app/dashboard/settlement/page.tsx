
'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  CircleDollarSign, 
  ArrowUpRight, 
  ArrowDownLeft, 
  History, 
  UserCircle, 
  Building2, 
  Truck, 
  Upload, 
  Camera, 
  X, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle,
  FileText,
  Plus,
  Minus,
  ExternalLink,
  Search,
  ChevronRight,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface BilleteraInfo {
  perfil_id: string;
  rol: string;
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
  tipo: string;
  descripcion: string;
  monto: number;
  comprobante_url?: string;
  created_at: string;
  perfil_id: string;
  perfiles?: { nombre?: string }; // Enriquecido localmente
}

function SettlementContent() {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [adminWallet, setAdminWallet] = useState<BilleteraInfo | null>(null);
  const [allWallets, setAllWallets] = useState<BilleteraInfo[]>([]);
  const [movements, setMovements] = useState<Movimiento[]>([]);
  
  // States para formularios
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [selectedProfile, setSelectedProfile] = useState<BilleteraInfo | null>(null);
  const [description, setDescription] = useState('');
  const [paymentImage, setPaymentImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ajuste Manual
  const [adjustAmount, setAjustAmount] = useState('');
  const [isAdjustConfirmOpen, setIsAdjustConfirmOpen] = useState(false);

  // Filtros Ledger
  const [ledgerFilter, setLedgerFilter] = useState('todos');
  const [ledgerSearch, setLedgerSearch] = useState('');

  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPerfilId = searchParams.get('perfil_id');
  const { toast } = useToast();

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (initialPerfilId && allWallets.length > 0) {
      setSelectedProfileId(initialPerfilId);
    }
  }, [initialPerfilId, allWallets]);

  useEffect(() => {
    const profile = allWallets.find(w => w.perfil_id === selectedProfileId);
    setSelectedProfile(profile || null);
  }, [selectedProfileId, allWallets]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // 1. Get all wallets status
      const { data: wallets, error: wError } = await supabase.rpc('admin_get_todas_billeteras');
      if (wError) throw wError;
      setAllWallets(wallets || []);
      
      const admin = wallets?.find((w: any) => w.rol === 'admin');
      setAdminWallet(admin || null);

      // 2. Get global movements
      const { data: movs, error: mError } = await supabase
        .from('billetera_movimientos')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (mError) throw mError;
      
      // Enriquecer nombres de movimientos
      const enrichedMovs = movs.map(m => {
        const wallet = wallets?.find((w: any) => w.perfil_id === m.perfil_id);
        return { ...m, nombre_perfil: wallet?.nombre || 'Desconocido' };
      });

      setMovements(enrichedMovs || []);
    } catch (error: any) {
      console.error("Error fetching settlement data:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo sincronizar la información financiera." });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (accion: string, extraData: any = {}) => {
    if (processing) return;
    setProcessing(true);

    try {
      let finalComprobanteUrl = null;

      // Upload image if present
      if (paymentImage) {
        const response = await fetch(paymentImage);
        const blob = await response.blob();
        const fileName = `comprobantes/pago-${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage.from('paquetes').upload(fileName, blob);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('paquetes').getPublicUrl(fileName);
        finalComprobanteUrl = publicUrl;
      }

      const payload = {
        accion,
        perfil_id: selectedProfileId || adminWallet?.perfil_id,
        descripcion: description,
        comprobante_url: finalComprobanteUrl,
        ...extraData
      };

      const { data, error } = await supabase.functions.invoke('billetera-admin-ops', {
        body: payload
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ 
        title: "Operación Exitosa", 
        description: "El balance financiero ha sido actualizado correctamente." 
      });

      // Reset UI
      setPaymentImage(null);
      setDescription('');
      setAjustAmount('');
      fetchInitialData();
    } catch (error: any) {
      console.error("Action error:", error);
      toast({ 
        variant: "destructive", 
        title: "Error en la operación", 
        description: error.message || "No se pudo completar la transacción." 
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

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="h-10 w-10 animate-spin text-accent mb-4" />
        <p className="font-medium">Cargando consola financiera...</p>
      </div>
    );
  }

  const operators = allWallets.filter(w => w.rol === 'operador');
  const businesses = allWallets.filter(w => w.rol === 'empresa');

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      <header className="h-16 bg-white/5 border-b border-white/10 flex items-center justify-between px-8 shrink-0">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <CircleDollarSign className="text-accent" /> Consola de Liquidación
        </h2>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="border-accent text-accent uppercase font-bold text-[10px]">
            Admin: {adminWallet?.nombre}
          </Badge>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-8 bg-black/10">
        {/* RESUMEN ADMIN */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-accent/10 border-accent/20 border-2">
            <CardHeader className="p-4 pb-1">
              <CardTitle className="text-[10px] uppercase text-accent font-black tracking-widest">Efectivo en Caja</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-3xl font-black text-white">${Number(adminWallet?.efectivo_caja || 0).toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="p-4 pb-1">
              <CardTitle className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">Por Acreditar (Mío)</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-xl font-bold text-white">${Number(adminWallet?.por_acreditar || 0).toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="p-4 pb-1">
              <CardTitle className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">Saldo Retirado</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-xl font-bold text-white">${Number(adminWallet?.saldo_efectivo || 0).toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="p-4 pb-1">
              <CardTitle className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">Balance Digital</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-xl font-bold text-sky-400">${Number(adminWallet?.balance_digital_app || 0).toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* SECCIÓN COBROS (ENTRADAS) */}
          <Card className="bg-white/5 border-white/10 shadow-xl">
            <CardHeader className="border-b border-white/5">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-orange-400">
                <ArrowDownLeft className="w-4 h-4" /> RECAUDACIÓN (ENTRADAS)
              </CardTitle>
              <CardDescription className="text-xs">Cobra el efectivo en manos de terceros</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs">Seleccionar Perfil</Label>
                  <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                    <SelectTrigger className="bg-white/5 border-white/10 h-11">
                      <SelectValue placeholder="Elegir empresa u operador..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10 text-white">
                      <ScrollArea className="h-64">
                        <div className="p-2 space-y-1">
                          <p className="text-[10px] font-bold text-slate-500 uppercase px-2 py-1">Operadores</p>
                          {operators.map(o => (
                            <SelectItem key={o.perfil_id} value={o.perfil_id} className="text-xs">
                              {o.nombre} (${Number(o.cash_acumulado).toFixed(2)})
                            </SelectItem>
                          ))}
                          <p className="text-[10px] font-bold text-slate-500 uppercase px-2 py-1 mt-2">Empresas</p>
                          {businesses.map(b => (
                            <SelectItem key={b.perfil_id} value={b.perfil_id} className="text-xs">
                              {b.nombre} (${Number(b.cash_acumulado).toFixed(2)})
                            </SelectItem>
                          ))}
                        </div>
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                </div>

                {selectedProfile && (
                  <div className="bg-black/40 p-4 rounded-lg border border-white/5 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex justify-between items-center mb-4">
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase font-bold text-slate-500">Cash Acumulado Actual</p>
                        <p className="text-2xl font-black text-orange-400">${Number(selectedProfile.cash_acumulado).toFixed(2)}</p>
                      </div>
                      {selectedProfile.rol === 'empresa' && (
                        <div className="text-right space-y-1">
                          <p className="text-[10px] uppercase font-bold text-slate-500">Tasa Pendiente</p>
                          <p className="text-xl font-bold text-yellow-500">${Number(selectedProfile.tasa_pendiente).toFixed(2)}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      <Input 
                        placeholder="Descripción opcional..." 
                        value={description} 
                        onChange={(e) => setDescription(e.target.value)}
                        className="bg-white/5 border-white/10 h-10 text-xs"
                      />
                      <div className="flex gap-2">
                        <Button 
                          className="flex-1 bg-orange-600 hover:bg-orange-700 font-bold"
                          disabled={processing || Number(selectedProfile.cash_acumulado) <= 0}
                          onClick={() => handleAction(selectedProfile.rol === 'operador' ? 'cobrar_efectivo_operador' : 'cobrar_transferencia_empresa')}
                        >
                          {processing ? <Loader2 className="animate-spin w-4 h-4" /> : null}
                          {selectedProfile.rol === 'operador' ? 'Cobrar Efectivo' : 'Cobrar Transferencias'}
                        </Button>
                        {selectedProfile.rol === 'empresa' && Number(selectedProfile.tasa_pendiente) > 0 && (
                          <Button 
                            className="bg-yellow-600 hover:bg-yellow-700 font-bold"
                            disabled={processing}
                            onClick={() => handleAction('cobrar_tasa')}
                          >
                            Cobrar Tasa
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* SECCIÓN PAGOS (SALIDAS) */}
          <Card className="bg-white/5 border-white/10 shadow-xl">
            <CardHeader className="border-b border-white/5">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-emerald-400">
                <ArrowUpRight className="w-4 h-4" /> PAGOS DE GANANCIA (SALIDAS)
              </CardTitle>
              <CardDescription className="text-xs">Liquida las deudas de la plataforma</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
               <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs">Seleccionar Perfil</Label>
                  <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                    <SelectTrigger className="bg-white/5 border-white/10 h-11">
                      <SelectValue placeholder="Elegir empresa u operador..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10 text-white">
                      <ScrollArea className="h-64">
                        <div className="p-2 space-y-1">
                          <p className="text-[10px] font-bold text-slate-500 uppercase px-2 py-1">Operadores</p>
                          {operators.map(o => (
                            <SelectItem key={o.perfil_id} value={o.perfil_id} className="text-xs">
                              {o.nombre} (${Number(o.por_acreditar).toFixed(2)})
                            </SelectItem>
                          ))}
                          <p className="text-[10px] font-bold text-slate-500 uppercase px-2 py-1 mt-2">Empresas</p>
                          {businesses.map(b => (
                            <SelectItem key={b.perfil_id} value={b.perfil_id} className="text-xs">
                              {b.nombre} (${Number(b.por_acreditar).toFixed(2)})
                            </SelectItem>
                          ))}
                        </div>
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                </div>

                {selectedProfile && (
                  <div className="bg-black/40 p-4 rounded-lg border border-white/5 animate-in fade-in zoom-in-95 duration-200">
                    <div className="space-y-1 mb-4">
                      <p className="text-[10px] uppercase font-bold text-slate-500">Monto por Acreditar Actual</p>
                      <p className="text-2xl font-black text-emerald-400">${Number(selectedProfile.por_acreditar).toFixed(2)}</p>
                    </div>

                    {Number(adminWallet?.efectivo_caja || 0) < Number(selectedProfile.por_acreditar) && (
                      <AlertTriangle className="w-full text-red-500 mb-4 h-10 border border-red-500/20 bg-red-500/5 p-2 rounded text-xs">
                        Efectivo en caja insuficiente (${Number(adminWallet?.efectivo_caja).toFixed(2)})
                      </AlertTriangle>
                    )}
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] text-slate-500 uppercase font-bold">Comprobante de Pago (Obligatorio)</Label>
                        <div className="flex gap-2">
                          {paymentImage ? (
                            <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-white/10 group">
                              <img src={paymentImage} alt="Comprobante" className="w-full h-full object-contain" />
                              <button 
                                onClick={() => setPaymentImage(null)}
                                className="absolute top-2 right-2 bg-red-500 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <Button 
                              variant="outline" 
                              className="w-full h-16 border-dashed border-white/20 bg-white/5 text-slate-400 hover:text-white"
                              onClick={() => fileInputRef.current?.click()}
                            >
                              <Upload className="mr-2 h-5 w-5" /> Subir Comprobante
                            </Button>
                          )}
                          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
                        </div>
                      </div>

                      <Input 
                        placeholder="Descripción opcional..." 
                        value={description} 
                        onChange={(e) => setDescription(e.target.value)}
                        className="bg-white/5 border-white/10 h-10 text-xs"
                      />

                      <Button 
                        className="w-full bg-emerald-600 hover:bg-emerald-700 font-bold h-12"
                        disabled={
                          processing || 
                          !paymentImage || 
                          Number(selectedProfile.por_acreditar) <= 0 ||
                          Number(adminWallet?.efectivo_caja || 0) < Number(selectedProfile.por_acreditar)
                        }
                        onClick={() => handleAction(selectedProfile.rol === 'operador' ? 'pagar_ganancia_operador' : 'pagar_ganancia_empresa')}
                      >
                        {processing ? <Loader2 className="animate-spin w-4 h-4" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
                        Pagar Ganancia
                      </Button>
                    </div>
                  </div>
                )}
               </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* RETIRO ADMIN */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-accent">
                <ArrowUpRight className="w-4 h-4" /> MI RETIRO (ADMIN)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-black/20 p-4 rounded-lg border border-white/5 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase text-slate-500 font-bold">Ganancia Pendiente</p>
                  <p className="text-2xl font-black text-accent">${Number(adminWallet?.por_acreditar || 0).toFixed(2)}</p>
                </div>
                <Button 
                  className="bg-accent text-primary font-bold h-12"
                  disabled={
                    processing || 
                    Number(adminWallet?.por_acreditar || 0) <= 0 ||
                    Number(adminWallet?.efectivo_caja || 0) < Number(adminWallet?.por_acreditar || 0)
                  }
                  onClick={() => handleAction('retirar_ganancia_admin')}
                >
                  Retirar Mi Ganancia
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* AJUSTE MANUAL */}
          <Card className="bg-red-500/5 border-red-500/10">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-red-400">
                <AlertTriangle className="w-4 h-4" /> AJUSTE MANUAL (SALDO PAGADO)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-500 uppercase font-bold">Monto (+ o -)</Label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    placeholder="0.00" 
                    value={adjustAmount}
                    onChange={(e) => setAjustAmount(e.target.value)}
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-500 uppercase font-bold">Motivo (Obligatorio)</Label>
                  <Input 
                    placeholder="Ej: Corrección error..." 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="bg-white/5 border-white/10"
                  />
                </div>
              </div>
              <Button 
                variant="destructive" 
                className="w-full font-bold h-12 bg-red-600/20 text-red-400 border border-red-600/30 hover:bg-red-600 hover:text-white"
                disabled={processing || !adjustAmount || !description || !selectedProfileId}
                onClick={() => setIsAdjustConfirmOpen(true)}
              >
                Aplicar Ajuste Manual
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* LIBRO MAYOR (LEDGER) */}
        <div className="space-y-4 pt-4 border-t border-white/5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="text-lg font-black flex items-center gap-2">
              <History className="h-5 w-5 text-accent" /> LIBRO MAYOR DEL SISTEMA
            </h3>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input 
                  placeholder="Buscar perfil..." 
                  className="pl-9 h-9 w-48 bg-white/5 border-white/10 text-xs" 
                  value={ledgerSearch}
                  onChange={(e) => setLedgerSearch(e.target.value)}
                />
              </div>
              <Select value={ledgerFilter} onValueChange={setLedgerFilter}>
                <SelectTrigger className="w-36 h-9 bg-white/5 border-white/10 text-xs">
                   <Filter className="w-3 h-3 mr-2" /> <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10 text-white">
                   <SelectItem value="todos">Todos</SelectItem>
                   <SelectItem value="paquete">Paquetes</SelectItem>
                   <SelectItem value="cobro">Cobros</SelectItem>
                   <SelectItem value="pago">Pagos</SelectItem>
                   <SelectItem value="ajuste">Ajustes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden backdrop-blur-sm shadow-2xl">
            <Table>
              <TableHeader className="bg-white/10">
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-slate-300 font-bold">Fecha / ID</TableHead>
                  <TableHead className="text-slate-300 font-bold">Perfil</TableHead>
                  <TableHead className="text-slate-300 font-bold">Tipo</TableHead>
                  <TableHead className="text-slate-300 font-bold">Descripción</TableHead>
                  <TableHead className="text-right text-slate-300 font-bold">Monto</TableHead>
                  <TableHead className="text-right text-slate-300 font-bold">Evidencia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements
                  .filter(m => {
                    const matchType = ledgerFilter === 'todos' || m.tipo === ledgerFilter;
                    const matchSearch = m.nombre_perfil?.toLowerCase().includes(ledgerSearch.toLowerCase()) || 
                                       m.descripcion.toLowerCase().includes(ledgerSearch.toLowerCase());
                    return matchType && matchSearch;
                  })
                  .map((mov) => (
                  <TableRow key={mov.id} className="border-white/10 hover:bg-white/5 transition-colors">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs text-white" suppressHydrationWarning>{new Date(mov.created_at).toLocaleString()}</span>
                        <span className="text-[10px] font-mono text-slate-500">{mov.id.substring(0,12)}...</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-bold text-xs text-slate-200">{(mov as any).nombre_perfil}</span>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn(
                        "text-[9px] uppercase font-bold",
                        mov.tipo === 'paquete' ? "bg-blue-500/20 text-blue-400" :
                        mov.tipo === 'cobro' ? "bg-orange-500/20 text-orange-400" :
                        mov.tipo === 'pago' ? "bg-green-500/20 text-green-400" :
                        "bg-purple-500/20 text-purple-400"
                      )}>
                        {mov.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[250px] truncate text-xs text-slate-400">
                      {mov.descripcion}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={cn(
                        "font-mono font-black text-sm",
                        Number(mov.monto) > 0 ? "text-emerald-400" : "text-red-400"
                      )}>
                        {Number(mov.monto) > 0 ? '+' : ''}{Number(mov.monto).toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {mov.comprobante_url && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-accent hover:bg-accent/10" 
                          asChild
                        >
                          <a href={mov.comprobante_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>

      {/* CONFIRMACIÓN DE AJUSTE MANUAL */}
      <Dialog open={isAdjustConfirmOpen} onOpenChange={setIsAdjustConfirmOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-500 flex items-center gap-2">
               <AlertTriangle /> Confirmar Ajuste Manual
            </DialogTitle>
            <DialogDescription className="text-slate-400 pt-2">
              Esta acción modificará directamente el **Saldo Pagado (Saldo Efectivo)** del perfil seleccionado sin pasar por caja ni afectar deudas. 
              <br/><br/>
              Perfil: <span className="text-white font-bold">{selectedProfile?.nombre}</span>
              <br/>
              Monto: <span className={cn("font-bold", Number(adjustAmount) > 0 ? "text-emerald-400" : "text-red-400")}>
                ${Number(adjustAmount).toFixed(2)}
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:gap-2">
            <Button variant="ghost" onClick={() => setIsAdjustConfirmOpen(false)} className="flex-1 text-slate-400">Cancelar</Button>
            <Button 
              variant="destructive" 
              className="flex-1 font-bold"
              onClick={() => {
                setIsAdjustConfirmOpen(false);
                handleAction(Number(adjustAmount) > 0 ? 'agregar_saldo' : 'restar_saldo', { monto: Math.abs(Number(adjustAmount)) });
              }}
            >
              Aplicar Ajuste Definitivo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function SettlementPage() {
  return (
    <Suspense 
      fallback={
        <div className="flex-1 flex items-center justify-center bg-background text-white">
          <Loader2 className="h-10 w-10 animate-spin text-accent" />
        </div>
      }
    >
      <SettlementContent />
    </Suspense>
  );
}

